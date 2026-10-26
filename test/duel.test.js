import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";
import { COMBAT, DUEL, MATCH } from "../shared/constants.js";

function fakeSocket() {
  return {
    readyState: 1,
    sent: [],
    send(raw) {
      this.sent.push(JSON.parse(raw));
    },
    close() {
      this.readyState = 3;
    },
  };
}

/** Dua manusia (Alpha tim 0, Bravo tim 1) berhadapan dekat; bot disingkirkan jauh. */
function setupDuel(startAt = 1_000_000) {
  const room = new Room("DUEL1", "online");
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const attacker = room.addHuman({ name: "Alpha", heroId: "bastion", skillLevel: 2, socket: socketA }).player;
  const victim = room.addHuman({ name: "Bravo", heroId: "ember", skillLevel: 2, socket: socketB }).player;
  room.setReady(attacker.id, true, startAt);
  room.setReady(victim.id, true, startAt);
  room.lockHero(attacker.id, startAt);
  room.lockHero(victim.id, startAt);
  room.tick(startAt + MATCH.countdown * 1000 + 50);
  const now = startAt + 20_000;
  for (const player of room.players.values()) {
    player.invulnUntil = 0;
    player.attackCd = 0;
    if (player.bot) {
      player.x = 100;
      player.y = 100;
    }
  }
  attacker.x = 1000;
  attacker.y = 640;
  victim.x = 1100;
  victim.y = 640;
  return { room, attacker, victim, socketA, socketB, now };
}

function startDuel(ctx) {
  const { room, attacker, now } = ctx;
  const ammoBefore = attacker.ammo;
  room.tryBasicAttack(attacker, 1, 0, now);
  const duel = [...room.duels.values()][0];
  assert.ok(duel, "duel harus terbuka");
  assert.equal(attacker.ammo, ammoBefore - 1);
  return duel;
}

const wrongOption = (duel, offset = 1) => (duel.question.answer + offset) % 4;
const lastOfType = (socket, type) => [...socket.sent].reverse().find((message) => message.type === type);

test("serangan dalam jarak serang membuka duel tanpa peluru dan mengirim soal sama ke kedua pihak", () => {
  const ctx = setupDuel();
  const { room, socketA, socketB } = ctx;
  const projectiles = room.projectiles.length;
  const duel = startDuel(ctx);
  assert.equal(room.projectiles.length, projectiles);
  const startA = lastOfType(socketA, "duelStart").duel;
  const startB = lastOfType(socketB, "duelStart").duel;
  assert.equal(startA.id, duel.id);
  assert.equal(startA.prompt, startB.prompt);
  assert.deepEqual(startA.options, startB.options);
  assert.equal(startA.role, "attacker");
  assert.equal(startB.role, "victim");
  assert.equal(startA.endsAt - startA.startedAt, DUEL.duration * 1000);
  assert.equal(startA.correctIndex, undefined, "kunci jawaban tidak boleh dikirim");
});

test("penyerang benar lebih dulu: serangan berhasil, Edge kecil, korban kebal duel sebentar", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, socketA, socketB, now } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  const result = room.answerQuiz(attacker.id, duel.id, duel.question.answer, now + 800);
  assert.deepEqual(result, { accepted: true, correct: true });
  assert.equal(room.projectiles.length, projectiles + 1, "tepat satu peluru, tanpa damage ganda");
  assert.ok(now + 900 < attacker.duelEdgeUntil);
  assert.ok(victim.duelImmuneUntil > now + 800);
  assert.equal(room.duels.size, 0);
  assert.equal(lastOfType(socketA, "duelResult").duel.outcome, "attackerWins");
  assert.equal(lastOfType(socketA, "duelResult").duel.youWon, true);
  assert.equal(lastOfType(socketB, "duelResult").duel.youWon, false);
  assert.equal(victim.duelSlowUntil, 0);
});

test("korban benar lebih dulu: serangan gagal, penyerang Momentum Loss kecil, korban Edge kecil", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, socketB, now } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  room.answerQuiz(victim.id, duel.id, duel.question.answer, now + 700);
  assert.equal(room.projectiles.length, projectiles, "damage batal");
  assert.equal(attacker.duelSlowFactor, DUEL.attackerLossSpeed);
  assert.ok(attacker.duelSlowUntil > now + 700);
  assert.ok(victim.duelEdgeUntil > now + 700);
  assert.equal(lastOfType(socketB, "duelResult").duel.outcome, "victimWins");
  assert.equal(lastOfType(socketB, "duelResult").duel.edge, true);
  assert.equal(attacker.attackCd > 0, true, "cooldown tetap berjalan");
});

test("penyerang salah lalu korban benar: serangan gagal", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  assert.equal(room.answerQuiz(attacker.id, duel.id, wrongOption(duel), now + 500).correct, false);
  assert.equal(room.duels.size, 1, "menunggu korban");
  room.answerQuiz(victim.id, duel.id, duel.question.answer, now + 900);
  assert.equal(room.projectiles.length, projectiles);
  assert.equal(room.duels.size, 0);
});

test("keduanya salah: serangan gagal, korban kena penalti sedang", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  room.answerQuiz(attacker.id, duel.id, wrongOption(duel, 1), now + 400);
  room.answerQuiz(victim.id, duel.id, wrongOption(duel, 2), now + 600);
  assert.equal(room.projectiles.length, projectiles);
  assert.equal(victim.duelSlowFactor, DUEL.victimLossSpeed);
  assert.equal(attacker.duelSlowFactor, DUEL.attackerLossSpeed);
  assert.ok(DUEL.victimLossSpeed < DUEL.attackerLossSpeed, "penalti korban lebih besar dari penyerang");
});

test("tak ada yang menjawab sampai waktu habis: serangan gagal, korban kena penalti sedang", () => {
  const ctx = setupDuel();
  const { room, victim, socketA } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  room.updateDuels(duel.endsAt - 1);
  assert.equal(room.duels.size, 1);
  room.updateDuels(duel.endsAt + 1);
  assert.equal(room.duels.size, 0);
  assert.equal(room.projectiles.length, projectiles);
  assert.equal(victim.duelSlowFactor, DUEL.victimLossSpeed);
  assert.equal(lastOfType(socketA, "duelResult").duel.outcome, "bothFail");
});

test("korban salah lalu penyerang benar: serangan berhasil tetapi korban tetap kena penalti", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  const duel = startDuel(ctx);
  const projectiles = room.projectiles.length;
  room.answerQuiz(victim.id, duel.id, wrongOption(duel), now + 300);
  room.answerQuiz(attacker.id, duel.id, duel.question.answer, now + 900);
  assert.equal(room.projectiles.length, projectiles + 1);
  assert.equal(victim.duelSlowFactor, DUEL.victimLossSpeed);
});

test("jawaban setelah waktu habis, ganda, atau dari pihak luar ditolak", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  const duel = startDuel(ctx);
  const outsider = [...room.players.values()].find((player) => player.bot);
  assert.equal(room.answerQuiz(outsider.id, duel.id, 0, now + 100).reason, "invalid");
  assert.equal(room.answerQuiz(attacker.id, duel.id, 9, now + 100).reason, "option");
  room.answerQuiz(attacker.id, duel.id, wrongOption(duel), now + 200);
  assert.equal(room.answerQuiz(attacker.id, duel.id, duel.question.answer, now + 250).reason, "locked");
  assert.equal(room.answerQuiz(victim.id, duel.id, duel.question.answer, duel.endsAt + 5).reason, "timeout");
  room.updateDuels(duel.endsAt + 10);
  assert.equal(room.answerQuiz(victim.id, duel.id, 0, duel.endsAt + 20).reason, "clash-ended");
});

test("duel tidak terbuka di luar jarak serang atau di luar arah bidik", () => {
  const far = setupDuel();
  far.victim.x = far.attacker.x + DUEL.range + far.victim.radius + 60;
  const before = far.room.projectiles.length;
  far.room.tryBasicAttack(far.attacker, 1, 0, far.now);
  assert.equal(far.room.duels.size, 0);
  assert.equal(far.room.projectiles.length, before + 1, "tembakan jauh tetap serangan biasa");

  const off = setupDuel();
  off.room.tryBasicAttack(off.attacker, -1, 0, off.now);
  assert.equal(off.room.duels.size, 0, "membidik menjauh dari korban");
});

test("duel tidak terbuka melawan rekan satu tim, bot lawan bot, atau korban yang baru kebal", () => {
  const ally = setupDuel();
  const mate = [...ally.room.players.values()].find((player) => player.bot && player.slot === ally.attacker.slot);
  mate.x = 1100;
  mate.y = 640;
  ally.victim.x = 100;
  ally.victim.y = 900;
  ally.room.tryBasicAttack(ally.attacker, 1, 0, ally.now);
  assert.equal(ally.room.duels.size, 0);

  const bots = setupDuel();
  const botA = [...bots.room.players.values()].find((player) => player.bot && player.slot === 0);
  const botB = [...bots.room.players.values()].find((player) => player.bot && player.slot === 1);
  botA.x = 1500;
  botA.y = 300;
  botB.x = 1600;
  botB.y = 300;
  bots.victim.x = 100;
  bots.victim.y = 900;
  bots.room.tryBasicAttack(botA, 1, 0, bots.now);
  assert.equal(bots.room.duels.size, 0);

  const immune = setupDuel();
  immune.victim.duelImmuneUntil = immune.now + 1000;
  const before = immune.room.projectiles.length;
  immune.room.tryBasicAttack(immune.attacker, 1, 0, immune.now);
  assert.equal(immune.room.duels.size, 0);
  assert.equal(immune.room.projectiles.length, before + 1);
});

test("setelah duel, serangan berikutnya pada pasangan sama berjalan normal selama cooldown", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  const duel = startDuel(ctx);
  room.answerQuiz(attacker.id, duel.id, duel.question.answer, now + 500);
  attacker.attackCd = 0;
  const before = room.projectiles.length;
  room.tryBasicAttack(attacker, 1, 0, now + 900);
  assert.equal(room.duels.size, 0, "korban masih kebal duel");
  assert.equal(room.projectiles.length, before + 1);

  victim.duelImmuneUntil = 0;
  attacker.attackCd = 0;
  room.tryBasicAttack(attacker, 1, 0, now + 1200);
  assert.equal(room.duels.size, 0, "cooldown pasangan belum habis");

  attacker.attackCd = 0;
  attacker.ammo = COMBAT.maxAmmo;
  room.tryBasicAttack(attacker, 1, 0, now + 500 + DUEL.pairCooldown * 1000 + 10);
  assert.equal(room.duels.size, 1, "duel baru setelah cooldown");
});

test("penyerang tidak bisa menembak selama duelnya masih berjalan", () => {
  const ctx = setupDuel();
  const { room, attacker, now } = ctx;
  startDuel(ctx);
  attacker.attackCd = 0;
  const ammo = attacker.ammo;
  room.tryBasicAttack(attacker, 1, 0, now + 300);
  assert.equal(attacker.ammo, ammo);
  assert.equal(room.duels.size, 1);
});

test("korban tewas atau terputus saat duel: dibatalkan tanpa penalti dan peluru dikembalikan", () => {
  const died = setupDuel();
  const duelA = startDuel(died);
  const ammoAfter = died.attacker.ammo;
  died.room.killPlayer(died.victim, null, died.now + 200);
  assert.equal(died.room.duels.size, 0);
  assert.equal(died.attacker.ammo, ammoAfter + 1);
  assert.equal(died.attacker.duelSlowUntil, 0);
  assert.equal(lastOfType(died.socketA, "duelResult").duel.outcome, "cancelled");
  assert.ok(duelA.id);

  const gone = setupDuel();
  startDuel(gone);
  gone.room.handleDisconnect(gone.victim.id, gone.now + 200);
  assert.equal(gone.room.duels.size, 0);
  assert.equal(gone.attacker.duelSlowUntil, 0);
  assert.equal(gone.victim.duelSlowUntil, 0);
});

test("bot korban menjawab duel dalam batas waktu dan hasilnya diterapkan", () => {
  const ctx = setupDuel();
  const { room, attacker, victim, now } = ctx;
  victim.bot = true;
  victim.x = 1100;
  const duel = startDuel(ctx);
  assert.ok(duel.plans.victim, "bot punya rencana jawaban");
  assert.ok(duel.plans.victim.at - now <= DUEL.botDelayMax);
  assert.equal(duel.plans.attacker, null, "penyerang manusia tidak diatur bot");
  room.updateDuels(duel.endsAt + 1);
  assert.equal(room.duels.size, 0, "duel selalu selesai");
  assert.ok(attacker.id);
});

test("duel global (Physics Clash) menunda diri sampai duel selesai", () => {
  const ctx = setupDuel();
  const { room, now } = ctx;
  room.match.nextClashAt = now;
  startDuel(ctx);
  room.tick(now + 50);
  assert.equal(room.clash, null, "Physics Clash tidak boleh menimpa duel");
  assert.ok(COMBAT.maxAmmo >= 1);
});
