import { randomBytes, randomUUID } from "node:crypto";
import {
  ARENA,
  CLASH,
  COMBAT,
  COVERS,
  DUEL,
  INPUT,
  LANE_IDS,
  LANES,
  MATCH,
  MINION,
  NEXUS,
  SCORE,
  SPAWNS,
  SURFACE,
  TEAM,
  TEAM_SIZE,
  TOWERS,
} from "../shared/constants.js";
import { HEROES, getHero } from "../shared/heroes.js";
import { minionVariant } from "../shared/minions.js";
import { questionsForLevel } from "../shared/questions.js";
import {
  circleCircle,
  circleRect,
  clamp,
  kineticEnergy,
  normalize,
  reflectVelocity,
  resolveCircleCircle,
  resolveCircleRect,
} from "../shared/physics.js";
import { computeBotIntent, planBotQuiz } from "./bot.js";

const OPEN = 1;
const LEVEL_NAMES = ["pemula", "menengah", "mahir"];
const BOT_NAMES = ["Raden", "Sekar", "Wira", "Kirana", "Bayu", "Laras", "Jaka", "Dewi"];
const LANE_LABELS = { top: "Selat Malaka", mid: "Jalan Raya Pos", bot: "Jalur Sutra" };
const GOOD_LUCK = [
  "Momentum terjaga. Terus tekan!",
  "Hitunganmu tepat. Manfaatkan Physics Edge.",
  "Super terisi penuh. Saatnya menyerang!",
];

function xpNeeded(level) {
  return 90 + (level - 1) * 70;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export class Room {
  constructor(code, mode = "online", hooks = {}) {
    this.code = code;
    this.mode = mode;
    this.hooks = hooks;
    this.players = new Map();
    this.teams = Array.from({ length: 2 }, () => Array(TEAM_SIZE).fill(null));
    this.status = "lobby";
    this.hostId = null;
    this.level = 1;
    this.countdownAt = null;
    this.selectEndsAt = null;
    this.createdAt = Date.now();
    this.match = null;
    this.clash = null;
    this.duels = new Map();
    this.duelSeq = 0;
    this.duelPairUntil = new Map();
    this.covers = [];
    this.towers = [];
    this.nexuses = [];
    this.projectiles = [];
    this.minions = [];
    this.effects = [];
    this.feed = [];
    this.usedQuestionIds = new Set();
    this.effectSeq = 0;
    this.minionSeq = 0;
    this.projectileSeq = 0;
    this.lastSnapshotAt = 0;
    this.lastHumanSeenAt = Date.now();
  }

  get isPractice() {
    return this.mode === "practice";
  }

  get humans() {
    return [...this.players.values()].filter((player) => !player.bot);
  }

  get connectedHumans() {
    return this.humans.filter((player) => player.connected);
  }

  get full() {
    return this.players.size >= TEAM_SIZE * 2;
  }

  getLevel() {
    const humans = this.humans.length > 0 ? this.humans : [...this.players.values()];
    if (humans.length === 0) return 1;
    const total = humans.reduce((sum, player) => sum + player.skillLevel, 0);
    return clamp(Math.floor(total / humans.length), 1, 3);
  }

  send(player, payload) {
    if (!player?.socket || player.socket.readyState !== OPEN) return;
    player.socket.send(JSON.stringify(payload));
  }

  broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const player of this.players.values()) {
      if (!player.bot && player.socket?.readyState === OPEN) {
        player.socket.send(data);
      }
    }
  }

  sendWelcome(player, extra = {}) {
    this.send(player, {
      type: "welcome",
      playerId: player.id,
      roomCode: this.code,
      mode: this.mode,
      slot: player.slot,
      seat: player.seat,
      index: player.index,
      token: player.token,
      serverTime: Date.now(),
      ...extra,
    });
  }

  addHuman({ name, heroId, skillLevel, socket, token = null }) {
    if (this.status !== "lobby" || this.full) {
      return { error: "Room sudah penuh atau pertandingan sedang berjalan." };
    }
    const seat = this.pickSeat();
    if (!seat) return { error: "Room sudah penuh atau pertandingan sedang berjalan." };
    const player = this.createPlayer({
      name,
      heroId,
      skillLevel,
      slot: seat.team,
      seat: seat.seat,
      socket,
      token,
      bot: false,
    });
    this.players.set(player.id, player);
    this.teams[seat.team][seat.seat] = player.id;
    if (!this.hostId) this.hostId = player.id;
    this.lastHumanSeenAt = Date.now();
    this.sendWelcome(player);
    this.broadcastLobby();
    return { player };
  }

  /** Tim dengan anggota lebih sedikit dulu; seri jatuh ke tim 0. */
  pickSeat(preferTeam = null) {
    const counts = this.teams.map((team) => team.filter(Boolean).length);
    const order =
      preferTeam === null ? [0, 1].sort((a, b) => counts[a] - counts[b] || a - b) : [preferTeam, 1 - preferTeam];
    for (const team of order) {
      const seat = this.teams[team].indexOf(null);
      if (seat !== -1) return { team, seat };
    }
    return null;
  }


  addBot({ slot = 1, name = null, heroId = null, skillLevel = 2 } = {}) {
    if (this.status !== "lobby" || this.full) return null;
    return this.seatBot({ team: slot, name, heroId, skillLevel });
  }

  seatBot({ team, name = null, heroId = null, skillLevel = 2 }) {
    const seat = this.pickSeat(team);
    if (!seat) return null;
    const taken = new Set(
      [...this.players.values()].filter((player) => player.slot === seat.team).map((player) => player.heroId),
    );
    const heroPool = Object.keys(HEROES).filter((id) => !taken.has(id));
    const chosen = heroId ?? heroPool[Math.floor(Math.random() * heroPool.length)] ?? "bastion";
    const player = this.createPlayer({
      name: name ?? `${BOT_NAMES[(seat.team * TEAM_SIZE + seat.seat) % BOT_NAMES.length]} AI`,
      heroId: chosen,
      skillLevel,
      slot: seat.team,
      seat: seat.seat,
      socket: null,
      token: null,
      bot: true,
      ready: true,
    });
    this.players.set(player.id, player);
    this.teams[seat.team][seat.seat] = player.id;
    return player;
  }

  /** Isi seat kosong dengan bot sampai 3 lawan 3. */
  fillBots() {
    const level = this.getLevel();
    for (const team of [0, 1]) {
      while (this.teams[team].includes(null)) {
        if (!this.seatBot({ team, skillLevel: level })) break;
      }
    }
  }


  createPlayer({ name, heroId, skillLevel, slot, seat = 0, socket, token, bot, ready = false }) {
    const spawn = SPAWNS[slot][seat];
    return {
      id: randomUUID(),
      seat,
      index: slot * TEAM_SIZE + seat,
      token: token ?? randomBytes(24).toString("base64url"),
      name,
      heroId,
      skillLevel,
      slot,
      socket,
      connected: true,
      bot,
      ready: bot ? true : ready,
      disconnectAt: null,
      inputMask: 0,
      prevMask: 0,
      aimX: slot === 0 ? ARENA.width - 260 : 260,
      aimY: ARENA.height / 2,
      guardFactor: 1,
      locked: bot,
      lastPingAt: 0,
      pingX: 0,
      pingY: 0,
      pingUntil: 0,
      stats: { kills: 0, deaths: 0, cs: 0, clashWins: 0, correct: 0, wrong: 0 },
      level: 1,
      xp: 0,
      nextXp: xpNeeded(1),
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      radius: getHero(heroId).radius,
      mass: getHero(heroId).mass,
      maxHp: getHero(heroId).maxHp,
      hp: getHero(heroId).maxHp,
      shield: 0,
      shieldUntil: 0,
      alive: true,
      respawnAt: 0,
      invulnUntil: 0,
      attackCd: 0,
      dashCd: 0,
      shockCd: 0,
      dashTime: 0,
      impactCd: 0,
      ammo: COMBAT.maxAmmo,
      reload: 0,
      super: 0,
      insight: 0,
      edgeUntil: 0,
      slowUntil: 0,
      duelImmuneUntil: 0,
      duelEdgeUntil: 0,
      duelSlowUntil: 0,
      duelSlowFactor: 1,
      reflectUntil: 0,
      guardUntil: 0,
      taliUntil: 0,
      taliReadyAt: 0,
      botQuizPlan: null,
      lastHit: null,
    };
  }

  setReady(playerId, value, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player || player.bot || this.status !== "lobby") return;
    player.ready = Boolean(value);
    if (this.status === "countdown" && !player.ready) {
      this.status = "lobby";
      this.countdownAt = null;
    }
    this.maybeStartCountdown(now);
    this.broadcastLobby();
  }

  /** Semua manusia siap: isi bot lalu buka fase pilih hero (champion select). */
  maybeStartCountdown(now = Date.now()) {
    if (this.status !== "lobby") return;
    const humans = this.humans;
    if (humans.length === 0) return;
    if (!this.isPractice && humans.length < 2) return;
    if (humans.some((player) => !player.ready)) return;
    this.fillBots();
    this.level = this.getLevel();
    for (const player of this.players.values()) player.locked = player.bot;
    this.dedupeBotHeroes();
    this.status = "select";
    this.selectEndsAt = now + MATCH.select * 1000;
    this.countdownAt = null;
    this.broadcastLobby();
    this.broadcast({ type: "toast", text: "Pilih hero kalian! Kunci sebelum waktu habis.", tone: "good" });
  }

  /** Hero yang dikunci manusia di tim yang sama, kecuali pemain ini. */
  heroTakenByTeammate(player, heroId) {
    return [...this.players.values()].some(
      (other) => other.id !== player.id && other.slot === player.slot && !other.bot && other.locked && other.heroId === heroId,
    );
  }

  /** Bot tidak boleh kembar hero dengan rekan satu tim; bot yang kalah dialihkan. */
  dedupeBotHeroes() {
    for (const team of [0, 1]) {
      const members = [...this.players.values()].filter((player) => player.slot === team);
      const used = new Set(members.filter((player) => !player.bot).map((player) => player.heroId));
      for (const bot of members.filter((player) => player.bot)) {
        if (used.has(bot.heroId)) {
          const free = Object.keys(HEROES).filter((id) => !used.has(id) && !members.some((m) => m.bot && m.heroId === id));
          bot.heroId = free[Math.floor(Math.random() * free.length)] ?? bot.heroId;
        }
        used.add(bot.heroId);
      }
    }
  }

  pickHero(playerId, heroId, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player || player.bot || this.status !== "select" || player.locked) return { error: "Tidak bisa memilih sekarang." };
    if (typeof heroId !== "string" || !HEROES[heroId]) return { error: "Hero tidak valid." };
    if (this.heroTakenByTeammate(player, heroId)) return { error: "Hero itu sudah dikunci rekan satu tim." };
    player.heroId = heroId;
    this.dedupeBotHeroes();
    this.broadcastLobby();
    return { ok: true };
  }

  lockHero(playerId, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player || player.bot || this.status !== "select" || player.locked) return { error: "Tidak bisa mengunci sekarang." };
    if (this.heroTakenByTeammate(player, player.heroId)) return { error: "Hero itu sudah dikunci rekan satu tim." };
    player.locked = true;
    this.dedupeBotHeroes();
    this.broadcastLobby();
    this.checkSelectDone(now);
    return { ok: true };
  }

  checkSelectDone(now) {
    if (this.status !== "select") return;
    if (this.humans.every((player) => player.locked)) this.beginCountdown(now);
  }

  /** Waktu pilih habis: kunci otomatis; bila hero bentrok, ambil hero bebas pertama. */
  autoLockHumans() {
    for (const player of this.humans.filter((candidate) => !candidate.locked)) {
      if (this.heroTakenByTeammate(player, player.heroId)) {
        const free = Object.keys(HEROES).find((id) => !this.heroTakenByTeammate(player, id));
        if (free) player.heroId = free;
      }
      player.locked = true;
    }
    this.dedupeBotHeroes();
  }

  /** Layar loading: lineup kedua tim terbuka selama hitung mundur. */
  beginCountdown(now = Date.now()) {
    if (this.status !== "select") return;
    this.status = "countdown";
    this.selectEndsAt = null;
    this.countdownAt = now + MATCH.countdown * 1000;
    this.broadcastLobby();
  }



  broadcastLobby() {
    const base = {
      type: "lobby",
      roomCode: this.code,
      mode: this.mode,
      status: this.status,
      hostId: this.hostId,
      level: this.level,
      levelName: LEVEL_NAMES[this.level - 1],
      countdownAt: this.countdownAt,
      selectEndsAt: this.selectEndsAt,
      serverTime: Date.now(),
    };
    const roster = [...this.players.values()].sort((a, b) => a.index - b.index);
    for (const viewer of this.players.values()) {
      if (viewer.bot) continue;
      const blind = this.status === "select";
      this.send(viewer, {
        ...base,
        you: viewer.id,
        players: roster.map((player) => ({
          id: player.id,
          name: player.name,
          // pick buta: hero lawan baru terlihat saat loading
          heroId: blind && player.slot !== viewer.slot ? null : player.heroId,
          skillLevel: player.skillLevel,
          slot: player.slot,
          seat: player.seat,
          index: player.index,
          ready: player.ready,
          locked: player.locked,
          connected: player.connected,
          bot: player.bot,
        })),
      });
    }
  }

  startMatch(now = Date.now()) {
    if (this.status === "playing" || this.status === "ended") return;
    this.fillBots();
    this.status = "playing";
    this.countdownAt = null;
    this.clash = null;
    this.duels.clear();
    this.duelPairUntil.clear();
    this.usedQuestionIds.clear();
    this.projectiles = [];
    this.minions = [];
    this.effects = [];
    this.feed = [];
    this.effectSeq = 0;
    this.minionSeq = 0;
    this.projectileSeq = 0;
    this.lastSnapshotAt = 0;
    this.level = this.getLevel();
    this.match = {
      startedAt: now,
      lastTick: now,
      elapsed: 0,
      nextSnapshotAt: now,
      waveAt: now + MATCH.firstWaveAt * 1000,
      nextClashAt: now + CLASH.firstAt * 1000,
      clashCount: 0,
      endedAt: null,
    };
    this.lastTickAt = now;

    this.covers = COVERS.map((cover, index) => ({
      ...cover,
      id: `cover-${index}`,
      maxHp: cover.hp,
      alive: true,
    }));
    this.towers = TOWERS.map((tower, index) => ({
      ...tower,
      id: `tower-${index}`,
      maxHp: tower.hp,
      hp: tower.hp,
      alive: true,
      attackCd: 0.5,
    }));
    this.nexuses = NEXUS.map((nexus, index) => ({
      ...nexus,
      id: `nexus-${index}`,
      team: index,
      maxHp: nexus.hp,
      hp: nexus.hp,
      alive: true,
    }));

    for (const player of this.players.values()) {
      this.resetPlayerForMatch(player, now);
    }

    this.addFeed("Pertandingan 3v3 dimulai. Hancurkan menara satu lane, lalu Nexus lawan!", null, now);
    this.broadcast({
      type: "matchStart",
      roomCode: this.code,
      level: this.level,
      levelName: LEVEL_NAMES[this.level - 1],
      duration: MATCH.duration,
      serverTime: now,
    });
    this.broadcastState(now);
  }

  resetPlayerForMatch(player, now) {
    const hero = getHero(player.heroId);
    const spawn = SPAWNS[player.slot][player.seat];
    player.stats = { kills: 0, deaths: 0, cs: 0, clashWins: 0, correct: 0, wrong: 0 };
    player.level = 1;
    player.xp = 0;
    player.nextXp = xpNeeded(1);
    player.radius = hero.radius;
    player.mass = hero.mass;
    player.maxHp = hero.maxHp;
    player.hp = hero.maxHp;
    player.shield = 0;
    player.shieldUntil = 0;
    player.alive = true;
    player.respawnAt = 0;
    player.invulnUntil = now + 1200;
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.aimX = player.slot === 0 ? ARENA.width - 400 : 400;
    player.aimY = ARENA.height / 2;
    player.inputMask = 0;
    player.prevMask = 0;
    player.attackCd = 0;
    player.dashCd = 0;
    player.shockCd = 0;
    player.dashTime = 0;
    player.impactCd = 0;
    player.ammo = COMBAT.maxAmmo;
    player.reload = 0;
    player.super = 0;
    player.insight = 0;
    player.edgeUntil = 0;
    player.slowUntil = 0;
    player.duelImmuneUntil = 0;
    player.duelEdgeUntil = 0;
    player.duelSlowUntil = 0;
    player.duelSlowFactor = 1;
    player.lastHit = null;
    player.reflectUntil = 0;
    player.guardUntil = 0;
    player.guardFactor = 1;
    player.taliUntil = 0;
    player.taliReadyAt = 0;
    player.botQuizPlan = null;
  }

  setInput(playerId, message) {
    const player = this.players.get(playerId);
    if (!player || this.status !== "playing") return;
    const mask = Number.isInteger(message.mask) ? message.mask & 255 : 0;
    const aimX = Number(message.aimX);
    const aimY = Number(message.aimY);
    player.inputMask = mask;
    if (Number.isFinite(aimX) && Number.isFinite(aimY)) {
      player.aimX = clamp(aimX, 0, ARENA.width);
      player.aimY = clamp(aimY, 0, ARENA.height);
    }
  }

  tick(now = Date.now()) {
    if (this.status === "select") {
      if (now >= this.selectEndsAt) {
        this.autoLockHumans();
        this.beginCountdown(now);
      } else {
        this.checkSelectDone(now);
      }
      return;
    }
    if (this.status === "countdown") {
      if (now >= this.countdownAt) this.startMatch(now);
      return;
    }
    if (this.status !== "playing" || !this.match) return;

    this.match.lastTick = now;
    this.match.elapsed = Math.max(0, (now - this.match.startedAt) / 1000);

    if (this.match.elapsed >= MATCH.duration) {
      this.finishByTime(now);
      return;
    }

    if (!this.clash && this.duels.size === 0 && this.match.nextClashAt && now >= this.match.nextClashAt) {
      this.startClash(now);
    }

    if (this.clash?.phase === "active" && now >= this.clash.endsAt) {
      this.resolveClash(now, null, "timeout");
    }

    const slow =
      this.clash && (this.clash.phase === "active" || now < this.clash.slowUntil)
        ? CLASH.slowFactor
        : 1;
    const realDt = clamp((now - (this.lastTickAt ?? now)) / 1000, 0, 0.05);
    this.lastTickAt = now;
    const dt = realDt * slow;

    if (this.clash?.phase === "resolved" && now >= this.clash.slowUntil) {
      this.clash = null;
      this.match.nextClashAt = now + CLASH.interval * 1000;
    }

    this.updateBotIntents(now);

    for (const player of this.players.values()) {
      this.updatePlayer(player, dt, now);
    }

    this.resolvePlayerCollisions(now);
    this.updateProjectiles(dt, now);
    this.updateMinions(dt, now);
    this.updateTowers(dt, now);
    this.updateBotQuiz(now);
    this.updateDuels(now);
    this.clearExpiredEffects(now);

    if (this.status !== "playing") {
      this.broadcastState(now);
      return;
    }

    if (this.connectedHumans.length > 0) this.lastHumanSeenAt = now;

    if (now >= this.match.nextSnapshotAt) {
      this.match.nextSnapshotAt = now + 1000 / MATCH.snapshotRate;
      this.broadcastState(now);
    }
  }

  updateBotIntents(now) {
    for (const player of this.players.values()) {
      if (!player.bot || !player.alive) continue;
      const intent = computeBotIntent(this, player, now);
      player.inputMask = intent.mask;
      player.aimX = intent.aimX;
      player.aimY = intent.aimY;
    }
  }

  updatePlayer(player, dt, now) {
    if (this.status !== "playing") return;
    if (!player.alive) {
      if (now >= player.respawnAt) this.respawnPlayer(player, now);
      return;
    }

    if (player.shield > 0 && now >= player.shieldUntil) {
      player.shield = 0;
      player.shieldUntil = 0;
    }

    const hero = getHero(player.heroId);
    const aim = normalize(player.aimX - player.x, player.aimY - player.y);
    const aimX = aim.length > 0.01 ? aim.x : player.slot === 0 ? 1 : -1;
    const aimY = aim.length > 0.01 ? aim.y : 0;

    let moveX = 0;
    let moveY = 0;
    if (player.inputMask & INPUT.UP) moveY -= 1;
    if (player.inputMask & INPUT.DOWN) moveY += 1;
    if (player.inputMask & INPUT.LEFT) moveX -= 1;
    if (player.inputMask & INPUT.RIGHT) moveX += 1;
    const move = normalize(moveX, moveY);

    const slowFactor = Math.min(
      now < player.slowUntil ? CLASH.lossSpeed : 1,
      now < player.duelSlowUntil ? player.duelSlowFactor : 1,
    );
    const maxSpeed = hero.speed * (1 + (player.level - 1) * 0.012) * slowFactor;

    if (player.dashTime > 0) {
      player.dashTime = Math.max(0, player.dashTime - dt);
    } else if (move.length > 0.01) {
      const acceleration = maxSpeed * 9;
      player.vx += move.x * acceleration * dt;
      player.vy += move.y * acceleration * dt;
    } else {
      const damping = Math.exp(-SURFACE.friction * dt);
      player.vx *= damping;
      player.vy *= damping;
    }

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > maxSpeed && player.dashTime <= 0) {
      const scale = maxSpeed / speed;
      player.vx *= scale;
      player.vy *= scale;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.attackCd = Math.max(0, player.attackCd - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.shockCd = Math.max(0, player.shockCd - dt);
    player.impactCd = Math.max(0, player.impactCd - dt);

    if (player.ammo < COMBAT.maxAmmo) {
      player.reload += dt;
      if (player.reload >= COMBAT.reloadTime) {
        player.reload = 0;
        player.ammo += 1;
      }
    } else {
      player.reload = 0;
    }

    this.resolveBounds(player);

    for (const cover of this.covers) {
      if (!cover.alive) continue;
      const collision = resolveCircleRect(player, cover, SURFACE.coverRestitution);
      if (!collision) continue;
      if (player.dashTime > 0 && player.impactCd <= 0 && collision.impactSpeed > 240) {
        this.damageCover(cover, 18 + collision.impactSpeed * 0.08, player, now);
        player.dashTime = 0;
        player.impactCd = 0.22;
        this.addEffect("impact", player.x, player.y, now, {
          radius: 54,
          team: player.slot,
          duration: 300,
          color: hero.color,
        });
      }
    }

    this.resolveStructureCollisions(player);

    const ownNexus = this.nexuses.find((nexus) => nexus.team === player.slot);
    if (ownNexus && player.hp < player.maxHp) {
      const distance = Math.hypot(player.x - ownNexus.x, player.y - ownNexus.y);
      if (distance < SURFACE.baseHealRadius) {
        player.hp = Math.min(player.maxHp, player.hp + 10 * dt);
      }
    }

    const pressed = player.inputMask & ~player.prevMask;
    if (player.inputMask & INPUT.ATTACK) this.tryBasicAttack(player, aimX, aimY, now);
    if (pressed & INPUT.DASH) this.tryDash(player, aimX, aimY, now);
    if (pressed & INPUT.SHOCK) this.tryShock(player, now);
    if (pressed & INPUT.ULTIMATE) this.tryUltimate(player, aimX, aimY, now);
    player.prevMask = player.inputMask;
  }

  resolveBounds(body) {
    const minX = ARENA.inset + body.radius;
    const maxX = ARENA.width - ARENA.inset - body.radius;
    const minY = ARENA.inset + body.radius;
    const maxY = ARENA.height - ARENA.inset - body.radius;
    if (body.x < minX) {
      body.x = minX;
      body.vx = Math.abs(body.vx) * SURFACE.heroRestitution;
    } else if (body.x > maxX) {
      body.x = maxX;
      body.vx = -Math.abs(body.vx) * SURFACE.heroRestitution;
    }
    if (body.y < minY) {
      body.y = minY;
      body.vy = Math.abs(body.vy) * SURFACE.heroRestitution;
    } else if (body.y > maxY) {
      body.y = maxY;
      body.vy = -Math.abs(body.vy) * SURFACE.heroRestitution;
    }
  }

  resolveStructureCollisions(player) {
    const structures = [
      ...this.towers.filter((tower) => tower.alive),
      ...this.nexuses.filter((nexus) => nexus.alive),
    ];
    for (const structure of structures) {
      const collision = circleCircle(player, structure);
      if (!collision) continue;
      player.x -= collision.nx * collision.penetration;
      player.y -= collision.ny * collision.penetration;
      const normalSpeed = player.vx * collision.nx + player.vy * collision.ny;
      if (normalSpeed > 0) {
        player.vx -= normalSpeed * collision.nx;
        player.vy -= normalSpeed * collision.ny;
      }
    }
  }

  tryBasicAttack(player, aimX, aimY, now) {
    if (player.attackCd > 0 || player.ammo <= 0) return;
    // selama duel jawabnya berjalan, penyerang menunggu hasilnya
    if (this.duelAsAttacker(player.id)) return;
    const hero = getHero(player.heroId);
    const victim = this.findDuelTarget(player, aimX, aimY, now);
    player.ammo -= 1;
    player.attackCd = hero.attackInterval;
    if (victim) {
      this.openDuel(player, victim, aimX, aimY, now);
      return;
    }
    this.fireBasicShot(player, aimX, aimY, now);
  }

  fireBasicShot(player, aimX, aimY, now) {
    const hero = getHero(player.heroId);
    const edge = now < player.edgeUntil;
    const duelEdge = now < player.duelEdgeUntil ? DUEL.edgeDamage : 1;
    const damage =
      (hero.damage + (player.level - 1) * 1.5) * (edge ? CLASH.edgeDamage : 1) * duelEdge;
    const knockback = hero.knockback * (edge ? CLASH.edgeKnockback : 1);
    const startX = player.x + aimX * (player.radius + 8);
    const startY = player.y + aimY * (player.radius + 8);
    this.spawnProjectile({
      team: player.slot,
      ownerId: player.id,
      type: "shot",
      x: startX,
      y: startY,
      vx: aimX * hero.projectileSpeed,
      vy: aimY * hero.projectileSpeed,
      radius: 7,
      mass: hero.projectileMass,
      damage,
      knockback,
      ttl: 1.35,
      bounces: 1,
      reflectable: true,
      now,
    });
    this.addEffect("muzzle", startX, startY, now, {
      radius: 26,
      team: player.slot,
      duration: 180,
      color: hero.color,
    });
  }

  spawnProjectile(config) {
    if (this.projectiles.length >= MATCH.maxProjectiles) this.projectiles.shift();
    this.projectileSeq += 1;
    this.projectiles.push({
      id: this.projectileSeq,
      ...config,
      createdAt: config.now,
    });
  }

  tryDash(player, aimX, aimY, now) {
    if (player.dashCd > 0) return;
    const hero = getHero(player.heroId);
    player.dashCd = hero.dashCooldown;
    player.dashTime = 0.16;
    player.vx = aimX * hero.dashSpeed;
    player.vy = aimY * hero.dashSpeed;
    this.addEffect("dash", player.x, player.y, now, {
      radius: 62,
      team: player.slot,
      duration: 360,
      color: hero.color,
    });
  }

  tryShock(player, now) {
    if (player.shockCd > 0) return;
    const hero = getHero(player.heroId);
    player.shockCd = hero.shockCooldown;
    const edge = now < player.edgeUntil;
    this.radialBurst({
      owner: player,
      x: player.x,
      y: player.y,
      radius: 175,
      damage: 18,
      force: 600 * (edge ? CLASH.edgeKnockback : 1),
      now,
      kind: "shock",
    });
  }

  tryUltimate(player, aimX, aimY, now) {
    if (player.super < COMBAT.superMax) return;
    const hero = getHero(player.heroId);
    const empowered = player.insight > 0;
    if (empowered) player.insight -= 1;
    player.super = 0;
    const ult = hero.ultimate;
    const edge = now < player.edgeUntil;
    const damageScale = edge ? CLASH.edgeDamage : 1;
    const forceScale = edge ? CLASH.edgeKnockback : 1;

    this.addEffect("super", player.x, player.y, now, {
      radius: 110,
      team: player.slot,
      duration: 480,
      color: hero.color,
    });

    switch (ult.type) {
      case "aegis": {
        const shield = empowered ? ult.empoweredShield : ult.baseShield;
        const duration = empowered ? ult.empoweredDuration : ult.baseDuration;
        player.shield = Math.min(COMBAT.maxShield, player.shield + shield);
        player.shieldUntil = Math.max(player.shieldUntil, now + duration * 1000);
        player.reflectUntil = player.shieldUntil;
        player.guardUntil = now + duration * 1000;
        player.guardFactor = 1 - (empowered ? ult.empoweredReduction : ult.baseReduction);
        this.addEffect("shield", player.x, player.y, now, {
          radius: player.radius + 30,
          team: player.slot,
          duration: duration * 1000,
          color: hero.color,
        });
        break;
      }
      case "seismic": {
        this.radialBurst({
          owner: player,
          x: player.x,
          y: player.y,
          radius: empowered ? ult.empoweredRadius : ult.baseRadius,
          damage: (empowered ? ult.empoweredDamage : ult.baseDamage) * damageScale,
          force: (empowered ? ult.empoweredForce : ult.baseForce) * forceScale,
          now,
          kind: "explosion",
        });
        break;
      }
      case "blink": {
        const range = empowered ? ult.empoweredRange : ult.baseRange;
        const destination = this.findBlinkDestination(
          player,
          player.x + aimX * range,
          player.y + aimY * range,
        );
        player.x = destination.x;
        player.y = destination.y;
        player.vx = 0;
        player.vy = 0;
        player.dashCd = 0;
        this.radialBurst({
          owner: player,
          x: player.x,
          y: player.y,
          radius: empowered ? ult.empoweredRadius : ult.baseRadius,
          damage: (empowered ? ult.empoweredDamage : ult.baseDamage) * damageScale,
          force: 320 * forceScale,
          now,
          kind: "explosion",
        });
        this.addEffect("blink", player.x, player.y, now, {
          radius: 80,
          team: player.slot,
          duration: 320,
          color: hero.color,
        });
        break;
      }
      case "nova": {
        this.spawnProjectile({
          team: player.slot,
          ownerId: player.id,
          type: "nova",
          x: player.x + aimX * (player.radius + 12),
          y: player.y + aimY * (player.radius + 12),
          vx: aimX * ult.projectileSpeed,
          vy: aimY * ult.projectileSpeed,
          radius: 15,
          mass: 0.45,
          damage: (empowered ? ult.empoweredDamage : ult.baseDamage) * damageScale,
          knockback: 0,
          ttl: 1.6,
          bounces: 0,
          reflectable: true,
          explodeRadius: empowered ? ult.empoweredRadius : ult.baseRadius,
          explodeForce: (empowered ? ult.empoweredForce : ult.baseForce) * forceScale,
          now,
        });
        break;
      }
      case "barrage": {
        const shots = empowered ? ult.empoweredShots : ult.baseShots;
        const baseAngle = Math.atan2(aimY, aimX);
        for (let index = 0; index < shots; index += 1) {
          const offset = (index - (shots - 1) / 2) * (ult.spread / shots);
          const angle = baseAngle + offset;
          this.spawnProjectile({
            team: player.slot,
            ownerId: player.id,
            type: "super",
            x: player.x + Math.cos(angle) * (player.radius + 8),
            y: player.y + Math.sin(angle) * (player.radius + 8),
            vx: Math.cos(angle) * ult.speed,
            vy: Math.sin(angle) * ult.speed,
            radius: 6,
            mass: ult.projectileMass,
            damage: (empowered ? ult.empoweredDamage : ult.baseDamage) * damageScale,
            knockback: ult.knockback * forceScale,
            ttl: 1.25,
            bounces: 1,
            reflectable: true,
            now,
          });
        }
        break;
      }
      case "sustain": {
        const heal = empowered ? ult.empoweredHeal : ult.baseHeal;
        const shield = empowered ? ult.empoweredShield : ult.baseShield;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.shield = Math.min(COMBAT.maxShield, player.shield + shield);
        player.shieldUntil = Math.max(
          player.shieldUntil,
          now + (empowered ? ult.empoweredDuration : ult.baseDuration) * 1000,
        );
        this.addEffect("heal", player.x, player.y, now, {
          radius: 90,
          team: player.slot,
          duration: 600,
          color: hero.color,
        });
        break;
      }
      default:
        break;
    }

    this.addFeed(
      `${player.name} melepas ${empowered ? "SUPER EMPOWERED" : "Super"}: ${ult.name}!`,
      player.slot,
      now,
    );
  }

  findBlinkDestination(player, targetX, targetY) {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const steps = 18;
    let safeX = player.x;
    let safeY = player.y;
    for (let step = 1; step <= steps; step += 1) {
      const x = player.x + (dx * step) / steps;
      const y = player.y + (dy * step) / steps;
      const insideArena =
        x > ARENA.inset + player.radius &&
        x < ARENA.width - ARENA.inset - player.radius &&
        y > ARENA.inset + player.radius &&
        y < ARENA.height - ARENA.inset - player.radius;
      if (!insideArena) break;
      let blocked = false;
      for (const cover of this.covers) {
        if (cover.alive && circleRect(x, y, player.radius, cover)) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
      for (const structure of [...this.towers, ...this.nexuses]) {
        if (structure.alive && Math.hypot(x - structure.x, y - structure.y) < structure.radius + player.radius) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
      safeX = x;
      safeY = y;
    }
    return { x: safeX, y: safeY };
  }

  resolvePlayerCollisions(now) {
    const players = [...this.players.values()].filter((player) => player.alive);
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        const a = players[i];
        const b = players[j];
        const collision = resolveCircleCircle(a, b, 0.45);
        if (!collision || collision.impactSpeed < 300) continue;
        const attacker = a.dashTime > 0 ? a : b.dashTime > 0 ? b : null;
        if (!attacker) continue;
        const target = attacker === a ? b : a;
        if (target.slot === attacker.slot) continue;
        const damage = 18 + collision.impactSpeed * 0.025;
        this.applyPlayerDamage(target, damage, attacker, now);
        this.addEffect("impact", (a.x + b.x) / 2, (a.y + b.y) / 2, now, {
          radius: 46,
          team: attacker.slot,
          duration: 300,
          color: getHero(attacker.heroId).color,
        });
        attacker.dashTime = 0;
      }
    }
  }


  updateProjectiles(dt, now) {
    const survivors = [];

    for (const projectile of this.projectiles) {
      projectile.ttl -= dt;
      if (projectile.ttl <= 0) continue;

      let alive = true;
      const speed = Math.hypot(projectile.vx, projectile.vy);
      const steps = clamp(Math.ceil((speed * dt) / 16), 1, 7);
      const stepDt = dt / steps;

      for (let step = 0; step < steps && alive; step += 1) {
        projectile.x += projectile.vx * stepDt;
        projectile.y += projectile.vy * stepDt;

        if (
          projectile.x < -30 ||
          projectile.x > ARENA.width + 30 ||
          projectile.y < -30 ||
          projectile.y > ARENA.height + 30
        ) {
          alive = false;
          break;
        }

        for (const cover of this.covers) {
          if (!cover.alive) continue;
          const hit = circleRect(projectile.x, projectile.y, projectile.radius, cover);
          if (!hit) continue;
          if (projectile.explodeRadius) {
            this.explodeProjectile(projectile, now);
            alive = false;
            break;
          }
          const source = this.players.get(projectile.ownerId);
          this.damageCover(cover, 5 + projectile.mass * speed * 0.28, source, now);
          const reflected = reflectVelocity(
            projectile.vx,
            projectile.vy,
            hit.nx,
            hit.ny,
            0.86,
          );
          projectile.vx = reflected.vx;
          projectile.vy = reflected.vy;
          projectile.x += hit.nx * (hit.penetration + 2);
          projectile.y += hit.ny * (hit.penetration + 2);
          projectile.bounces -= 1;
          this.addEffect("spark", projectile.x, projectile.y, now, {
            radius: 22,
            team: projectile.team,
            duration: 220,
            color: "#fef3c7",
          });
          if (projectile.bounces < 0 || Math.hypot(projectile.vx, projectile.vy) < 90) {
            alive = false;
          }
          break;
        }
        if (!alive) break;

        for (const target of this.players.values()) {
          if (target.slot === projectile.team || !target.alive || now < target.invulnUntil) continue;
          if (
            Math.hypot(target.x - projectile.x, target.y - projectile.y) >
            target.radius + projectile.radius
          ) {
            continue;
          }

          if (
            target.heroId === "bastion" &&
            now < target.reflectUntil &&
            projectile.reflectable
          ) {
            projectile.team = target.slot;
            projectile.ownerId = target.id;
            projectile.reflectable = false;
            projectile.bounces = Math.max(projectile.bounces, 1);
            projectile.vx *= -1.15;
            projectile.vy *= -1.15;
            const direction = normalize(projectile.vx, projectile.vy);
            projectile.x =
              target.x + direction.x * (target.radius + projectile.radius + 8);
            projectile.y =
              target.y + direction.y * (target.radius + projectile.radius + 8);
            target.super = Math.min(COMBAT.superMax, target.super + 12);
            this.addEffect("reflect", target.x, target.y, now, {
              radius: target.radius + 24,
              team: target.slot,
              duration: 420,
              color: "#bae6fd",
            });
            break;
          }

          const source = this.players.get(projectile.ownerId);
          if (projectile.explodeRadius) {
            this.explodeProjectile(projectile, now);
          } else {
            this.applyPlayerDamage(target, projectile.damage, source, now, projectile.type === "tower" ? "tower" : "other");
            this.applyKnockback(target, projectile, projectile.knockback);
            this.addEffect("hit", projectile.x, projectile.y, now, {
              radius: 30,
              team: projectile.team,
              duration: 220,
              color: getHero(target.heroId).color,
            });
          }
          alive = false;
          break;
        }
        if (!alive) break;

        for (const minion of this.minions) {
          if (!minion.alive || minion.team === projectile.team) continue;
          if (
            Math.hypot(minion.x - projectile.x, minion.y - projectile.y) >
            minion.radius + projectile.radius
          ) {
            continue;
          }
          if (projectile.explodeRadius) {
            this.explodeProjectile(projectile, now);
          } else {
            this.damageMinion(minion, projectile.damage, this.players.get(projectile.ownerId), now);
            minion.vx += projectile.vx * 0.035;
            minion.vy += projectile.vy * 0.035;
          }
          alive = false;
          break;
        }
        if (!alive) break;

        const structures = [
          ...this.towers.filter((tower) => tower.alive && tower.team !== projectile.team),
          ...this.nexuses.filter((nexus) => nexus.alive && nexus.team !== projectile.team),
        ];
        for (const structure of structures) {
          if (
            Math.hypot(structure.x - projectile.x, structure.y - projectile.y) >
            structure.radius + projectile.radius
          ) {
            continue;
          }
          if (projectile.explodeRadius) {
            this.explodeProjectile(projectile, now);
          } else {
            this.damageStructure(
              structure,
              projectile.damage,
              this.players.get(projectile.ownerId),
              now,
            );
            this.addEffect("hit", projectile.x, projectile.y, now, {
              radius: 34,
              team: projectile.team,
              duration: 240,
              color: projectile.team === TEAM.BLUE ? "#93c5fd" : "#fca5a5",
            });
          }
          alive = false;
          break;
        }
      }

      if (alive) survivors.push(projectile);
    }

    this.projectiles = survivors;
  }

  explodeProjectile(projectile, now) {
    this.radialBurst({
      owner: this.players.get(projectile.ownerId) ?? null,
      x: projectile.x,
      y: projectile.y,
      radius: projectile.explodeRadius,
      damage: projectile.damage,
      force: projectile.explodeForce,
      now,
      kind: "explosion",
    });
  }

  radialBurst({ owner, x, y, radius, damage, force, now, kind }) {
    const team = owner?.slot ?? null;
    this.addEffect(kind, x, y, now, {
      radius,
      team,
      duration: 480,
      color: owner ? getHero(owner.heroId).color : "#fef3c7",
    });

    for (const target of this.players.values()) {
      if (team !== null && target.slot === team) continue;
      if (!target.alive || now < target.invulnUntil) continue;
      const dx = target.x - x;
      const dy = target.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius + target.radius) continue;
      const falloff = 1 - clamp(distance / (radius + target.radius), 0, 0.85);
      this.applyPlayerDamage(target, damage * falloff, owner, now);
      const direction = normalize(dx, dy);
      const push = (force * falloff) / target.mass;
      target.vx += direction.x * push;
      target.vy += direction.y * push;
    }

    for (const minion of this.minions) {
      if (!minion.alive || (team !== null && minion.team === team)) continue;
      const distance = Math.hypot(minion.x - x, minion.y - y);
      if (distance > radius + minion.radius) continue;
      const falloff = 1 - clamp(distance / (radius + minion.radius), 0, 0.9);
      this.damageMinion(minion, damage * 1.35 * falloff, owner, now);
      const direction = normalize(minion.x - x, minion.y - y);
      minion.vx += direction.x * force * falloff * 0.8;
      minion.vy += direction.y * force * falloff * 0.8;
    }

    for (const cover of this.covers) {
      if (!cover.alive) continue;
      const closestX = clamp(x, cover.x, cover.x + cover.w);
      const closestY = clamp(y, cover.y, cover.y + cover.h);
      const distance = Math.hypot(x - closestX, y - closestY);
      if (distance > radius) continue;
      const falloff = 1 - clamp(distance / radius, 0, 0.9);
      this.damageCover(cover, damage * 1.6 * falloff, owner, now);
    }
  }

  applyKnockback(target, projectile, knockback) {
    if (!knockback) return;
    const speed = Math.hypot(projectile.vx, projectile.vy);
    if (speed < 1) return;
    const direction = normalize(projectile.vx, projectile.vy);
    const push = (knockback / target.mass) * 1.7;
    target.vx += direction.x * push;
    target.vy += direction.y * push;
  }

  applyPlayerDamage(target, amount, source = null, now = Date.now(), kind = "other") {
    if (!target.alive || amount <= 0 || now < target.invulnUntil) return 0;
    let remaining = amount;
    if (now < target.guardUntil) remaining *= target.guardFactor;
    const banked = target.heroId === "bastion" ? this.taliUsusBank(target, remaining, now) : 0;
    remaining -= banked;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
      this.addEffect("shieldHit", target.x, target.y, now, {
        radius: target.radius + 18,
        team: target.slot,
        duration: 220,
        color: "#bae6fd",
      });
    }
    if (banked > 0) {
      target.shield = Math.min(COMBAT.maxShield, target.shield + banked);
      target.shieldUntil = Math.max(target.shieldUntil, target.taliUntil);
    }
    if (remaining > 0) {
      target.hp -= remaining;
      if (source && source.id !== target.id) {
        source.super = Math.min(COMBAT.superMax, source.super + remaining * COMBAT.superPerDamage);
      }
    }
    // jejak serangan terakhir untuk notifikasi "diserang / menyerang" di client
    target.lastHit = {
      by: source && source.id !== target.id ? source.id : null,
      kind: source && source.id !== target.id ? "hero" : kind,
      at: now,
      amount: Math.max(1, Math.round(amount)),
    };
    if (target.hp <= 0) {
      this.killPlayer(target, source, now);
    }
    return amount;
  }

  // Tali Usus (Warok Suro): di bawah 30% HP, 50% damage jadi perisai selama 5 detik.
  // Mengembalikan jumlah damage yang diubah menjadi perisai (dikreditkan setelah hit).
  taliUsusBank(target, damage, now) {
    const tali = getHero(target.heroId).passive;
    if (!tali) return 0;
    if (now >= target.taliUntil && now >= target.taliReadyAt && target.hp < target.maxHp * tali.threshold) {
      target.taliUntil = now + tali.duration * 1000;
      target.taliReadyAt = now + tali.cooldown * 1000;
      this.addEffect("shield", target.x, target.y, now, {
        radius: target.radius + 24,
        team: target.slot,
        duration: tali.duration * 1000,
        color: "#fbbf24",
      });
    }
    if (now >= target.taliUntil) return 0;
    return damage * tali.conversion;
  }

  /**
   * Sinyal minimap: "go" (ayo ke sini) atau "danger" (bahaya). Hanya rekan satu tim yang
   * menerimanya; bot rekan tim bergerak ke titik "go" selama beberapa detik.
   */
  handlePing(playerId, message, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player || this.status !== "playing") return { error: "invalid" };
    const x = Number(message.x);
    const y = Number(message.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { error: "invalid" };
    if (now - (player.lastPingAt ?? 0) < 1500) return { error: "cooldown" };
    player.lastPingAt = now;
    const kind = message.kind === "danger" ? "danger" : "go";
    const px = clamp(x, 0, ARENA.width);
    const py = clamp(y, 0, ARENA.height);
    const payload = {
      type: "signal",
      from: player.id,
      name: player.name,
      slot: player.slot,
      kind,
      x: round(px, 0),
      y: round(py, 0),
      serverTime: now,
    };
    for (const mate of this.players.values()) {
      if (mate.slot !== player.slot) continue;
      if (!mate.bot) {
        this.send(mate, payload);
      } else if (kind === "go" && mate.id !== player.id) {
        mate.pingX = px;
        mate.pingY = py;
        mate.pingUntil = now + 9000;
      }
    }
    return { ok: true };
  }

  killPlayer(target, source, now) {
    if (!target.alive) return;
    target.alive = false;
    target.hp = 0;
    target.shield = 0;
    target.shieldUntil = 0;
    target.guardUntil = 0;
    target.taliUntil = 0;
    target.edgeUntil = 0;
    target.slowUntil = 0;
    target.duelEdgeUntil = 0;
    target.duelSlowUntil = 0;
    this.cancelDuelsFor(target.id, now);
    target.vx = 0;
    target.vy = 0;
    target.respawnAt = now + MATCH.respawn * 1000;
    target.stats.deaths += 1;
    target.botQuizPlan = null;

    if (source && source.slot !== target.slot) {
      source.stats.kills += 1;
      source.super = Math.min(COMBAT.superMax, source.super + COMBAT.superPerTakedown);
      this.addXp(source, 150, now);
      this.addFeed(`${source.name} menumbangkan ${target.name}.`, source.slot, now);
    } else {
      this.addFeed(`${target.name} tumbang.`, target.slot, now);
    }

    this.addEffect("death", target.x, target.y, now, {
      radius: 95,
      team: target.slot,
      duration: 700,
      color: getHero(target.heroId).color,
    });
  }

  respawnPlayer(player, now) {
    const spawn = SPAWNS[player.slot][player.seat];
    player.alive = true;
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp;
    player.shield = 0;
    player.shieldUntil = 0;
    player.edgeUntil = 0;
    player.slowUntil = 0;
    player.duelEdgeUntil = 0;
    player.duelSlowUntil = 0;
    player.invulnUntil = now + 1800;
    player.ammo = COMBAT.maxAmmo;
    player.reload = 0;
    player.respawnAt = 0;
    player.prevMask = 0;
    player.inputMask = 0;
    player.botQuizPlan = null;
    this.addEffect("spawn", player.x, player.y, now, {
      radius: 100,
      team: player.slot,
      duration: 650,
      color: getHero(player.heroId).color,
    });
  }

  damageMinion(minion, amount, source, now) {
    if (!minion.alive) return;
    minion.hp -= amount;
    if (minion.hp > 0) return;
    minion.alive = false;
    if (source) {
      source.stats.cs += 1;
      this.addXp(source, MINION.xp, now);
    }
    this.addEffect("death", minion.x, minion.y, now, {
      radius: 28,
      team: minion.team,
      duration: 340,
      color: minion.team === TEAM.BLUE ? "#60a5fa" : "#fb7185",
    });
  }

  damageCover(cover, amount, source, now) {
    if (!cover.alive) return;
    cover.hp -= amount;
    if (cover.hp > 0) return;
    cover.alive = false;
    cover.hp = 0;
    this.addEffect("coverBreak", cover.x + cover.w / 2, cover.y + cover.h / 2, now, {
      radius: 80,
      team: source?.slot ?? null,
      duration: 600,
      color: "#fcd34d",
    });
  }

  /** Lane tim yang kedua menaranya sudah hancur membuka jalan ke Nexus. */
  isNexusExposed(team) {
    return LANE_IDS.some((lane) =>
      this.towers.filter((tower) => tower.team === team && tower.lane === lane).every((tower) => !tower.alive),
    );
  }

  damageStructure(structure, amount, source, now) {
    if (!structure.alive) return 0;
    if (structure.id.startsWith("nexus") && !this.isNexusExposed(structure.team)) {
      this.addEffect("protected", structure.x, structure.y, now, {
        radius: structure.radius + 20,
        team: structure.team,
        duration: 300,
        color: "#fde68a",
      });
      return 0;
    }
    if (structure.id.startsWith("tower") && structure.tier === "inner") {
      const outer = this.towers.find(
        (tower) => tower.team === structure.team && tower.lane === structure.lane && tower.tier === "outer",
      );
      if (outer?.alive) {
        this.addEffect("protected", structure.x, structure.y, now, {
          radius: structure.radius + 20,
          team: structure.team,
          duration: 300,
          color: "#fde68a",
        });
        return 0;
      }
    }

    structure.hp -= amount;
    if (source) {
      source.super = Math.min(COMBAT.superMax, source.super + amount * 0.7);
    }
    if (structure.hp > 0) return amount;

    structure.hp = 0;
    structure.alive = false;
    if (structure.id.startsWith("tower")) {
      const teamName = structure.team === TEAM.BLUE ? "Samudra" : "Merapi";
      const exposed = this.isNexusExposed(structure.team);
      this.addFeed(
        `Menara ${teamName} di ${LANE_LABELS[structure.lane]} hancur.${exposed ? " Nexus kini terbuka!" : ""}`,
        null,
        now,
      );
      if (source) this.addXp(source, 160, now);
      this.addEffect("towerDown", structure.x, structure.y, now, {
        radius: 150,
        team: structure.team,
        duration: 1000,
        color: "#fde68a",
      });
    } else {
      const winnerSlot = structure.team === TEAM.BLUE ? TEAM.RED : TEAM.BLUE;
      this.endMatch(winnerSlot, "nexus", now);
    }
    return amount;
  }


  updateMinions(dt, now) {
    while (now >= this.match.waveAt) {
      this.spawnWave(now);
      this.match.waveAt += MATCH.waveInterval * 1000;
    }

    for (const minion of this.minions) {
      if (!minion.alive) continue;

      minion.attackCd = Math.max(0, minion.attackCd - dt);
      minion.vx *= Math.exp(-4.5 * dt);
      minion.vy *= Math.exp(-4.5 * dt);

      const target = this.findMinionTarget(minion);
      const path = LANES[minion.lane][minion.team];
      let waypoint = path[Math.min(minion.waypoint, path.length - 1)];
      if (Math.hypot(waypoint.x - minion.x, waypoint.y - minion.y) < 70 && minion.waypoint < path.length - 1) {
        minion.waypoint += 1;
        waypoint = path[minion.waypoint];
      }
      const goal =
        minion.waypoint >= path.length - 1 && Math.hypot(waypoint.x - minion.x, waypoint.y - minion.y) < 90
          ? this.nexuses.find((nexus) => nexus.team !== minion.team)
          : waypoint;
      let moveX = goal.x + minion.offsetX - minion.x;
      let moveY = goal.y + minion.offsetY - minion.y;

      if (target) {
        const distance = Math.hypot(target.x - minion.x, target.y - minion.y);
        if (distance <= minion.range + (target.radius ?? 0)) {
          if (minion.attackCd <= 0) {
            minion.attackCd = MINION.interval;
            minion.attackedAt = now;
            if (target.kind === "player") {
              this.applyPlayerDamage(target.entity, MINION.damage, null, now, "minion");
            } else if (target.kind === "minion") {
              this.damageMinion(target.entity, MINION.damage, null, now);
            } else {
              this.damageStructure(target.entity, MINION.damage, null, now);
            }
            this.addEffect("minionHit", target.x, target.y, now, {
              radius: 18,
              team: minion.team,
              duration: 180,
              color: "#f8fafc",
            });
          }
          moveX = 0;
          moveY = 0;
        } else {
          moveX = target.x - minion.x;
          moveY = target.y - minion.y;
        }
      }

      const move = normalize(moveX, moveY);
      minion.x += (move.x * MINION.speed + minion.vx) * dt;
      minion.y += (move.y * MINION.speed + minion.vy) * dt;
      minion.x = clamp(minion.x, ARENA.inset, ARENA.width - ARENA.inset);
      minion.y = clamp(minion.y, ARENA.inset, ARENA.height - ARENA.inset);
    }

    this.minions = this.minions.filter((minion) => minion.alive);
  }


  spawnWave(now) {
    for (const team of [TEAM.BLUE, TEAM.RED]) {
      const aliveCount = this.minions.filter((minion) => minion.alive && minion.team === team).length;
      if (aliveCount >= 36) continue;
      for (const lane of LANE_IDS) {
        const start = LANES[lane][team][0];
        for (let index = 0; index < MATCH.minionsPerWave; index += 1) {
          this.minionSeq += 1;
          const spread = (index - 1) * 26;
          this.minions.push({
            id: `m-${this.minionSeq}`,
            team,
            lane,
            waypoint: 1,
            x: start.x + (team === TEAM.BLUE ? -index * 18 : index * 18),
            y: start.y,
            offsetX: 0,
            offsetY: spread,
            vx: 0,
            vy: 0,
            hp: MINION.hp,
            maxHp: MINION.hp,
            radius: MINION.radius,
            speed: MINION.speed,
            range: MINION.range,
            attackCd: 0.4 + index * 0.08,
            variant: minionVariant(index),
            attackedAt: 0,
            alive: true,
          });
        }
      }
    }
    this.addFeed("Gelombang minion baru memasuki tiga lane.", null, now);
  }


  getMinionObjective(team) {
    return this.nexuses.find((nexus) => nexus.team !== team);
  }


  findMinionTarget(minion) {
    let best = null;
    let bestDistance = Infinity;

    for (const other of this.minions) {
      if (!other.alive || other.team === minion.team) continue;
      const distance = Math.hypot(other.x - minion.x, other.y - minion.y);
      if (distance < 145 && distance < bestDistance) {
        bestDistance = distance;
        best = { kind: "minion", entity: other, x: other.x, y: other.y, radius: other.radius };
      }
    }

    for (const player of this.players.values()) {
      if (!player.alive || player.slot === minion.team) continue;
      const distance = Math.hypot(player.x - minion.x, player.y - minion.y);
      if (distance < 190 && distance < bestDistance) {
        bestDistance = distance;
        best = { kind: "player", entity: player, x: player.x, y: player.y, radius: player.radius };
      }
    }

    for (const enemyTower of this.towers) {
      if (!enemyTower.alive || enemyTower.team === minion.team) continue;
      const distance = Math.hypot(enemyTower.x - minion.x, enemyTower.y - minion.y);
      if (distance < 150 && distance < bestDistance) {
        bestDistance = distance;
        best = {
          kind: "structure",
          entity: enemyTower,
          x: enemyTower.x,
          y: enemyTower.y,
          radius: enemyTower.radius,
        };
      }
    }

    const enemyNexus = this.nexuses.find((nexus) => nexus.team !== minion.team);
    if (enemyNexus) {
      const distance = Math.hypot(enemyNexus.x - minion.x, enemyNexus.y - minion.y);
      if (distance < 150 && distance < bestDistance) {
        bestDistance = distance;
        best = {
          kind: "structure",
          entity: enemyNexus,
          x: enemyNexus.x,
          y: enemyNexus.y,
          radius: enemyNexus.radius,
        };
      }
    }

    return best;
  }

  updateTowers(dt, now) {
    for (const tower of this.towers) {
      if (!tower.alive) continue;
      tower.attackCd = Math.max(0, tower.attackCd - dt);
      if (tower.attackCd > 0) continue;

      let target = null;
      let bestDistance = Infinity;
      for (const minion of this.minions) {
        if (!minion.alive || minion.team === tower.team) continue;
        const distance = Math.hypot(minion.x - tower.x, minion.y - tower.y);
        if (distance < tower.range && distance < bestDistance) {
          bestDistance = distance;
          target = minion;
        }
      }
      if (!target) {
        for (const player of this.players.values()) {
          if (!player.alive || player.slot === tower.team) continue;
          const distance = Math.hypot(player.x - tower.x, player.y - tower.y);
          if (distance < tower.range && distance < bestDistance) {
            bestDistance = distance;
            target = player;
          }
        }
      }
      if (!target) continue;

      tower.attackCd = tower.interval;
      const direction = normalize(target.x - tower.x, target.y - tower.y);
      this.spawnProjectile({
        team: tower.team,
        ownerId: tower.id,
        type: "tower",
        x: tower.x + direction.x * (tower.radius + 10),
        y: tower.y + direction.y * (tower.radius + 10),
        vx: direction.x * 660,
        vy: direction.y * 660,
        radius: 9,
        mass: 0.2,
        damage: tower.damage,
        knockback: 110,
        ttl: 1.3,
        bounces: 0,
        reflectable: false,
        now,
      });
      this.addEffect("towerShot", tower.x, tower.y, now, {
        radius: 42,
        team: tower.team,
        duration: 180,
        color: tower.team === TEAM.BLUE ? "#60a5fa" : "#fb7185",
      });
    }
  }

  addXp(player, amount, now = Date.now()) {
    player.xp += amount;
    while (player.xp >= player.nextXp) {
      player.xp -= player.nextXp;
      player.level += 1;
      player.nextXp = xpNeeded(player.level);
      player.maxHp += 12;
      player.hp = Math.min(player.maxHp, player.hp + 24);
      this.addEffect("level", player.x, player.y, now, {
        radius: 70,
        team: player.slot,
        duration: 700,
        color: "#fbbf24",
      });
      this.addFeed(`${player.name} naik ke level ${player.level}.`, player.slot, now);
    }
  }

  addEffect(type, x, y, now, options = {}) {
    this.effectSeq += 1;
    this.effects.push({
      id: this.effectSeq,
      type,
      x,
      y,
      start: now,
      radius: options.radius ?? 30,
      team: options.team ?? null,
      duration: options.duration ?? 350,
      color: options.color ?? "#ffffff",
    });
    if (this.effects.length > 90) this.effects.shift();
  }

  clearExpiredEffects(now) {
    if (this.effects.length === 0) return;
    this.effects = this.effects.filter((effect) => now - effect.start < effect.duration);
  }

  addFeed(text, team = null, now = Date.now()) {
    this.feed.push({ id: randomUUID(), text, team, at: now });
    if (this.feed.length > 10) this.feed.shift();
  }

  /** Soal acak dari tingkat room; tidak berulang dalam satu match sampai bank habis. */
  drawQuestion() {
    const levelName = LEVEL_NAMES[this.level - 1];
    let pool = questionsForLevel(levelName).filter(
      (question) => !this.usedQuestionIds.has(question.id),
    );
    if (pool.length === 0) {
      for (const question of questionsForLevel(levelName)) this.usedQuestionIds.delete(question.id);
      pool = questionsForLevel(levelName);
    }
    const question = pool[Math.floor(Math.random() * pool.length)];
    this.usedQuestionIds.add(question.id);
    return question;
  }

  startClash(now) {
    if (this.clash || this.status !== "playing") return;
    const question = this.drawQuestion();

    this.match.clashCount += 1;
    this.clash = {
      id: `clash-${this.match.clashCount}-${question.id}`,
      question,
      phase: "active",
      startedAt: now,
      endsAt: now + CLASH.duration * 1000,
      answerStatus: Object.fromEntries([...this.players.values()].map((player) => [player.index, "waiting"])),
      answers: Object.fromEntries([...this.players.values()].map((player) => [player.index, null])),
      winnerSlot: null,
      winnerIndex: null,
      correctIndex: null,
      explanation: null,
      reason: null,
      slowUntil: now + CLASH.duration * 1000,
    };

    for (const player of this.players.values()) {
      if (player.bot) {
        player.botQuizPlan = planBotQuiz({
          level: player.skillLevel,
          correctIndex: question.answer,
          now,
        });
      } else {
        player.botQuizPlan = null;
      }
    }

    this.addEffect("clash", ARENA.width / 2, ARENA.height / 2, now, {
      radius: 260,
      team: null,
      duration: 1200,
      color: "#fef08a",
    });
    this.addFeed("PHYSICS CLASH! Jawab soal yang sama lebih cepat dari lawan.", null, now);
    this.broadcast({
      type: "clashStart",
      clash: this.serializeClash(now),
      serverTime: now,
    });
  }

  updateBotQuiz(now) {
    if (!this.clash || this.clash.phase !== "active") return;
    for (const player of this.players.values()) {
      if (!player.bot) continue;
      if (!player.botQuizPlan) {
        player.botQuizPlan = planBotQuiz({
          level: player.skillLevel,
          correctIndex: this.clash.question.answer,
          now,
        });
      }
      if (player.botQuizPlan.answered || now < player.botQuizPlan.at) continue;
      if (this.clash.phase !== "active") break;
      player.botQuizPlan.answered = true;
      const result = this.answerQuiz(
        player.id,
        this.clash.id,
        player.botQuizPlan.option,
        now,
      );
      if (!result.accepted) player.botQuizPlan.answered = false;
    }
  }

  answerQuiz(playerId, clashId, option, now = Date.now()) {
    if (String(clashId).startsWith("duel-")) return this.answerDuelById(playerId, clashId, option, now);
    const player = this.players.get(playerId);
    if (!player || this.status !== "playing") {
      return { accepted: false, reason: "invalid" };
    }
    if (!this.clash || this.clash.id !== clashId || this.clash.phase !== "active") {
      return { accepted: false, reason: "clash-ended" };
    }
    if (now > this.clash.endsAt) {
      return { accepted: false, reason: "timeout" };
    }
    if (!Number.isInteger(option) || option < 0 || option > 3) {
      return { accepted: false, reason: "option" };
    }
    if (this.clash.answerStatus[player.index] !== "waiting") {
      return { accepted: false, reason: "locked" };
    }

    this.clash.answerStatus[player.index] = "locked";
    const correct = option === this.clash.question.answer;
    this.clash.answers[player.index] = { option, correct, at: now };

    if (correct) {
      player.stats.correct += 1;
      this.resolveClash(now, player.index, "correct");
      return { accepted: true, correct: true };
    }

    player.stats.wrong += 1;
    player.slowUntil = now + CLASH.lossDuration * 1000;
    this.addEffect("wrong", player.x, player.y, now, {
      radius: 55,
      team: player.slot,
      duration: 500,
      color: "#f87171",
    });
    this.addFeed(`${player.name} salah. Momentum Loss aktif.`, player.slot, now);
    if (Object.values(this.clash.answerStatus).every((status) => status !== "waiting")) {
      this.resolveClash(now, null, "bothWrong");
    }
    return { accepted: true, correct: false };
  }

  resolveClash(now, winnerIndex, reason) {
    if (!this.clash || this.clash.phase !== "active") return;
    const clash = this.clash;
    const winner =
      winnerIndex === null ? null : [...this.players.values()].find((player) => player.index === winnerIndex) ?? null;
    clash.phase = "resolved";
    clash.winnerIndex = winner ? winner.index : null;
    clash.winnerSlot = winner ? winner.slot : null;
    clash.correctIndex = clash.question.answer;
    clash.explanation = clash.question.explanation;
    clash.reason = reason;
    clash.resolvedAt = now;
    clash.slowUntil = now + CLASH.resultDisplay * 1000;

    if (winner) {
      clash.answerStatus[winner.index] = "correct";
      {
        winner.stats.clashWins += 1;
        winner.edgeUntil = now + CLASH.edgeDuration * 1000;
        winner.insight += 1;
        winner.super = COMBAT.superMax;
        this.addFeed(`Physics Edge untuk ${winner.name}! ${GOOD_LUCK[Math.floor(Math.random() * GOOD_LUCK.length)]}`, winner.slot, now);
        this.addEffect("edge", winner.x, winner.y, now, {
          radius: 120,
          team: winner.slot,
          duration: 900,
          color: "#fde047",
        });
      }
    } else if (reason === "bothWrong") {
      this.addFeed("Semua pemain salah. Tidak ada Physics Edge.", null, now);
    } else {
      this.addFeed("Waktu habis. Tidak ada Physics Edge.", null, now);
    }

    this.broadcast({
      type: "clashResult",
      clash: this.serializeClash(now),
      serverTime: now,
    });
  }

  // ------------------------------------------------------------ duel jawab

  duelOf(playerId) {
    for (const duel of this.duels.values()) {
      if (duel.attackerId === playerId || duel.victimId === playerId) return duel;
    }
    return null;
  }

  duelAsAttacker(playerId) {
    for (const duel of this.duels.values()) {
      if (duel.attackerId === playerId) return duel;
    }
    return null;
  }

  duelPairKey(idA, idB) {
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
  }

  /** Hero lawan terdekat di arah bidik dan dalam jarak serang; null berarti serangan biasa tanpa duel. */
  findDuelTarget(attacker, aimX, aimY, now) {
    if (!DUEL.enabled || this.clash || this.status !== "playing") return null;
    if (this.duelOf(attacker.id)) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const target of this.players.values()) {
      if (!target.alive || target.slot === attacker.slot) continue;
      if (attacker.bot && target.bot) continue;
      if (now < target.duelImmuneUntil || now < target.invulnUntil) continue;
      if (this.duelOf(target.id)) continue;
      if (now < (this.duelPairUntil.get(this.duelPairKey(attacker.id, target.id)) ?? 0)) continue;
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const distance = Math.hypot(dx, dy) - target.radius;
      if (distance > DUEL.range) continue;
      const angle = Math.abs(Math.atan2(aimX * dy - aimY * dx, aimX * dx + aimY * dy));
      if (angle > DUEL.aimCone) continue;
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    return best;
  }

  openDuel(attacker, victim, aimX, aimY, now) {
    const question = this.drawQuestion();
    this.duelSeq += 1;
    const duel = {
      id: `duel-${this.duelSeq}-${question.id}`,
      attackerId: attacker.id,
      victimId: victim.id,
      question,
      startedAt: now,
      endsAt: now + DUEL.duration * 1000,
      aimX,
      aimY,
      answers: { attacker: null, victim: null },
      plans: { attacker: null, victim: null },
    };
    this.duels.set(duel.id, duel);
    for (const [role, player] of [
      ["attacker", attacker],
      ["victim", victim],
    ]) {
      if (player.bot) {
        duel.plans[role] = planBotQuiz({
          level: player.skillLevel,
          correctIndex: question.answer,
          now,
          delayMin: DUEL.botDelayMin,
          delayMax: DUEL.botDelayMax,
        });
      } else {
        this.send(player, { type: "duelStart", duel: this.serializeDuel(duel, role, now), serverTime: now });
      }
    }
  }

  serializeDuel(duel, role, now) {
    const opponent = this.players.get(role === "attacker" ? duel.victimId : duel.attackerId);
    return {
      id: duel.id,
      role,
      opponent: opponent?.name ?? "",
      category: duel.question.category,
      level: duel.question.level,
      prompt: duel.question.prompt,
      options: duel.question.options,
      startedAt: duel.startedAt,
      endsAt: duel.endsAt,
      remaining: Math.max(0, duel.endsAt - now),
    };
  }

  answerDuelById(playerId, duelId, option, now) {
    const player = this.players.get(playerId);
    if (!player || this.status !== "playing") return { accepted: false, reason: "invalid" };
    const duel = this.duels.get(duelId);
    if (!duel) return { accepted: false, reason: "clash-ended" };
    return this.answerDuel(player, duel, option, now);
  }

  answerDuel(player, duel, option, now) {
    const role =
      duel.attackerId === player.id ? "attacker" : duel.victimId === player.id ? "victim" : null;
    if (!role) return { accepted: false, reason: "invalid" };
    if (now > duel.endsAt) return { accepted: false, reason: "timeout" };
    if (!Number.isInteger(option) || option < 0 || option > 3) {
      return { accepted: false, reason: "option" };
    }
    if (duel.answers[role]) return { accepted: false, reason: "locked" };
    const correct = option === duel.question.answer;
    duel.answers[role] = { option, correct, at: now };
    if (correct || (duel.answers.attacker && duel.answers.victim)) {
      this.resolveDuel(duel, now, "answer");
    }
    return { accepted: true, correct };
  }

  updateDuels(now) {
    if (this.duels.size === 0) return;
    if (this.status !== "playing") {
      this.duels.clear();
      return;
    }
    for (const duel of [...this.duels.values()]) {
      const attacker = this.players.get(duel.attackerId);
      const victim = this.players.get(duel.victimId);
      if (!attacker || !victim || !attacker.alive || !victim.alive) {
        this.resolveDuel(duel, now, "cancel");
        continue;
      }
      for (const role of ["attacker", "victim"]) {
        const player = role === "attacker" ? attacker : victim;
        const plan = duel.plans[role];
        if (!player.bot || !plan || duel.answers[role] || now < plan.at) continue;
        this.answerDuel(player, duel, plan.option, now);
        if (!this.duels.has(duel.id)) break;
      }
      if (this.duels.has(duel.id) && now >= duel.endsAt) this.resolveDuel(duel, now, "timeout");
    }
  }

  cancelDuelsFor(playerId, now) {
    for (const duel of [...this.duels.values()]) {
      if (duel.attackerId === playerId || duel.victimId === playerId) {
        this.resolveDuel(duel, now, "cancel");
      }
    }
  }

  applyDuelSlow(player, factor, seconds, now) {
    player.duelSlowFactor = now < player.duelSlowUntil ? Math.min(player.duelSlowFactor, factor) : factor;
    player.duelSlowUntil = Math.max(player.duelSlowUntil, now + seconds * 1000);
  }

  resolveDuel(duel, now, reason) {
    if (!this.duels.delete(duel.id)) return;
    const attacker = this.players.get(duel.attackerId);
    const victim = this.players.get(duel.victimId);
    const a = duel.answers.attacker;
    const v = duel.answers.victim;
    let outcome;
    if (reason === "cancel") outcome = "cancelled";
    else if (a?.correct && !v?.correct) outcome = "attackerWins";
    else if (v?.correct) outcome = "victimWins";
    else outcome = "bothFail";

    const effect = { attacker: { penalty: "none", edge: false }, victim: { penalty: "none", edge: false } };
    if (outcome === "cancelled") {
      // dibatalkan tanpa penalti: peluru penyerang dikembalikan
      if (attacker) {
        attacker.ammo = Math.min(COMBAT.maxAmmo, attacker.ammo + 1);
        attacker.attackCd = 0;
      }
    } else if (attacker && victim) {
      this.duelPairUntil.set(this.duelPairKey(attacker.id, victim.id), now + DUEL.pairCooldown * 1000);
      victim.duelImmuneUntil = now + DUEL.immunity * 1000;
      const victimPenalty = () => {
        this.applyDuelSlow(victim, DUEL.victimLossSpeed, DUEL.victimLossDuration, now);
        effect.victim.penalty = "medium";
      };
      if (outcome === "attackerWins") {
        let aimX = victim.x - attacker.x;
        let aimY = victim.y - attacker.y;
        const length = Math.hypot(aimX, aimY);
        if (length > 0.001) {
          aimX /= length;
          aimY /= length;
        } else {
          aimX = duel.aimX;
          aimY = duel.aimY;
        }
        this.fireBasicShot(attacker, aimX, aimY, now);
        attacker.duelEdgeUntil = now + DUEL.edgeDuration * 1000;
        effect.attacker.edge = true;
        if (v && !v.correct) victimPenalty();
      } else {
        this.applyDuelSlow(attacker, DUEL.attackerLossSpeed, DUEL.attackerLossDuration, now);
        effect.attacker.penalty = "small";
        if (outcome === "victimWins") {
          victim.duelEdgeUntil = now + DUEL.edgeDuration * 1000;
          effect.victim.edge = true;
          this.addFeed(`${victim.name} menahan serangan ${attacker.name}!`, victim.slot, now);
        } else {
          victimPenalty();
          this.addFeed(`Duel ${attacker.name} vs ${victim.name}: tak ada yang menjawab benar.`, null, now);
        }
      }
    }

    for (const [role, player] of [
      ["attacker", attacker],
      ["victim", victim],
    ]) {
      if (!player || player.bot) continue;
      const mine = duel.answers[role];
      this.send(player, {
        type: "duelResult",
        duel: {
          id: duel.id,
          role,
          outcome,
          youWon:
            outcome === "attackerWins" ? role === "attacker" : outcome === "victimWins" ? role === "victim" : false,
          correctIndex: duel.question.answer,
          explanation: duel.question.explanation,
          yourOption: mine ? mine.option : null,
          penalty: effect[role].penalty,
          edge: effect[role].edge,
        },
        serverTime: now,
      });
    }
  }

  serializeClash(now) {
    if (!this.clash) return null;
    const active = this.clash.phase === "active";
    return {
      id: this.clash.id,
      category: this.clash.question.category,
      level: this.clash.question.level,
      prompt: this.clash.question.prompt,
      options: this.clash.question.options,
      startedAt: this.clash.startedAt,
      endsAt: this.clash.endsAt,
      phase: this.clash.phase,
      answerStatus: { ...this.clash.answerStatus },
      winnerSlot: this.clash.winnerSlot,
      winnerIndex: this.clash.winnerIndex,
      correctIndex: active ? null : this.clash.correctIndex,
      explanation: active ? null : this.clash.explanation,
      reason: active ? null : this.clash.reason,
      remaining: Math.max(0, this.clash.endsAt - now),
    };
  }

  finishByTime(now) {
    const scores = [this.scoreFor(0), this.scoreFor(1)];
    let winnerSlot = null;
    if (scores[0] > scores[1]) winnerSlot = 0;
    else if (scores[1] > scores[0]) winnerSlot = 1;
    else {
      const nexus0 = this.nexuses.find((nexus) => nexus.team === 0);
      const nexus1 = this.nexuses.find((nexus) => nexus.team === 1);
      if (nexus0.hp !== nexus1.hp) winnerSlot = nexus0.hp > nexus1.hp ? 0 : 1;
    }
    this.endMatch(winnerSlot, "time", now, { scores });
  }

  scoreFor(team) {
    const members = [...this.players.values()].filter((candidate) => candidate.slot === team);
    const towersDown = this.towers.filter((tower) => tower.team !== team && !tower.alive).length;
    return (
      members.reduce(
        (sum, player) =>
          sum +
          player.stats.kills * SCORE.kill +
          player.stats.clashWins * SCORE.clashWin +
          player.stats.correct * SCORE.correct,
        0,
      ) +
      towersDown * SCORE.tower
    );
  }


  endMatch(winnerSlot, reason, now, details = {}) {
    if (this.status === "ended") return;
    this.status = "ended";
    if (this.match) this.match.endedAt = now;
    this.clash = null;
    const scores = details.scores ?? [this.scoreFor(0), this.scoreFor(1)];
    this.addFeed(
      winnerSlot === null ? "Pertandingan berakhir seri." : `Tim ${winnerSlot === TEAM.BLUE ? "Samudra" : "Merapi"} menang!`,
      winnerSlot,
      now,
    );
    this.broadcast({
      type: "matchEnd",
      winnerSlot,
      reason,
      scores,
      duration: this.match?.elapsed ?? 0,
      players: [...this.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
        slot: player.slot,
        seat: player.seat,
        index: player.index,
        heroId: player.heroId,
        level: player.level,
        kills: player.stats.kills,
        deaths: player.stats.deaths,
        cs: player.stats.cs,
        clashWins: player.stats.clashWins,
        correct: player.stats.correct,
        wrong: player.stats.wrong,
      })),
      serverTime: now,
    });
    this.broadcastState(now);
  }

  playersForSlot(slot) {
    return [...this.players.values()].find((player) => player.slot === slot);
  }

  serializePlayer(player, now) {
    const hero = getHero(player.heroId);
    return {
      id: player.id,
      name: player.name,
      heroId: player.heroId,
      role: hero.role,
      color: hero.color,
      slot: player.slot,
      seat: player.seat,
      index: player.index,
      x: round(player.x),
      y: round(player.y),
      vx: round(player.vx),
      vy: round(player.vy),
      radius: player.radius,
      hp: round(Math.max(0, player.hp)),
      maxHp: player.maxHp,
      shield: round(player.shield),
      alive: player.alive,
      respawnIn: player.alive ? 0 : Math.max(0, player.respawnAt - now),
      level: player.level,
      xp: round(player.xp),
      nextXp: player.nextXp,
      ammo: player.ammo,
      reload: round(player.reload),
      super: round(player.super),
      insight: player.insight,
      edge: now < player.edgeUntil,
      edgeRemaining: Math.max(0, player.edgeUntil - now),
      slowed: now < player.slowUntil || now < player.duelSlowUntil,
      slowRemaining: Math.max(0, player.slowUntil - now, player.duelSlowUntil - now),
      lastHit: player.lastHit ? { ...player.lastHit } : null,
      duelEdge: now < player.duelEdgeUntil,
      duelEdgeRemaining: Math.max(0, player.duelEdgeUntil - now),
      dashCd: round(player.dashCd, 2),
      shockCd: round(player.shockCd, 2),
      reflect: now < player.reflectUntil,
      shielded: player.shield > 0 && now < player.shieldUntil,
      connected: player.connected,
      bot: player.bot,
      stats: { ...player.stats },
    };
  }

  serializePlayerFor(client, player, now) {
    if (client.id === player.id) {
      return { ...this.serializePlayer(player, now), aimX: round(player.aimX), aimY: round(player.aimY) };
    }
    return this.serializePlayer(player, now);
  }

  broadcastState(now = Date.now()) {
    if (!this.match) {
      this.broadcastLobby();
      return;
    }
    const elapsed = Math.max(0, (now - this.match.startedAt) / 1000);
    const base = {
      type: "state",
      serverTime: now,
      status: this.status,
      elapsed: round(elapsed),
      timeLeft: round(Math.max(0, MATCH.duration - elapsed)),
      level: this.level,
      levelName: LEVEL_NAMES[this.level - 1],
      matchEnded: this.status === "ended",
      nextClashIn: this.clash
        ? null
        : this.match.nextClashAt
          ? round(Math.max(0, this.match.nextClashAt - now) / 1000)
          : null,
      clashCount: this.match.clashCount,
      players: [],
      projectiles: this.projectiles.map((projectile) => ({
        id: projectile.id,
        x: round(projectile.x),
        y: round(projectile.y),
        vx: round(projectile.vx),
        vy: round(projectile.vy),
        radius: projectile.radius,
        team: projectile.team,
        type: projectile.type,
      })),
      minions: this.minions.map((minion) => ({
        id: minion.id,
        x: round(minion.x),
        y: round(minion.y),
        vx: round(minion.vx),
        vy: round(minion.vy),
        radius: minion.radius,
        hp: round(minion.hp),
        maxHp: minion.maxHp,
        team: minion.team,
        lane: minion.lane,
        variant: minion.variant,
        attacking: now - minion.attackedAt < 280,
      })),
      towers: this.towers.map((tower) => ({
        id: tower.id,
        team: tower.team,
        lane: tower.lane,
        tier: tower.tier,
        x: tower.x,
        y: tower.y,
        radius: tower.radius,
        range: tower.range,
        hp: round(tower.hp),
        maxHp: tower.maxHp,
        alive: tower.alive,
      })),
      nexuses: this.nexuses.map((nexus) => ({
        id: nexus.id,
        team: nexus.team,
        x: nexus.x,
        y: nexus.y,
        radius: nexus.radius,
        hp: round(nexus.hp),
        maxHp: nexus.maxHp,
        alive: nexus.alive,
        protected: !this.isNexusExposed(nexus.team),
      })),
      covers: this.covers.map((cover) => ({
        id: cover.id,
        x: cover.x,
        y: cover.y,
        w: cover.w,
        h: cover.h,
        hp: round(cover.hp),
        maxHp: cover.maxHp,
        alive: cover.alive,
      })),
      effects: this.effects.map((effect) => ({
        type: effect.type,
        x: effect.x,
        y: effect.y,
        radius: effect.radius,
        team: effect.team,
        start: effect.start,
        duration: effect.duration,
        color: effect.color,
      })),
      clash: this.serializeClash(now),
      feed: this.feed.slice(-7),
    };

    for (const player of this.players.values()) {
      if (player.bot) continue;
      const personalized = {
        ...base,
        players: [...this.players.values()]
          .sort((a, b) => a.index - b.index)
          .map((other) => this.serializePlayerFor(player, other, now)),
        you: player.id,
      };
      this.send(player, personalized);
    }
  }

  handleDisconnect(playerId, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;
    player.socket = null;
    player.disconnectAt = now;
    this.cancelDuelsFor(playerId, now);
    if (this.status === "playing") {
      player.bot = true;
      player.botQuizPlan = null;
      this.addFeed(`${player.name} terputus. AI takeover aktif.`, player.slot, now);
      this.broadcast({ type: "presence", text: `${player.name} terputus. AI takeover aktif.`, playerId });
      this.broadcastState(now);
      return;
    }
    if (this.status === "ended") {
      this.broadcastState(now);
      return;
    }
    this.removePlayer(playerId);
  }

  resumePlayer(playerId, socket, now = Date.now()) {
    const player = this.players.get(playerId);
    if (!player || !player.token) return { error: "Sesi tidak ditemukan." };
    if (player.connected) return { error: "Sesi masih aktif di perangkat lain." };
    if (now - player.disconnectAt > 60_000) {
      return { error: "Batas waktu reconnect sudah habis." };
    }
    player.connected = true;
    player.disconnectAt = null;
    player.socket = socket;
    player.bot = false;
    player.botQuizPlan = null;
    this.lastHumanSeenAt = now;
    this.addFeed(`${player.name} kembali mengendalikan hero.`, player.slot, now);
    this.sendWelcome(player, { resumed: true });
    if (this.status === "playing") {
      this.broadcast({ type: "presence", text: `${player.name} tersambung kembali.`, playerId });
      this.broadcastState(now);
    } else {
      this.broadcastLobby();
      this.broadcastState(now);
    }
    return { player };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    this.cancelDuelsFor(playerId, Date.now());
    this.players.delete(playerId);
    const seatRow = this.teams[player.slot];
    if (seatRow && seatRow[player.seat] === playerId) seatRow[player.seat] = null;
    if (this.hostId === playerId) {
      this.hostId = [...this.players.values()].find((candidate) => !candidate.bot)?.id ?? null;
    }
    if ((this.status === "countdown" || this.status === "select") && this.humans.length < (this.isPractice ? 1 : 2)) {
      this.status = "lobby";
      this.countdownAt = null;
      this.selectEndsAt = null;
      for (const human of this.humans) {
        human.ready = false;
        human.locked = false;
      }
    }
    if ((this.status === "lobby" || this.status === "countdown" || this.status === "select") && this.humans.length === 0) {
      for (const bot of [...this.players.values()]) this.players.delete(bot.id);
    }
    if (this.players.size === 0) {
      this.hooks.onEmpty?.(this);
    } else {
      this.broadcastLobby();
      this.broadcastState();
    }
  }

  shouldDispose(now = Date.now()) {
    if (this.status === "playing") {
      const activeHumans = this.connectedHumans.length;
      if (activeHumans === 0 && now - this.lastHumanSeenAt > 90_000) return true;
      return false;
    }
    if (this.status === "ended") {
      return this.connectedHumans.length === 0 || now - (this.match?.endedAt ?? now) > 120_000;
    }
    return this.players.size === 0;
  }
}
