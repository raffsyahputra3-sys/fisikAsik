import { AudioEngine } from "./audio.js";
import { angleToward, collectHitEvents, hpTone, mergeAlert } from "./combat.js";
import { SHOWCASE_MS } from "./lobbyfx.js";
import { ScreenFx } from "./fx.js";
import { GameInput } from "./input.js";
import { GameClient } from "./net.js";
import { ArenaRenderer, drawHeroPortrait } from "./render.js";
import { ArenaRenderer3D, drawHeroPortrait3D, isWebGLAvailable } from "./render3d.js";

const drawPortrait = isWebGLAvailable() ? drawHeroPortrait3D : drawHeroPortrait;
import { DIFFICULTY_NAMES, HERO_ORDER, MATCH } from "../shared/constants.js";
import { getHero } from "../shared/heroes.js";

const $ = (id) => document.getElementById(id);

const els = {
  serverChip: $("serverChip"),
  serverLabel: $("serverLabel"),
  soundBtn: $("soundBtn"),
  settingsBtn: $("settingsBtn"),
  homeScreen: $("homeScreen"),
  queueScreen: $("queueScreen"),
  roomScreen: $("roomScreen"),
  gameScreen: $("gameScreen"),
  heroPreview: $("heroPreview"),
  showcaseBtn: $("showcaseBtn"),
  heroName: $("heroName"),
  heroRole: $("heroRole"),
  heroTagline: $("heroTagline"),
  heroUltimate: $("heroUltimate"),
  heroStats: $("heroStats"),
  heroPicker: $("heroPicker"),
  nameInput: $("nameInput"),
  skillPicker: $("skillPicker"),
  practiceBtn: $("practiceBtn"),
  quickBtn: $("quickBtn"),
  createRoomBtn: $("createRoomBtn"),
  roomCodeInput: $("roomCodeInput"),
  joinRoomBtn: $("joinRoomBtn"),
  queueText: $("queueText"),
  queueServer: $("queueServer"),
  queueTime: $("queueTime"),
  cancelQueueBtn: $("cancelQueueBtn"),
  roomCode: $("roomCode"),
  copyRoomBtn: $("copyRoomBtn"),
  roomPlayers: $("roomPlayers"),
  roomStatus: $("roomStatus"),
  readyBtn: $("readyBtn"),
  leaveRoomBtn: $("leaveRoomBtn"),
  gameCanvas: $("gameCanvas"),
  selfName: $("selfName"),
  selfLevel: $("selfLevel"),
  selfHealth: $("selfHealth"),
  selfShield: $("selfShield"),
  selfStats: $("selfStats"),
  selfStatus: $("selfStatus"),
  enemyName: $("enemyName"),
  enemyLevel: $("enemyLevel"),
  enemyHealth: $("enemyHealth"),
  enemyShield: $("enemyShield"),
  enemyStats: $("enemyStats"),
  enemyStatus: $("enemyStatus"),
  matchTimer: $("matchTimer"),
  objectiveStatus: $("objectiveStatus"),
  nextClash: $("nextClash"),
  towerStatusBlue: $("towerStatusBlue"),
  towerStatusRed: $("towerStatusRed"),
  matchLevel: $("matchLevel"),
  eventFeed: $("eventFeed"),
  respawnBanner: $("respawnBanner"),
  clashOverlay: $("clashOverlay"),
  duelCard: $("duelCard"),
  combatAlerts: $("combatAlerts"),
  hitVignette: $("hitVignette"),
  hitDir: $("hitDir"),
  selfTrack: $("selfTrack"),
  selfGhost: $("selfGhost"),
  selfHpText: $("selfHpText"),
  selfPanel: $("selfPanel"),
  enemyTrack: $("enemyTrack"),
  enemyGhost: $("enemyGhost"),
  enemyHpText: $("enemyHpText"),
  duelRole: $("duelRole"),
  duelCategory: $("duelCategory"),
  duelTimer: $("duelTimer"),
  duelTimerFill: $("duelTimerFill"),
  duelPrompt: $("duelPrompt"),
  duelOptions: $("duelOptions"),
  duelResult: $("duelResult"),
  duelResultTitle: $("duelResultTitle"),
  duelExplanation: $("duelExplanation"),
  clashCategory: $("clashCategory"),
  clashTimer: $("clashTimer"),
  clashTimerFill: $("clashTimerFill"),
  clashPrompt: $("clashPrompt"),
  clashOptions: $("clashOptions"),
  clashSelfStatus: $("clashSelfStatus"),
  clashEnemyStatus: $("clashEnemyStatus"),
  clashResult: $("clashResult"),
  clashResultTitle: $("clashResultTitle"),
  clashExplanation: $("clashExplanation"),
  movePad: $("movePad"),
  moveKnob: $("moveKnob"),
  playerStatusChips: $("playerStatusChips"),
  ammoPips: $("ammoPips"),
  superBtn: $("superBtn"),
  gameNotice: $("gameNotice"),
  resultOverlay: $("resultOverlay"),
  resultKicker: $("resultKicker"),
  resultTitle: $("resultTitle"),
  resultSubtitle: $("resultSubtitle"),
  resultStats: $("resultStats"),
  resultHero: $("resultHero"),
  playAgainBtn: $("playAgainBtn"),
  backHomeBtn: $("backHomeBtn"),
  reconnectOverlay: $("reconnectOverlay"),
  reconnectText: $("reconnectText"),
  retryReconnectBtn: $("retryReconnectBtn"),
  abandonBtn: $("abandonBtn"),
  settingsModal: $("settingsModal"),
  serverInput: $("serverInput"),
  audioToggle: $("audioToggle"),
  saveServerBtn: $("saveServerBtn"),
  rotateHint: $("rotateHint"),
  closeSettingsBtn: $("closeSettingsBtn"),
  toastStack: $("toastStack"),
  bootOverlay: $("bootOverlay"),
  bootStatus: $("bootStatus"),
  bgCanvas: $("bgCanvas"),
  roomModeBtn: $("roomModeBtn"),
  modeTabs: $("modeTabs"),
  roomPanel: $("roomPanel"),
  playBtn: $("playBtn"),
  playMain: $("playMain"),
  playSub: $("playSub"),
  modeHint: $("modeHint"),
  skillPill: $("skillPill"),
  fullscreenBtn: $("fullscreenBtn"),
  selectScreen: $("selectScreen"),
  loadingScreen: $("loadingScreen"),
  selectTitle: $("selectTitle"),
  selectTimer: $("selectTimer"),
  selectRing: $("selectRing"),
  selectAllies: $("selectAllies"),
  selectEnemies: $("selectEnemies"),
  selectGrid: $("selectGrid"),
  selectDetail: $("selectDetail"),
  roleFilter: $("roleFilter"),
  lockBtn: $("lockBtn"),
  loadAllies: $("loadAllies"),
  loadEnemies: $("loadEnemies"),
  loadTip: $("loadTip"),
  loadFill: $("loadFill"),
  loadStep: $("loadStep"),
  teamPanel: $("teamPanel"),
  scoreBlue: $("scoreBlue"),
  scoreRed: $("scoreRed"),
  menuBtn: $("menuBtn"),
  resultBoard: $("resultBoard"),
  mvpName: $("mvpName"),
  mvpStats: $("mvpStats"),
  leaveMatchBtn: $("leaveMatchBtn"),
  autoAimToggle: $("autoAimToggle"),
  fxGrade: $("fxGrade"),
  fxFlash: $("fxFlash"),
  fxScare: $("fxScare"),
  fxLevelSeg: $("fxLevelSeg"),
  fxTierSeg: $("fxTierSeg"),
  fxFlashToggle: $("fxFlashToggle"),
  fxScareToggle: $("fxScareToggle"),
  fxShakeToggle: $("fxShakeToggle"),
  fxShakeRange: $("fxShakeRange"),
  fxPreviewBtn: $("fxPreviewBtn"),
  settingsDialog: document.querySelector(".settings-dialog"),
  cancelZone: $("cancelZone"),
  minimapSlot: $("minimapSlot"),
};

const PROFILE_KEY = "logicodix.profile";
const SKILL_NAMES = ["pemula", "menengah", "mahir"];
const STATUS_LABELS = {
  waiting: "MENUNGGU",
  locked: "TERKUNCI",
  correct: "BENAR",
  wrong: "SALAH",
};
const ACK_ERRORS = {
  timeout: "Waktu Clash sudah habis.",
  locked: "Kamu sudah menjawab Clash ini.",
  "clash-ended": "Clash ini sudah selesai.",
  option: "Pilihan jawaban tidak valid.",
  invalid: "Jawaban tidak dapat diproses.",
};

const audio = new AudioEngine();
const screenFx = new ScreenFx({
  grade: els.fxGrade,
  flash: els.fxFlash,
  scare: els.fxScare,
  audio,
  onTierChange: (tier) => toast(`Efek diturunkan ke kualitas ${tier} agar tetap lancar.`, ""),
});
function createRenderer(canvas) {
  if (isWebGLAvailable()) {
    try {
      return new ArenaRenderer3D(canvas);
    } catch (error) {
      console.warn("Renderer 3D gagal, memakai 2D:", error);
    }
  }
  return new ArenaRenderer(canvas);
}

const renderer = createRenderer(els.gameCanvas);
const input = new GameInput({
  canvas: els.gameCanvas,
  movePad: els.movePad,
  moveKnob: els.moveKnob,
  abilityButtons: [...document.querySelectorAll(".ability")],
  screenToWorld: (x, y) => renderer.screenToWorld(x, y),
  onAction: handleAction,
  getSelf: () => selfPlayer(),
  getAutoTarget: () => autoTarget(),
  isAutoAim: () => ui.autoAim,
});

const ui = {
  screen: "home",
  heroId: "bastion",
  skill: "menengah",
  session: null,
  selfId: null,
  selfSlot: 0,
  selfIndex: 0,
  roomMode: "online",
  lobby: null,
  state: null,
  matchResult: null,
  activeClash: null,
  activeDuel: null,
  showcaseAt: null,
  hitSeen: new Map(),
  hitPrimed: false,
  alerts: { in: null, out: null },
  alertTimers: { in: 0, out: 0 },
  lastHitSound: 0,
  wasCritical: false,
  answered: false,
  selectedOption: null,
  queueStartedAt: 0,
  serverOffset: 0,
  lastShootAt: 0,
  lastFeedKey: "",
  pendingRematch: null,
  booted: false,
  resultVisible: false,
  noticeTimer: null,
  offlineNotified: false,
  mode: "practice",
  autoAim: true,
  touch: false,
  pickDirty: false,
  roleFilter: "Semua",
  mvpHeroId: null,
  pings: [],
};

let client = null;

function upper(value) {
  return String(value ?? "").toUpperCase();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function formatClock(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatShort(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function serverNow() {
  return Date.now() + ui.serverOffset;
}

function skillName(level) {
  return SKILL_NAMES[Math.max(0, Math.min(2, Number(level) - 1))] ?? "menengah";
}

function currentProfile() {
  const name = els.nameInput.value.replace(/\s+/g, " ").trim().slice(0, 14) || "Pilot";
  return { name, heroId: ui.heroId, skillLevel: ui.skill };
}

function saveProfile() {
  try {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ name: els.nameInput.value.trim().slice(0, 14), ...currentProfile() }),
    );
  } catch {
    // Storage can be unavailable in restricted contexts.
  }
}

function loadProfile() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    saved = null;
  }
  if (saved && typeof saved === "object") {
    if (typeof saved.name === "string") els.nameInput.value = saved.name.slice(0, 14);
    if (HERO_ORDER.includes(saved.heroId)) ui.heroId = saved.heroId;
    if (SKILL_NAMES.includes(saved.skillLevel)) ui.skill = saved.skillLevel;
  }
  for (const button of els.skillPicker.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.skill === ui.skill);
  }
}

function toast(text, tone = "") {
  if (!text) return;
  const element = document.createElement("div");
  element.className = `toast ${tone}`.trim();
  element.textContent = text;
  els.toastStack.append(element);
  window.setTimeout(() => {
    element.style.opacity = "0";
    element.style.transform = "translateX(18px)";
    element.style.transition = "opacity .22s ease, transform .22s ease";
    window.setTimeout(() => element.remove(), 240);
  }, 3600);
}

function showNotice(text, duration = 1800) {
  window.clearTimeout(ui.noticeTimer);
  els.gameNotice.textContent = text;
  els.gameNotice.classList.remove("hidden");
  ui.noticeTimer = window.setTimeout(() => els.gameNotice.classList.add("hidden"), duration);
}

function showScreen(name) {
  ui.screen = name;
  for (const screen of document.querySelectorAll(".screen")) screen.classList.remove("active");
  const target = {
    home: els.homeScreen,
    queue: els.queueScreen,
    room: els.roomScreen,
    select: els.selectScreen,
    loading: els.loadingScreen,
    game: els.gameScreen,
  }[name];
  target?.classList.add("active");
  document.body.dataset.screen = name;
  document.body.classList.toggle("in-match", name === "game");
  if (name === "game") renderer.resize();
  setWakeLock(name === "game");
  updateInputEnabled();
}

function updateInputEnabled() {
  const playing = ui.signalPlaying();
  input.setEnabled(ui.screen === "game" && playing);
}

ui.signalPlaying = function signalPlaying() {
  return Boolean(ui.state && ui.state.status === "playing" && !ui.matchResult);
};

function setServerStatus(status, info = {}) {
  const chip = els.serverChip;
  chip.classList.toggle("online", status === "online");
  chip.classList.toggle("offline", status === "offline");
  if (status === "online") {
    els.serverLabel.textContent = "TERHUBUNG";
    chip.title = info.url || client?.url || "Terhubung";
  } else if (status === "connecting") {
    els.serverLabel.textContent = "MENGHUBUNGKAN";
    chip.title = info.url || "Menghubungkan";
  } else {
    els.serverLabel.textContent = "OFFLINE";
    chip.title = info.error || "Server tidak terjangkau";
  }
}

function finishBoot(message) {
  if (message) els.bootStatus.textContent = message;
  if (ui.booted) return;
  ui.booted = true;
  window.setTimeout(() => els.bootOverlay.classList.add("done"), 420);
}

function handleStatus(status, info = {}) {
  setServerStatus(status, info);
  if (status === "online") {
    finishBoot("Server terhubung.");
    if (ui.session) els.reconnectText.textContent = "Koneksi pulih. Memulihkan sesi...";
    hideReconnect();
    return;
  }
  if (status === "connecting") {
    els.bootStatus.textContent = `Menghubungkan ke ${info.url || client?.url || "server"}...`;
    return;
  }
  ui.offlineNotified = false;
  if (!ui.session && ui.screen !== "game") {
    els.bootStatus.textContent = "Server tidak terjangkau. Mencoba lagi...";
    finishBoot("Mode offline. Buka pengaturan untuk mengganti server.");
    return;
  }
  window.setTimeout(() => {
    if (ui.session || ui.screen === "game") {
      showReconnect(info);
    }
  }, 500);
  if (ui.screen === "queue") {
    els.queueText.textContent = "Koneksi terputus. Mencoba menyambung ulang...";
  }
}

function showReconnect(info = {}) {
  const attempt = Number.isFinite(info.attempt) ? info.attempt + 1 : null;
  els.reconnectText.textContent = attempt
    ? `Slotmu dikendalikan AI sementara. Upaya reconnect ke-${attempt} sedang berjalan.`
    : "Slotmu dikendalikan AI sementara. Kami mencoba memulihkan kendali.";
  const wasHidden = els.reconnectOverlay.classList.contains("hidden");
  els.reconnectOverlay.classList.remove("hidden");
  if (wasHidden && !ui.offlineNotified) {
    ui.offlineNotified = true;
    toast("Koneksi terputus. AI takeover aktif.", "bad");
  }
}

function hideReconnect() {
  els.reconnectOverlay.classList.add("hidden");
}

function handleMessage(message) {
  if (!message || typeof message.type !== "string") return;
  if (Number.isFinite(message.serverTime)) {
    ui.serverOffset = message.serverTime - Date.now();
  }

  switch (message.type) {
    case "connected":
      els.bootStatus.textContent = "Server siap.";
      finishBoot("Server terhubung. Menyiapkan arena...");
      break;
    case "welcome":
      handleWelcome(message);
      break;
    case "lobby":
      handleLobby(message);
      break;
    case "queueStatus":
      handleQueueStatus(message);
      break;
    case "matchStart":
      handleMatchStart(message);
      break;
    case "state":
      handleState(message);
      break;
    case "clashStart":
      if (message.clash) syncClash(message.clash);
      break;
    case "clashResult":
      if (message.clash) syncClash(message.clash);
      break;
    case "duelStart":
      if (message.duel) showDuel(message.duel);
      break;
    case "duelResult":
      if (message.duel) showDuelResult(message.duel);
      break;
    case "quizAck":
      handleQuizAck(message);
      break;
    case "matchEnd":
      handleMatchEnd(message);
      break;
    case "signal":
      handlePing(message);
      break;
    case "presence":
      toast(message.text, "bad");
      showNotice(message.text, 2600);
      break;
    case "toast":
      toast(message.text, message.tone === "bad" ? "bad" : "good");
      break;
    case "error":
      handleError(message.message);
      break;
    case "left":
      handleLeft();
      break;
    case "pong":
      break;
    default:
      break;
  }
}

function handleWelcome(message) {
  ui.selfId = message.playerId;
  ui.selfSlot = Number.isInteger(message.slot) ? message.slot : 0;
  ui.selfIndex = Number.isInteger(message.index) ? message.index : ui.selfSlot * 3;
  ui.roomMode = message.mode === "practice" ? "practice" : "online";
  ui.session = { token: message.token, roomCode: message.roomCode };
  client.setSession(ui.session);
  renderer.setSelf(ui.selfId);
  hideReconnect();
  if (message.resumed) {
    toast("Sesi dipulihkan.", "good");
    return;
  }
  ui.lobby = null;
  ui.matchResult = null;
  ui.pickDirty = false;
  els.resultOverlay.classList.add("hidden");
  ui.resultVisible = false;
  // latihan langsung masuk pilih hero; room privat menunggu di layar room
  if (ui.roomMode !== "practice") showScreen("room");
}

function handleLobby(message) {
  ui.lobby = message;
  ui.roomMode = message.mode === "practice" ? "practice" : "online";
  if (message.you) ui.selfId = message.you;
  if (message.levelName) updateMatchLevel(message.levelName);
  if (ui.screen === "game" && ui.matchResult) return;
  const own = message.players?.find((player) => player.id === ui.selfId);
  if (own) {
    ui.selfSlot = own.slot;
    ui.selfIndex = own.index;
  }
  if (message.status === "lobby") {
    if (ui.screen !== "room" && ui.screen !== "game") showScreen("room");
    updateRoomUI();
  } else if (message.status === "select") {
    if (ui.screen !== "select") enterSelect();
    renderSelect();
  } else if (message.status === "countdown") {
    if (ui.screen !== "loading") enterLoading();
    renderLoading();
  } else if (message.status === "playing" && ui.screen !== "game") {
    enterGame();
  }
}

function handleQueueStatus(message) {
  if (message.waiting) {
    if (ui.screen !== "queue" && ui.screen !== "game") {
      ui.queueStartedAt = Date.now();
      els.queueText.textContent = message.text || "Mencari lawan online...";
      els.queueServer.textContent = client?.url || "SERVER";
      showScreen("queue");
    }
    if (Number.isFinite(message.position) && message.position > 1) {
      els.queueText.textContent = `Menunggu lawan... (antrean ${message.position})`;
    }
    return;
  }
  if (ui.screen === "queue") showScreen("home");
}

function handleMatchStart(message) {
  ui.matchResult = null;
  ui.lobby = null;
  ui.resultVisible = false;
  els.resultOverlay.classList.add("hidden");
  if (message.levelName) updateMatchLevel(message.levelName);
  enterGame();
  showNotice("MATCH DIMULAI", 1500);
}

function enterGame() {
  showScreen("game");
  bodyInMatch(true);
  renderer.resize();
  updateInputEnabled();
}

function bodyInMatch(enabled) {
  document.body.classList.toggle("in-match", enabled);
}

function handleState(message) {
  ui.state = message;
  if (message.you) ui.selfId = message.you;
  const self = selfPlayer(message);
  if (self) {
    ui.selfSlot = self.slot;
    ui.selfIndex = self.index;
  }
  if (message.levelName) updateMatchLevel(message.levelName);
  renderer.setSelf(ui.selfId);
  renderer.setState(message);
  if (message.status === "ended" && !ui.matchResult) {
    toast("Pertandingan sudah berakhir.", "");
    backHome();
    return;
  }
  if (message.status === "playing" && ui.screen !== "game") enterGame();
  updateInputEnabled();
  updateHud(message);
  triggerUltimateFx(message);
  handleCombatEvents(message);
  if (message.clash) syncClash(message.clash);
  else hideClash();
}

// ---------------------------------------------------------------- notifikasi serangan

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function clearCombatAlerts() {
  for (const dir of ["in", "out"]) {
    window.clearTimeout(ui.alertTimers[dir]);
    ui.alerts[dir] = null;
  }
  els.combatAlerts.replaceChildren();
}

/** Strip notifikasi di atas panel HP sendiri; serangan beruntun dijumlahkan, bukan ditumpuk. */
function showCombatAlert(event) {
  const dir = event.dir;
  const alert = mergeAlert(ui.alerts[dir], event, performance.now());
  ui.alerts[dir] = alert;
  let node = els.combatAlerts.querySelector(`.combat-alert.${dir}`);
  if (!node) {
    node = document.createElement("div");
    node.className = `combat-alert ${dir}`;
    node.append(document.createElement("span"), document.createElement("b"), document.createElement("span"));
    node.lastChild.className = "alert-hits";
    if (dir === "in") els.combatAlerts.prepend(node);
    else els.combatAlerts.append(node);
  }
  node.classList.remove("leaving");
  node.children[0].textContent = alert.label;
  node.children[1].textContent = `-${Math.round(alert.amount)}`;
  node.children[2].textContent = alert.hits > 1 ? `x${alert.hits}` : "";
  window.clearTimeout(ui.alertTimers[dir]);
  ui.alertTimers[dir] = window.setTimeout(() => {
    node.classList.add("leaving");
    ui.alertTimers[dir] = window.setTimeout(() => {
      node.remove();
      ui.alerts[dir] = null;
    }, 260);
  }, 1500);
}

function handleCombatEvents(state) {
  if (!state?.players) return;
  const selfId = state.you ?? ui.selfId;
  const prime = !ui.hitPrimed;
  ui.hitPrimed = true;
  for (const event of collectHitEvents(state.players, ui.hitSeen, selfId, { prime })) {
    showCombatAlert(event);
    if (event.dir === "in") {
      restartAnimation(els.hitVignette, "on");
      const self = state.players.find((player) => player.id === selfId);
      if (self && event.source) {
        // renderer 3D: arah dihitung lewat kamera dan berpusat di hero; 2D: arah dunia dari tengah layar
        const bearing = renderer.screenBearing?.(self, event.source);
        const angle = bearing ? bearing.angle : angleToward(self, event.source);
        els.hitDir.style.left = bearing ? `${bearing.origin.x}px` : "50%";
        els.hitDir.style.top = bearing ? `${bearing.origin.y}px` : "50%";
        els.hitDir.style.transform = `rotate(${angle}rad)`;
        restartAnimation(els.hitDir, "on");
      }
      const now = performance.now();
      if (now - ui.lastHitSound > 160) {
        ui.lastHitSound = now;
        audio.hit();
      }
      renderer.addFloater?.({ targetId: selfId, text: `-${event.hit.amount}`, color: "#ff8aa0" });
    } else {
      renderer.addFloater?.({ targetId: event.target.id, text: `-${event.hit.amount}`, color: "#ffe36d" });
    }
  }
  // peringatan sekali saat HP turun ke zona kritis
  const self = state.players.find((player) => player.id === selfId);
  if (self) {
    const critical = self.alive && self.hp / Math.max(1, self.maxHp) <= 0.3;
    if (critical && !ui.wasCritical) toast("HP KRITIS! Mundur atau cari perlindungan.", "bad");
    ui.wasCritical = critical;
  }
}

// Ultimate sendiri (Super turun tajam) memicu efek layar; ultimate lawan tidak, demi keterbacaan.
function triggerUltimateFx(state) {
  const self = selfPlayer(state);
  if (!self) return;
  const previous = ui.prevSuper;
  ui.prevSuper = self.super;
  if (previous !== undefined && self.alive && self.super < previous - 40) {
    screenFx.trigger(self.heroId, { shakeTarget: els.gameCanvas });
  }
}

function selfPlayer(state = ui.state) {
  if (!state || !Array.isArray(state.players)) return null;
  return state.players.find((player) => player.id === (state.you ?? ui.selfId)) ?? null;
}

// Lawan yang ditampilkan di HUD: musuh hidup terdekat dari hero kita.
function enemyPlayer(state = ui.state) {
  if (!state || !Array.isArray(state.players)) return null;
  const self = selfPlayer(state);
  const enemies = state.players.filter((player) => (self ? player.slot !== self.slot : player.id !== state.you));
  if (!self) return enemies[0] ?? null;
  const alive = enemies.filter((player) => player.alive);
  const pool = alive.length ? alive : enemies;
  let best = null;
  let bestDistance = Infinity;
  for (const player of pool) {
    const distance = Math.hypot(player.x - self.x, player.y - self.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = player;
    }
  }
  return best;
}

function handleQuizAck(message) {
  if (String(message.clashId ?? "").startsWith("duel-")) {
    handleDuelAck(message);
    return;
  }
  if (!message.accepted) {
    ui.answered = false;
    ui.selectedOption = null;
    if (ui.activeClash) {
      ui.activeClash.answerStatus[ui.selfIndex] = "waiting";
      updateClash(ui.activeClash);
    }
    toast(ACK_ERRORS[message.reason] || "Jawaban ditolak server.", "bad");
    return;
  }
  if (message.correct) {
    audio.correct();
    if (ui.activeClash) {
      ui.activeClash.answerStatus[ui.selfIndex] = "correct";
      updateClash(ui.activeClash);
    }
  } else {
    audio.wrong();
    toast("Jawaban salah. Momentum Loss aktif.", "bad");
    if (ui.activeClash) {
      ui.activeClash.answerStatus[ui.selfIndex] = "locked";
      updateClash(ui.activeClash);
    }
  }
}

function handleMatchEnd(message) {
  ui.matchResult = message;
  input.setEnabled(false);
  hideClash();
  hideDuel();
  const self = Array.isArray(message.players)
    ? message.players.find((player) => player.id === ui.selfId)
    : null;
  if (self) ui.selfSlot = self.slot;
  showResult(message);
}

function handlePing(message) {
  ui.pings = ui.pings.filter((ping) => ping.expires > performance.now());
  ui.pings.push({ ...message, expires: performance.now() + 6000 });
  renderer.setPings?.(ui.pings);
  showNotice(`${message.name}: ${message.kind === "danger" ? "Bahaya!" : "Ayo ke sini!"}`, 1500);
  audio.click();
}

/** Ketuk minimap = "Ayo ke sini"; tekan lama = "Bahaya". Dikirim ke rekan satu tim. */
function bindMinimapPings() {
  const slot = els.minimapSlot;
  if (!slot) return;
  let pressedAt = 0;
  slot.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pressedAt = performance.now();
  });
  slot.addEventListener("pointerup", (event) => {
    if (!pressedAt || ui.screen !== "game") return;
    const held = performance.now() - pressedAt;
    pressedAt = 0;
    const point = renderer.minimapToWorld?.(event.clientX, event.clientY);
    if (!point) return;
    const sent = client?.send({
      type: "signal",
      kind: held > 450 ? "danger" : "go",
      x: Math.round(point.x),
      y: Math.round(point.y),
    });
    if (!sent) toast("Tidak terhubung ke server.", "bad");
  });
  slot.addEventListener("pointercancel", () => {
    pressedAt = 0;
  });
}

function handleError(message) {
  toast(message, "bad");
  if (ui.screen === "select") {
    // pilihan ditolak server: kembalikan tampilan ke hero yang sebenarnya
    ui.pickDirty = false;
    renderSelect();
  }
  if (/sesi reconnect|sesi tidak|room sudah tidak|kedaluwarsa/i.test(message)) {
    client.clearSession();
    ui.session = null;
    hideReconnect();
    if (ui.screen === "game") resetMatchUI();
    showScreen("home");
  }
}

function handleLeft() {
  const rematch = ui.pendingRematch;
  ui.pendingRematch = null;
  client.clearSession();
  ui.session = null;
  resetMatchUI();
  if (rematch === "practice") {
    sendPractice();
    return;
  }
  if (rematch === "quick") {
    startQueue();
    return;
  }
  showScreen("home");
}

function resetMatchUI() {
  ui.prevSuper = undefined;
  ui.hitSeen = new Map();
  ui.hitPrimed = false;
  ui.wasCritical = false;
  clearCombatAlerts();
  ui.state = null;
  ui.matchResult = null;
  ui.lobby = null;
  ui.resultVisible = false;
  ui.activeClash = null;
  ui.answered = false;
  ui.selectedOption = null;
  ui.lastFeedKey = "";
  hideClash();
  hideDuel();
  els.resultOverlay.classList.add("hidden");
  els.reconnectOverlay.classList.add("hidden");
  els.eventFeed.replaceChildren();
  els.playerStatusChips.replaceChildren();
  els.clashOptions.replaceChildren();
  els.respawnBanner.classList.add("hidden");
  els.gameNotice.classList.add("hidden");
  bodyInMatch(false);
  renderer.setSelf(null);
  input.setEnabled(false);
}

function updateMatchLevel(levelName) {
  const label = DIFFICULTY_NAMES[levelName] ?? upper(levelName) ?? "MENENGAH";
  els.matchLevel.textContent = `FISIKA ${upper(label)}`;
}

function updateHud(state) {
  const self = selfPlayer(state);
  const enemy = enemyPlayer(state);
  if (self) {
    els.selfName.textContent = self.name;
    els.selfLevel.textContent = `LV ${self.level}`;
    const hpRatio = clamp01(self.hp / Math.max(1, self.maxHp));
    els.selfHealth.style.width = `${hpRatio * 100}%`;
    els.selfGhost.style.width = `${hpRatio * 100}%`;
    els.selfShield.style.width = `${clamp01(self.shield / Math.max(1, self.maxHp)) * 100}%`;
    els.selfHpText.textContent = `${Math.max(0, Math.ceil(self.hp))} / ${self.maxHp}`;
    els.selfTrack.dataset.tone = self.alive ? hpTone(hpRatio) : "ok";
    els.selfPanel.classList.toggle("low", self.alive && hpRatio <= 0.3);
    els.selfStats.textContent = `${self.stats.kills} KO / ${self.stats.deaths} MATI`;
    els.selfStatus.textContent = self.alive
      ? self.edge
        ? `EDGE ${Math.ceil(self.edgeRemaining / 1000)}s`
        : self.slowed
          ? "MOMENTUM LOSS"
          : "SIAP"
      : `RESPAWN ${Math.ceil(self.respawnIn / 1000)}`;
    updateAbilities(self);
    updateStatusChips(self);
    if (!self.alive) {
      els.respawnBanner.textContent = `RESPAWN ${Math.max(1, Math.ceil(self.respawnIn / 1000))}`;
      els.respawnBanner.classList.remove("hidden");
    } else {
      els.respawnBanner.classList.add("hidden");
    }
    const enemyNexus = state.nexuses?.find((nexus) => nexus.team !== self.slot);
    const enemyTowersLeft = state.towers?.filter((tower) => tower.team !== self.slot && tower.alive).length ?? 0;
    els.objectiveStatus.textContent =
      enemyNexus && !enemyNexus.protected
        ? "SERANG NEXUS LAWAN"
        : `HANCURKAN MENARA (${enemyTowersLeft} TERSISA)`;
  }

  if (enemy) {
    els.enemyName.textContent = enemy.name;
    els.enemyLevel.textContent = `LV ${enemy.level}`;
    const hpRatio = clamp01(enemy.hp / Math.max(1, enemy.maxHp));
    els.enemyHealth.style.width = `${hpRatio * 100}%`;
    els.enemyGhost.style.width = `${hpRatio * 100}%`;
    els.enemyShield.style.width = `${clamp01(enemy.shield / Math.max(1, enemy.maxHp)) * 100}%`;
    els.enemyHpText.textContent = `${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}`;
    els.enemyStats.textContent = `${enemy.stats.kills} KO / ${enemy.stats.deaths} MATI`;
    els.enemyStatus.textContent = enemy.bot
      ? "AI TAKEOVER"
      : enemy.connected
        ? "ONLINE"
        : "TERPUTUS";
    els.enemyStatus.style.color = enemy.bot ? "var(--good)" : "";
  }

  updateTeamPanel(state);
  const kills = [0, 0];
  for (const player of state.players ?? []) kills[player.slot] += player.stats?.kills ?? 0;
  els.scoreBlue.textContent = String(kills[0]);
  els.scoreRed.textContent = String(kills[1]);

  els.matchTimer.textContent = formatClock(state.timeLeft ?? MATCH.duration);

  if (state.clash) {
    els.nextClash.textContent = "CLASH AKTIF";
    els.nextClash.classList.add("urgent");
  } else if (Number.isFinite(state.nextClashIn)) {
    els.nextClash.textContent = `CLASH ${formatShort(state.nextClashIn)}`;
    els.nextClash.classList.toggle("urgent", state.nextClashIn <= 5);
  } else {
    els.nextClash.textContent = `CLASH ${state.clashCount ?? 0}`;
    els.nextClash.classList.remove("urgent");
  }

  updateTower(els.towerStatusBlue, teamTowers(state, 0), "MUARO JAMBI");
  updateTower(els.towerStatusRed, teamTowers(state, 1), "KOTAGEDE");

  renderFeed(state.feed ?? []);
}

function teamTowers(state, team) {
  const towers = state.towers?.filter((tower) => tower.team === team) ?? [];
  return { alive: towers.filter((tower) => tower.alive).length, total: towers.length };
}

function updateTower(element, summary, teamName) {
  const pip = element.parentElement?.querySelector(".tower-pip");
  if (!summary || summary.total === 0) {
    element.textContent = `MENARA ${teamName}`;
    pip?.classList.remove("down");
    return;
  }
  element.textContent = `MENARA ${teamName} ${summary.alive}/${summary.total}`;
  pip?.classList.toggle("down", summary.alive === 0);
}

function renderFeed(feed) {
  const key = feed.map((item) => item.id).join("|");
  if (key === ui.lastFeedKey) return;
  ui.lastFeedKey = key;
  const fragment = document.createDocumentFragment();
  for (const item of feed) {
    const element = document.createElement("div");
    const tone =
      item.team === null || item.team === undefined
        ? ""
        : item.team === ui.selfSlot
          ? "blue"
          : "red";
    element.className = `feed-item ${tone}`.trim();
    element.textContent = item.text;
    fragment.append(element);
  }
  els.eventFeed.replaceChildren(fragment);
}

function updateAbilities(self) {
  const hero = getHero(self.heroId);
  setCooldown("dash", self.dashCd, hero.dashCooldown);
  setCooldown("shock", self.shockCd, hero.shockCooldown);
  const superCharge = clamp01(self.super / 100);
  els.superBtn.style.setProperty("--charge", String(Math.round(superCharge * 100)));
  els.superBtn.classList.toggle("ready", self.super >= 100);
  const superLabel = els.superBtn.querySelector(".super-ready-label");
  if (superLabel) superLabel.textContent = self.insight > 0 ? "EMPOWERED" : "SUPER";
  const pips = [...els.ammoPips.querySelectorAll("i")];
  pips.forEach((pip, index) => pip.classList.toggle("full", index < self.ammo));
}

function setCooldown(ability, remaining, total) {
  const button = document.querySelector(`.ability[data-ability="${ability}"]`);
  if (!button) return;
  const mask = button.querySelector(".cooldown-mask");
  const text = button.querySelector(".cooldown-text");
  const ratio = total > 0 ? clamp01(remaining / total) : 0;
  if (mask) {
    mask.style.setProperty("--cd", String(Math.round(ratio * 100)));
    mask.classList.toggle("active", remaining > 0);
  }
  if (text) text.textContent = remaining > 0.05 ? String(Math.ceil(remaining)) : "";
}

function updateStatusChips(self) {
  const chips = [];
  if (self.edge) chips.push(["edge", `PHYSICS EDGE ${Math.ceil(self.edgeRemaining / 1000)}s`]);
  if (self.duelEdge) chips.push(["edge", `EDGE KECIL ${Math.ceil(self.duelEdgeRemaining / 1000)}s`]);
  if (self.slowed) chips.push(["slow", `MOMENTUM LOSS ${Math.ceil(self.slowRemaining / 1000)}s`]);
  if (self.insight > 0) chips.push(["insight", `INSIGHT x${self.insight}`]);
  if (self.shielded) chips.push(["", `SHIELD ${Math.round(self.shield)}`]);
  if (self.reflect) chips.push(["insight", "REFLECT"]);
  if (chips.length === 0) chips.push(["", "MOMENTUM STABIL"]);
  els.playerStatusChips.replaceChildren(
    ...chips.map(([className, text]) => {
      const chip = document.createElement("span");
      chip.className = `status-chip ${className}`.trim();
      chip.textContent = text;
      return chip;
    }),
  );
}

function syncClash(clash) {
  if (!clash) {
    hideClash();
    return;
  }
  const isNew = !ui.activeClash || ui.activeClash.id !== clash.id;
  ui.activeClash = { ...clash, answerStatus: { ...(clash.answerStatus ?? {}) } };
  if (isNew) {
    ui.answered = (clash.answerStatus?.[ui.selfIndex] ?? "waiting") !== "waiting";
    ui.selectedOption = null;
    populateClash(clash);
    els.clashOverlay.classList.remove("hidden");
    if (clash.phase === "active") audio.clashStart();
  }
  updateClash(ui.activeClash);
}

function populateClash(clash) {
  els.clashPrompt.textContent = clash.prompt;
  els.clashCategory.textContent = upper(clash.category);
  const fragment = document.createDocumentFragment();
  clash.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "clash-option";
    button.dataset.index = String(index);
    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = String(index + 1);
    const label = document.createElement("span");
    label.textContent = option;
    button.append(key, label);
    button.addEventListener("click", () => answerClash(index));
    fragment.append(button);
  });
  els.clashOptions.replaceChildren(fragment);
}

function updateClash(clash) {
  els.clashPrompt.textContent = clash.prompt;
  els.clashCategory.textContent = upper(clash.category);
  const selfStatus = clash.answerStatus?.[ui.selfIndex] ?? "waiting";
  const rivals = Object.entries(clash.answerStatus ?? {}).filter(([index]) => Math.floor(Number(index) / 3) !== ui.selfSlot);
  const rivalsDone = rivals.filter(([, status]) => status !== "waiting").length;
  const mates = Object.entries(clash.answerStatus ?? {}).filter(
    ([index]) => Math.floor(Number(index) / 3) === ui.selfSlot && Number(index) !== ui.selfIndex,
  );
  const matesDone = mates.filter(([, status]) => status !== "waiting").length;
  els.clashSelfStatus.textContent = `KAMU: ${STATUS_LABELS[selfStatus] ?? upper(selfStatus)}`;
  els.clashEnemyStatus.textContent = `LAWAN: ${rivalsDone}/${rivals.length} MENJAWAB · REKAN: ${matesDone}/${mates.length}`;

  const active = clash.phase === "active";
  const options = [...els.clashOptions.querySelectorAll(".clash-option")];
  options.forEach((button, index) => {
    button.classList.remove("correct", "wrong", "dimmed");
    const locked = bootLocked(clash, active);
    button.disabled = locked;
    if (!active) {
      const correctIndex = clash.correctIndex;
      if (index === correctIndex) button.classList.add("correct");
      else if (ui.selectedOption === index) button.classList.add("wrong");
      else button.classList.add("dimmed");
    }
  });

  if (!active) {
    els.clashTimer.textContent = "0.0";
    els.clashTimerFill.style.width = "0%";
    const teamWon = clash.winnerSlot === ui.selfSlot;
    const type = teamWon ? "correct" : "wrong";
    els.clashResult.classList.remove("hidden");
    els.clashResult.classList.toggle("lost", type !== "correct");
    els.clashResultTitle.textContent =
      clash.winnerIndex === ui.selfIndex
        ? "BENAR — PHYSICS EDGE!"
        : teamWon
          ? "REKAN TIMMU BENAR — EDGE UNTUK TIM!"
          : clash.winnerSlot !== null
            ? "LAWAN LEBIH CEPAT"
          : selfStatus === "locked"
            ? "TIDAK ADA PEMENANG"
            : "WAKTU HABIS";
    els.clashExplanation.textContent = clash.explanation || "";
  } else {
    els.clashResult.classList.add("hidden");
  }
}

function bootLocked(clash, active) {
  if (!active) return true;
  if (ui.answered) return true;
  const status = clash.answerStatus?.[ui.selfIndex] ?? "waiting";
  return status !== "waiting";
}

function tickClashTimer() {
  tickDuelTimer();
  const clash = ui.activeClash;
  if (!clash || els.clashOverlay.classList.contains("hidden")) return;
  if (clash.phase !== "active") {
    els.clashTimer.textContent = "0.0";
    els.clashTimerFill.style.width = "0%";
    return;
  }
  const remaining = Math.max(0, clash.endsAt - serverNow());
  const total = Math.max(1, clash.endsAt - clash.startedAt);
  els.clashTimer.textContent = (remaining / 1000).toFixed(1);
  els.clashTimerFill.style.width = `${clamp01(remaining / total) * 100}%`;
}

function hideClash() {
  if (ui.activeClash) {
    ui.activeClash = null;
  }
  ui.answered = false;
  ui.selectedOption = null;
  els.clashOverlay.classList.add("hidden");
  els.clashOptions.replaceChildren();
  els.clashResult.classList.add("hidden");
}

function answerClash(index) {
  const clash = ui.activeClash;
  if (!clash || clash.phase !== "active" || ui.answered) return;
  if (!client?.send({ type: "quizAnswer", clashId: clash.id, option: index })) {
    toast("Tidak terhubung ke server.", "bad");
    return;
  }
  ui.answered = true;
  ui.selectedOption = index;
  clash.answerStatus[ui.selfIndex] = "locked";
  updateClash(clash);
}

// ---------------------------------------------------------------- duel jawab

const DUEL_RESULT_MS = 1500;
let duelHideTimer = 0;

function showDuel(duel) {
  window.clearTimeout(duelHideTimer);
  document.body.classList.add("duel-open");
  ui.activeDuel = { ...duel, answered: false, selected: null };
  els.duelCard.classList.remove("hidden");
  els.duelCard.classList.toggle("defend", duel.role === "victim");
  els.duelRole.textContent = duel.role === "attacker" ? "SERANG" : "TANGKIS";
  els.duelCategory.textContent = upper(duel.category);
  els.duelPrompt.textContent = duel.prompt;
  els.duelResult.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  duel.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "clash-option";
    button.dataset.index = String(index);
    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = String(index + 1);
    const label = document.createElement("span");
    label.textContent = option;
    button.append(key, label);
    button.addEventListener("click", () => answerDuel(index));
    fragment.append(button);
  });
  els.duelOptions.replaceChildren(fragment);
  audio.clashStart();
  tickDuelTimer();
}

function answerDuel(index) {
  const duel = ui.activeDuel;
  if (!duel || duel.answered || duel.resolved) return;
  if (!client?.send({ type: "quizAnswer", clashId: duel.id, option: index })) {
    toast("Tidak terhubung ke server.", "bad");
    return;
  }
  duel.answered = true;
  duel.selected = index;
  for (const button of els.duelOptions.querySelectorAll(".clash-option")) {
    button.disabled = true;
    button.classList.toggle("dimmed", Number(button.dataset.index) !== index);
  }
}

function handleDuelAck(message) {
  const duel = ui.activeDuel;
  if (!message.accepted) {
    if (duel && duel.id === message.clashId && !duel.resolved) {
      duel.answered = false;
      duel.selected = null;
      for (const button of els.duelOptions.querySelectorAll(".clash-option")) {
        button.disabled = false;
        button.classList.remove("dimmed");
      }
    }
    if (message.reason !== "clash-ended" && message.reason !== "timeout") {
      toast(ACK_ERRORS[message.reason] || "Jawaban ditolak server.", "bad");
    }
    return;
  }
  if (message.correct) audio.correct();
  else audio.wrong();
}

const DUEL_RESULT_TEXT = {
  attackerWins: { attacker: ["SERANGAN KENA!", true], victim: ["KAMU KALAH CEPAT", false] },
  victimWins: { attacker: ["SERANGAN GAGAL: LAWAN LEBIH CEPAT", false], victim: ["SERANGAN DITANGKIS! EDGE KECIL", true] },
  bothFail: { attacker: ["SERANGAN GAGAL", false], victim: ["TIDAK ADA JAWABAN BENAR: MOMENTUM LOSS", false] },
  cancelled: { attacker: ["DUEL DIBATALKAN", true], victim: ["DUEL DIBATALKAN", true] },
};

function showDuelResult(result) {
  const duel = ui.activeDuel;
  if (!duel || duel.id !== result.id) return;
  duel.resolved = true;
  const [title, good] = DUEL_RESULT_TEXT[result.outcome]?.[result.role] ?? ["DUEL SELESAI", true];
  els.duelResultTitle.textContent = title;
  els.duelExplanation.textContent = result.outcome === "cancelled" ? "" : result.explanation || "";
  els.duelResult.classList.toggle("lost", !good);
  els.duelResult.classList.remove("hidden");
  els.duelTimer.textContent = "0.0";
  els.duelTimerFill.style.width = "0%";
  for (const button of els.duelOptions.querySelectorAll(".clash-option")) {
    const index = Number(button.dataset.index);
    button.disabled = true;
    button.classList.remove("correct", "wrong", "dimmed");
    if (result.outcome === "cancelled") continue;
    if (index === result.correctIndex) button.classList.add("correct");
    else if (index === result.yourOption) button.classList.add("wrong");
    else button.classList.add("dimmed");
  }
  window.clearTimeout(duelHideTimer);
  duelHideTimer = window.setTimeout(hideDuel, result.outcome === "cancelled" ? 400 : DUEL_RESULT_MS);
}

function tickDuelTimer() {
  const duel = ui.activeDuel;
  if (!duel || duel.resolved) return;
  const remaining = Math.max(0, duel.endsAt - serverNow());
  const total = Math.max(1, duel.endsAt - duel.startedAt);
  els.duelTimer.textContent = (remaining / 1000).toFixed(1);
  els.duelTimerFill.style.width = `${clamp01(remaining / total) * 100}%`;
}

function hideDuel() {
  window.clearTimeout(duelHideTimer);
  document.body.classList.remove("duel-open");
  ui.activeDuel = null;
  els.duelCard.classList.add("hidden");
  els.duelOptions.replaceChildren();
  els.duelResult.classList.add("hidden");
}

function handleAction(kind, value) {
  if (kind === "quiz") {
    if (!input.enabled) return;
    if (ui.activeDuel && els.clashOverlay.classList.contains("hidden")) answerDuel(Number(value));
    else answerClash(Number(value));
    return;
  }
  if (!input.enabled) return;
  if (kind === "shoot") {
    const now = performance.now();
    if (now - ui.lastShootAt > 140) {
      ui.lastShootAt = now;
      audio.shoot();
    }
    return;
  }
  if (kind === "cancel") {
    toast("Skill dibatalkan.", "");
    return;
  }
  if (kind === "ability") {
    const self = selfPlayer();
    if (value === "dash" && (!self || self.dashCd <= 0)) audio.dash();
    else if (value === "shock" && (!self || self.shockCd <= 0)) audio.shock();
    else if (value === "super" && (!self || self.super >= 100)) audio.super();
  }
}

function updateRoomUI() {
  const lobby = ui.lobby;
  if (!lobby) return;
  els.roomCode.textContent = lobby.roomCode || "-----";
  const players = Array.isArray(lobby.players) ? lobby.players : [];
  const LANE_TAGS = ["LANE ATAS", "LANE TENGAH", "LANE BAWAH"];
  const TEAM_TAGS = ["MUARO JAMBI", "KOTAGEDE"];
  // baris = seat (atas/tengah/bawah), kolom = tim biru lalu merah
  const slots = [];
  for (let seat = 0; seat < 3; seat += 1) {
    for (let team = 0; team < 2; team += 1) {
      slots.push({ team, seat, player: players.find((player) => player.index === team * 3 + seat) ?? null });
    }
  }
  const fragment = document.createDocumentFragment();
  slots.forEach(({ team, seat, player }) => {
    const card = document.createElement("div");
    card.className = `room-player ${player ? "filled" : ""}`.trim();
    const tag = document.createElement("span");
    tag.className = "player-tag";
    tag.textContent = `${TEAM_TAGS[team]} · ${LANE_TAGS[seat]}`;
    const name = document.createElement("strong");
    name.textContent = player ? player.name : "Menunggu...";
    const detail = document.createElement("span");
    detail.textContent = player
      ? `${getHero(player.heroId).name} · ${upper(DIFFICULTY_NAMES[skillName(player.skillLevel)] ?? "")}`
      : "Diisi bot saat mulai";
    const ready = document.createElement("span");
    ready.className = `ready-state ${player && (player.ready || player.bot) ? "" : "waiting"}`.trim();
    ready.textContent = player ? (player.bot ? "AI" : player.ready ? "SIAP" : "BELUM SIAP") : "—";
    card.append(tag, name, detail, ready);
    fragment.append(card);
  });
  els.roomPlayers.replaceChildren(fragment);

  const own = players.find((player) => player.id === (lobby.you ?? ui.selfId));
  els.readyBtn.textContent = own?.ready ? "BATAL SIAP" : "SIAP";
  els.readyBtn.disabled = !own || lobby.status === "countdown";

  if (lobby.status !== "countdown") {
    const humans = players.filter((player) => !player.bot);
    if (lobby.mode !== "practice" && humans.length < 2) {
      els.roomStatus.textContent = "Menunggu pemain kedua bergabung. Slot kosong diisi bot (3v3).";
    } else if (players.every((player) => player.ready || player.bot)) {
      els.roomStatus.textContent = "Semua siap. Pertandingan segera dimulai...";
    } else {
      els.roomStatus.textContent = "Tekan SIAP saat kamu siap bertempur.";
    }
  }
}

function updateRoomCountdown() {
  if (ui.screen !== "room" || !ui.lobby) return;
  if (ui.lobby.status === "countdown" && Number.isFinite(ui.lobby.countdownAt)) {
    const remaining = Math.max(0, ui.lobby.countdownAt - serverNow());
    els.roomStatus.textContent = `Pertandingan dimulai dalam ${Math.ceil(remaining / 1000)}...`;
    els.readyBtn.disabled = true;
  } else if (ui.lobby.status === "lobby") {
    els.readyBtn.disabled = false;
  }
}

function updateQueueClock() {
  if (ui.screen !== "queue" || !ui.queueStartedAt) return;
  els.queueTime.textContent = formatClock((Date.now() - ui.queueStartedAt) / 1000);
  els.queueServer.textContent = client?.url || "SERVER";
}

function showResult(message) {
  ui.resultVisible = true;
  const won = message.winnerSlot !== null && message.winnerSlot === ui.selfSlot;
  const draw = message.winnerSlot === null;
  const card = els.resultOverlay.querySelector(".v2-result");
  card?.classList.toggle("lose", !won);
  els.resultKicker.textContent = message.reason === "nexus" ? "NEXUS HANCUR" : "WAKTU HABIS";
  els.resultTitle.textContent = draw ? "SERI" : won ? "VICTORY" : "DEFEAT";
  els.resultSubtitle.textContent = draw
    ? "Tidak ada yang menyerah. Coba lagi."
    : won
      ? "Momentum ada di pihakmu."
      : "Kalah momentum. Lihat statistik dan kembali lebih kuat.";

  const players = [...(message.players ?? [])].sort((a, b) => a.slot - b.slot || (a.index ?? 0) - (b.index ?? 0));
  const self = players.find((player) => player.id === ui.selfId) ?? null;
  const score = (player) => player.kills * 3 + player.clashWins * 2 + player.correct + player.cs * 0.1 - player.deaths;
  const pool = draw ? players : players.filter((player) => player.slot === message.winnerSlot);
  const mvp = [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
  ui.mvpHeroId = mvp?.heroId ?? null;
  els.mvpName.textContent = mvp ? `${mvp.name} · ${getHero(mvp.heroId).name}` : "-";
  els.mvpStats.textContent = mvp ? `${mvp.kills}/${mvp.deaths} KO · CS ${mvp.cs} · Clash ${mvp.clashWins}` : "-";

  const head = document.createElement("div");
  head.className = "v2-board-head";
  for (const label of ["", "PEMAIN", "K", "D", "CS", "CLASH", "BENAR"]) {
    const cell = document.createElement("span");
    cell.textContent = label;
    head.append(cell);
  }
  const rows = players.map((player) => {
    const row = document.createElement("div");
    row.className = `v2-board-row ${player.slot === 1 ? "red" : ""} ${player.id === ui.selfId ? "me" : ""}`.trim();
    const thumb = document.createElement("canvas");
    paintHeroThumb(thumb, player.heroId);
    const name = document.createElement("strong");
    name.textContent = `${player.name} · ${getHero(player.heroId).name}`;
    row.append(thumb, name);
    for (const value of [player.kills, player.deaths, player.cs, player.clashWins, player.correct]) {
      const cell = document.createElement("span");
      cell.className = "num";
      cell.textContent = String(value);
      row.append(cell);
    }
    return row;
  });
  els.resultBoard.replaceChildren(head, ...rows);

  const stats = self
    ? [
        ["LEVEL", self.level],
        ["SKOR TIM", message.scores?.[self.slot] ?? 0],
        ["SALAH", self.wrong],
      ]
    : [];
  els.resultStats.replaceChildren(
    ...stats.map(([label, value]) => {
      const item = document.createElement("div");
      item.className = "result-stat";
      const name = document.createElement("span");
      name.textContent = label;
      const number = document.createElement("strong");
      number.textContent = String(value);
      item.append(name, number);
      return item;
    }),
  );
  els.resultOverlay.classList.remove("hidden");
  if (won) audio.victory();
  else audio.defeat();
}

function playAgain() {
  const mode = ui.roomMode;
  ui.resultVisible = false;
  els.resultOverlay.classList.add("hidden");
  ui.matchResult = null;
  ui.pendingRematch = mode === "practice" ? "practice" : "quick";
  if (!client?.send({ type: "leave" })) {
    ui.pendingRematch = null;
    showScreen("home");
    toast("Tidak terhubung ke server.", "bad");
    return;
  }
  showScreen("home");
}

function backHome() {
  ui.pendingRematch = null;
  if (client) {
    client.send({ type: "leave" });
    client.clearSession();
  }
  ui.session = null;
  resetMatchUI();
  showScreen("home");
}

function sendPractice() {
  if (!ensureOnline()) return;
  resetMatchUI();
  client.send({ type: "practice", ...currentProfile() });
}

function saveSettings() {
  const url = els.serverInput.value.trim() || "ws://127.0.0.1:8787";
  client.connect(url);
  els.settingsModal.classList.add("hidden");
  toast(`Menyambung ke ${url}`, "");
}

function openSettings() {
  els.serverInput.value = client?.url || "ws://127.0.0.1:8787";
  els.leaveMatchBtn.classList.toggle("hidden", ui.screen !== "game");
  syncAudioUI();
  els.settingsModal.classList.remove("hidden");
  els.serverInput.focus();
  els.serverInput.select();
}

function closeSettings() {
  els.settingsModal.classList.add("hidden");
}

function syncFxUI() {
  const settings = screenFx.settings;
  for (const button of els.fxLevelSeg.querySelectorAll("[data-fx-level]")) {
    button.classList.toggle("active", button.dataset.fxLevel === settings.level);
  }
  for (const button of els.fxTierSeg.querySelectorAll("[data-fx-tier]")) {
    button.classList.toggle("active", button.dataset.fxTier === settings.tier);
  }
  for (const [button, on] of [
    [els.fxFlashToggle, settings.flash],
    [els.fxScareToggle, settings.jumpscare],
    [els.fxShakeToggle, settings.shake],
  ]) {
    button.classList.toggle("active", on);
    button.textContent = on ? "AKTIF" : "MATI";
  }
  els.fxShakeRange.value = String(Math.round(settings.shakeIntensity * 100));
  els.fxShakeRange.disabled = !settings.shake;
}

function bindFxSettings() {
  els.fxLevelSeg.addEventListener("click", (event) => {
    const level = event.target.closest("[data-fx-level]")?.dataset.fxLevel;
    if (!level) return;
    screenFx.update({ level });
    syncFxUI();
    audio.click();
  });
  els.fxTierSeg.addEventListener("click", (event) => {
    const tier = event.target.closest("[data-fx-tier]")?.dataset.fxTier;
    if (!tier) return;
    screenFx.update({ tier });
    syncFxUI();
    audio.click();
  });
  for (const [button, key] of [
    [els.fxFlashToggle, "flash"],
    [els.fxScareToggle, "jumpscare"],
    [els.fxShakeToggle, "shake"],
  ]) {
    button.addEventListener("click", () => {
      screenFx.update({ [key]: !screenFx.settings[key] });
      syncFxUI();
      audio.click();
    });
  }
  els.fxShakeRange.addEventListener("input", () => {
    screenFx.update({ shakeIntensity: Number(els.fxShakeRange.value) / 100 });
  });
  els.fxPreviewBtn.addEventListener("click", () => {
    screenFx.trigger(ui.heroId, { shakeTarget: els.settingsDialog });
  });
}

function syncAutoAimUI() {
  els.autoAimToggle.classList.toggle("active", ui.autoAim);
  els.autoAimToggle.textContent = ui.autoAim ? "AKTIF" : "MATI";
}

function syncAudioUI() {
  const enabled = audio.enabled;
  els.audioToggle.classList.toggle("active", enabled);
  els.audioToggle.textContent = enabled ? "AKTIF" : "MATI";
  els.soundBtn.style.opacity = enabled ? "1" : "0.45";
  els.soundBtn.setAttribute("aria-pressed", String(!enabled));
}

function toggleAudio() {
  audio.setEnabled(!audio.enabled);
  syncAudioUI();
  if (audio.enabled) audio.click();
}

function ensureOnline() {
  if (client?.ws && client.ws.readyState === WebSocket.OPEN) return true;
  if (client?.ws && client.ws.readyState === WebSocket.CONNECTING) {
    toast("Masih menyambung ke server. Coba lagi.", "");
    return false;
  }
  client?.reconnectNow();
  toast("Menyambung ulang ke server. Coba lagi.", "");
  return false;
}

function startQueue() {
  if (!ensureOnline()) return;
  ui.queueStartedAt = Date.now();
  els.queueText.textContent = "Mencari lawan online...";
  els.queueServer.textContent = client.url;
  els.queueTime.textContent = "00:00";
  showScreen("queue");
  client.send({ type: "quickMatch", ...currentProfile() });
}

/** Opsi efek khas hero untuk potret lobi (level/tier dari pengaturan efek). */
function lobbyFxOptions(extra = {}) {
  return {
    level: screenFx.settings.level,
    tier: screenFx.tier,
    showcaseAt: ui.showcaseAt,
    reducedMotion: Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    ...extra,
  };
}

/**
 * Putar showcase hero di lobi (3,6 dtk). Otomatis saat ganti hero hanya efek partikel;
 * lewat tombol (manual) juga memicu efek layar penuh sesuai pengaturan, dibatasi
 * minimal 4 detik antar putaran agar kilatan tidak beruntun.
 */
function playShowcase({ manual = false } = {}) {
  const now = performance.now();
  if (manual && ui.showcaseAt !== null && now - ui.showcaseAt < 4000) return;
  ui.showcaseAt = now;
  els.showcaseBtn.classList.add("playing");
  window.setTimeout(() => els.showcaseBtn.classList.remove("playing"), SHOWCASE_MS);
  if (manual) {
    audio.click();
    screenFx.trigger(ui.heroId, { shakeTarget: els.heroPreview.parentElement });
  }
}

function selectHero(heroId) {
  const hero = getHero(heroId);
  const changed = ui.heroId !== heroId;
  ui.heroId = heroId;
  if (changed && ui.screen === "home") playShowcase();
  els.heroName.textContent = upper(hero.name);
  els.heroRole.textContent = upper(hero.role);
  els.heroTagline.textContent = hero.tagline;
  els.heroUltimate.textContent = hero.ultimate.name;
  els.heroStats.replaceChildren(
    ...[
      ["HP", hero.maxHp],
      ["SPD", hero.speed],
      ["DMG", hero.damage],
    ].map(([label, value]) => {
      const pill = document.createElement("div");
      pill.className = "stat-pill";
      const name = document.createElement("span");
      name.textContent = label;
      const number = document.createElement("strong");
      number.textContent = String(value);
      pill.append(name, number);
      return pill;
    }),
  );
  for (const card of els.heroPicker.querySelectorAll(".hero-card")) {
    card.classList.toggle("active", card.dataset.hero === heroId);
  }
  els.skillPill.textContent = `FISIKA ${upper(ui.skill)}`;
  // kartu lain digambar ulang statis (tanpa efek) agar tidak ada partikel beku
  for (const card of els.heroPicker.querySelectorAll(".hero-card")) {
    const canvas = card.querySelector("canvas");
    if (canvas && card.dataset.hero !== heroId) {
      drawPortrait(canvas, card.dataset.hero, performance.now(), { scale: 0.8, sparkles: false });
    }
  }
  saveProfile();
}

function buildHeroPicker() {
  const fragment = document.createDocumentFragment();
  for (const heroId of HERO_ORDER) {
    const hero = getHero(heroId);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hero-card";
    card.dataset.hero = heroId;
    card.style.setProperty("--hero-color", hero.color);
    const canvas = document.createElement("canvas");
    canvas.className = "hero-thumb";
    canvas.width = 148;
    canvas.height = 148;
    const name = document.createElement("strong");
    name.textContent = upper(hero.name);
    const role = document.createElement("span");
    role.textContent = hero.role;
    card.append(canvas, name, role);
    card.addEventListener("click", () => {
      audio.click();
      selectHero(heroId);
    });
    fragment.append(card);
  }
  els.heroPicker.replaceChildren(fragment);
  for (const card of els.heroPicker.querySelectorAll(".hero-card")) {
    const canvas = card.querySelector("canvas");
    if (canvas) {
      drawPortrait(canvas, card.dataset.hero, performance.now(), {
        scale: 0.8,
        sparkles: false,
      });
    }
  }
}

// ---------------------------------------------------------------- v2: perangkat sentuh, layar penuh

function detectNative() {
  ui.native = document.body.dataset.native === "1";
  if (!ui.native) return;
  document.body.classList.add("native");
  // tombol kembali Android: tutup menu, keluar dari layar, atau buka menu saat bertanding
  const App = window.Capacitor?.registerPlugin?.("App");
  App?.addListener?.("backButton", () => {
    if (!els.settingsModal.classList.contains("hidden")) return closeSettings();
    if (ui.resultVisible) return backHome();
    if (ui.screen === "game") return openSettings();
    if (ui.screen === "queue") {
      client?.send({ type: "cancelQueue" });
      return showScreen("home");
    }
    if (ui.screen === "room") return backHome();
    if (ui.screen === "home") App.exitApp?.();
  });
}

function detectTouch() {
  const preview = new URLSearchParams(location.search).has("phone");
  const coarse =
    preview || window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  ui.touch = Boolean(coarse);
  document.body.classList.toggle("touch", ui.touch);
  window.addEventListener(
    "touchstart",
    () => {
      ui.touch = true;
      document.body.classList.add("touch");
    },
    { once: true, passive: true },
  );
}

async function enterImmersive() {
  const root = document.documentElement;
  try {
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: "hide" });
    }
  } catch {
    // Fullscreen ditolak: lanjut tanpa layar penuh.
  }
  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    // Tidak semua peramban mengizinkan kunci orientasi.
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
    screen.orientation?.unlock?.();
  } else {
    enterImmersive();
  }
}

let wakeLock = null;
async function setWakeLock(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ui.screen === "game") setWakeLock(true);
});

function registerServiceWorker() {
  if (ui.native || !("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// ---------------------------------------------------------------- v2: mode lobi

const MODES = {
  practice: { main: "MAIN", sub: "3v3 melawan bot", hint: "Latihan 3v3 melawan bot. Langsung main, tanpa antre." },
  online: { main: "CARI LAWAN", sub: "Matchmaking online", hint: "Cari pemain lain lewat internet. Slot kosong diisi bot." },
  room: { main: "BUAT ROOM", sub: "Ajak teman dengan kode", hint: "Buat room lalu bagikan kodenya, atau gabung dengan kode temanmu." },
};

function setMode(mode) {
  if (!MODES[mode]) mode = "practice";
  ui.mode = mode;
  for (const tab of els.modeTabs.querySelectorAll("[data-mode]")) {
    tab.classList.toggle("active", tab.dataset.mode === mode);
    tab.setAttribute("aria-selected", String(tab.dataset.mode === mode));
  }
  els.roomPanel.classList.toggle("hidden", mode !== "room");
  els.playMain.textContent = MODES[mode].main;
  els.playSub.textContent = MODES[mode].sub;
  els.modeHint.textContent = MODES[mode].hint;
}

function createRoom() {
  if (!ensureOnline()) return;
  client.send({ type: "createRoom", ...currentProfile() });
}

// ---------------------------------------------------------------- v2: thumbnail hero

const thumbCache = new Map();

function heroThumb(heroId) {
  let canvas = thumbCache.get(heroId);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    drawPortrait(canvas, heroId, 1200, { scale: 0.85, sparkles: false });
    thumbCache.set(heroId, canvas);
  }
  return canvas;
}

function paintHeroThumb(target, heroId) {
  if (target.width !== 96 || target.height !== 96) {
    target.width = 96;
    target.height = 96;
  }
  const ctx = target.getContext("2d");
  ctx.clearRect(0, 0, 96, 96);
  if (!heroId) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = '700 58px "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 48, 52);
    return;
  }
  ctx.drawImage(heroThumb(heroId), 0, 0, 96, 96);
}

// ---------------------------------------------------------------- v2: pilih hero

const ROLES = ["Semua", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];
const TEAM_LABELS = ["MUARO JAMBI", "KOTAGEDE"];
const LANE_LABELS = ["LANE ATAS", "LANE TENGAH", "LANE BAWAH"];

function enterSelect() {
  ui.roleFilter = "Semua";
  ui.pickDirty = false;
  showScreen("select");
  const chips = ROLES.map((role) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "v2-chip";
    chip.dataset.role = role;
    chip.textContent = upper(role);
    return chip;
  });
  els.roleFilter.replaceChildren(...chips);
}

function slotCard(player, { mine, hideHero }) {
  const card = document.createElement("div");
  card.className = `v2-slot ${player.locked ? "locked" : "pending"} ${mine ? "me" : ""}`.trim();
  const canvas = document.createElement("canvas");
  paintHeroThumb(canvas, hideHero ? null : player.heroId);
  const info = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = player.name + (player.bot ? " (AI)" : "");
  const hero = document.createElement("span");
  hero.textContent = hideHero ? "Pick buta" : player.heroId ? getHero(player.heroId).name : "...";
  const lock = document.createElement("span");
  lock.className = "lock-state";
  lock.textContent = `${LANE_LABELS[player.seat] ?? ""} · ${player.locked ? "TERKUNCI" : "MEMILIH"}`;
  info.append(name, hero, lock);
  card.append(canvas, info);
  return card;
}

function renderSelect() {
  const lobby = ui.lobby;
  if (!lobby || lobby.status !== "select") return;
  const me = lobby.players.find((player) => player.id === ui.selfId);
  if (!me) return;
  if (!ui.pickDirty || me.heroId === ui.heroId) {
    ui.pickDirty = false;
    if (me.heroId && me.heroId !== ui.heroId) selectHero(me.heroId);
  }
  const allies = lobby.players.filter((player) => player.slot === me.slot).sort((a, b) => a.seat - b.seat);
  const enemies = lobby.players.filter((player) => player.slot !== me.slot).sort((a, b) => a.seat - b.seat);
  els.selectTitle.textContent = `TIM ${TEAM_LABELS[me.slot]}`;
  els.selectAllies.replaceChildren(...allies.map((player) => slotCard(player, { mine: player.id === me.id, hideHero: false })));
  els.selectEnemies.replaceChildren(...enemies.map((player) => slotCard(player, { mine: false, hideHero: !player.heroId })));

  for (const chip of els.roleFilter.querySelectorAll(".v2-chip")) {
    chip.classList.toggle("active", chip.dataset.role === ui.roleFilter);
  }
  const cards = HERO_ORDER.map((heroId) => ({ heroId, hero: getHero(heroId) })).filter(
    ({ hero }) => ui.roleFilter === "Semua" || hero.role === ui.roleFilter,
  );
  els.selectGrid.replaceChildren(
    ...cards.map(({ heroId, hero }) => {
      const taken = allies.some((player) => !player.bot && player.locked && player.id !== me.id && player.heroId === heroId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `v2-pick ${heroId === ui.heroId ? "active" : ""} ${taken ? "taken" : ""}`.trim();
      button.style.setProperty("--hero-color", hero.color);
      button.disabled = taken || me.locked;
      const canvas = document.createElement("canvas");
      paintHeroThumb(canvas, heroId);
      const name = document.createElement("strong");
      name.textContent = upper(hero.name);
      const role = document.createElement("small");
      role.textContent = hero.role;
      button.append(canvas, name, role);
      button.addEventListener("click", () => pickHero(heroId));
      return button;
    }),
  );

  const hero = getHero(ui.heroId);
  const hint = document.createElement("span");
  hint.className = "hint-line";
  const mates = allies.filter((player) => player.id !== me.id).map((player) => getHero(player.heroId)?.role);
  const roleCount = (role) => mates.filter((value) => value === role).length;
  hint.textContent =
    hero.role === "Tank" || roleCount("Tank") > 0
      ? "Garis depan terisi."
      : "Tim belum punya garis depan (Tank/Fighter). Pertimbangkan satu.";
  const bits = [
    [`${upper(hero.name)}`, hero.role],
    ["HP", hero.maxHp],
    ["SPD", hero.speed],
    ["DMG", hero.damage],
    ["SUPER", hero.ultimate.name],
    ["TINGKAT", hero.difficulty],
  ];
  els.selectDetail.replaceChildren(
    ...bits.map(([label, value]) => {
      const group = document.createElement("span");
      group.append(`${label} `);
      const strong = document.createElement("strong");
      strong.textContent = String(value);
      group.append(strong);
      return group;
    }),
    hint,
  );

  els.lockBtn.textContent = me.locked ? "TERKUNCI" : "KUNCI PILIHAN";
  els.lockBtn.disabled = me.locked;
  updateSelectTimer();
}

function pickHero(heroId) {
  const me = ui.lobby?.players?.find((player) => player.id === ui.selfId);
  if (!me || me.locked || heroId === ui.heroId) return;
  audio.click();
  ui.pickDirty = true;
  selectHero(heroId);
  client?.send({ type: "pickHero", heroId });
  renderSelect();
}

function updateSelectTimer() {
  const lobby = ui.lobby;
  if (!lobby || !Number.isFinite(lobby.selectEndsAt)) return;
  const remaining = Math.max(0, (lobby.selectEndsAt - serverNow()) / 1000);
  els.selectTimer.textContent = String(Math.ceil(remaining));
  els.selectRing.style.strokeDashoffset = String(132 * (1 - clamp01(remaining / MATCH.select)));
  els.selectTimer.parentElement.classList.toggle("urgent", remaining <= 5 && remaining > 0);
}

// ---------------------------------------------------------------- v2: loading

const TIPS = [
  "Menara dalam kebal sampai menara luar di lane yang sama hancur.",
  "Nexus baru bisa diserang setelah kedua menara satu lane runtuh.",
  "Physics Clash: jawab soal fisika paling cepat untuk Physics Edge bagi timmu.",
  "Minion memberi XP. Jangan biarkan satu lane kosong terlalu lama.",
  "Jangan menyerang menara tanpa minion di dekatmu, menara menembak hero.",
  "Pakai Dash untuk menabrak lawan dan menghancurkan pagar bambu.",
  "Super terisi saat memberi damage dan menang Clash. Simpan untuk team fight.",
];

function enterLoading() {
  ui.tipStartedAt = performance.now();
  ui.tipIndex = Math.floor(Math.random() * TIPS.length);
  showScreen("loading");
  els.loadTip.textContent = TIPS[ui.tipIndex];
}

function loadCard(player) {
  const card = document.createElement("div");
  card.className = "v2-load-card";
  const canvas = document.createElement("canvas");
  paintHeroThumb(canvas, player.heroId);
  const info = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = player.name + (player.bot ? " (AI)" : "");
  const hero = document.createElement("span");
  hero.textContent = `${getHero(player.heroId).name} · ${LANE_LABELS[player.seat] ?? ""}`;
  info.append(name, hero);
  card.append(canvas, info);
  return card;
}

function renderLoading() {
  const lobby = ui.lobby;
  if (!lobby || lobby.status !== "countdown") return;
  const me = lobby.players.find((player) => player.id === ui.selfId);
  const slot = me?.slot ?? ui.selfSlot;
  const sorted = [...lobby.players].filter((player) => player.heroId).sort((a, b) => a.seat - b.seat);
  els.loadAllies.replaceChildren(...sorted.filter((player) => player.slot === slot).map(loadCard));
  els.loadEnemies.replaceChildren(...sorted.filter((player) => player.slot !== slot).map(loadCard));
}

function updateLoading(now) {
  const lobby = ui.lobby;
  if (!lobby || !Number.isFinite(lobby.countdownAt)) return;
  const total = MATCH.countdown * 1000;
  const remaining = Math.max(0, lobby.countdownAt - serverNow());
  const progress = clamp01(1 - remaining / total);
  els.loadFill.style.width = `${Math.round(progress * 100)}%`;
  const steps = ["Memuat peta Nusantara (1/4)", "Memuat model hero (2/4)", "Menyiapkan efek & audio (3/4)", "Menunggu pemain lain (4/4)"];
  els.loadStep.textContent = steps[Math.min(3, Math.floor(progress * 4))];
  if (now - (ui.tipStartedAt ?? now) > 2600) {
    ui.tipStartedAt = now;
    ui.tipIndex = ((ui.tipIndex ?? 0) + 1) % TIPS.length;
    els.loadTip.textContent = TIPS[ui.tipIndex];
  }
}

// ---------------------------------------------------------------- v2: panel tim dalam pertandingan

const teamRows = new Map();

function updateTeamPanel(state) {
  const self = selfPlayer(state);
  if (!self) return;
  const mates = (state.players ?? []).filter((player) => player.slot === self.slot && player.id !== self.id);
  const seen = new Set();
  for (const mate of mates) {
    seen.add(mate.id);
    let row = teamRows.get(mate.id);
    if (!row) {
      const element = document.createElement("div");
      element.className = "team-mate";
      const canvas = document.createElement("canvas");
      paintHeroThumb(canvas, mate.heroId);
      const name = document.createElement("strong");
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("i");
      bar.append(fill);
      element.append(canvas, name, bar);
      els.teamPanel.append(element);
      row = { element, name, fill };
      teamRows.set(mate.id, row);
    }
    row.name.textContent = mate.name;
    row.fill.style.width = `${clamp01(mate.hp / Math.max(1, mate.maxHp)) * 100}%`;
    row.element.classList.toggle("dead", !mate.alive);
  }
  for (const [id, row] of teamRows) {
    if (!seen.has(id)) {
      row.element.remove();
      teamRows.delete(id);
    }
  }
}

// ---------------------------------------------------------------- v2: bidik otomatis (sentuh)

function autoTarget() {
  const state = ui.state;
  const self = selfPlayer(state);
  if (!state || !self || !self.alive) return null;
  let best = null;
  let bestScore = Infinity;
  const consider = (x, y, limit, bias) => {
    const distance = Math.hypot(x - self.x, y - self.y);
    if (distance > limit) return;
    const score = distance + bias;
    if (score < bestScore) {
      bestScore = score;
      best = { x, y };
    }
  };
  for (const player of state.players ?? []) {
    if (player.slot === self.slot || !player.alive) continue;
    consider(player.x + player.vx * 0.18, player.y + player.vy * 0.18, 1100, -220);
  }
  for (const minion of state.minions ?? []) {
    if (minion.team !== self.slot) consider(minion.x, minion.y, 800, 0);
  }
  for (const tower of state.towers ?? []) {
    if (tower.team !== self.slot && tower.alive) consider(tower.x, tower.y, 900, 120);
  }
  for (const nexus of state.nexuses ?? []) {
    if (nexus.team !== self.slot && nexus.alive && !nexus.protected) consider(nexus.x, nexus.y, 900, 120);
  }
  return best;
}

function bindEvents() {
  els.skillPicker.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-skill]");
    if (!button) return;
    ui.skill = button.dataset.skill;
    for (const option of els.skillPicker.querySelectorAll("button")) {
      option.classList.toggle("active", option === button);
    }
    els.skillPill.textContent = `FISIKA ${upper(ui.skill)}`;
    saveProfile();
    audio.click();
  });

  els.nameInput.addEventListener("input", saveProfile);

  els.modeTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-mode]");
    if (!tab) return;
    audio.click();
    setMode(tab.dataset.mode);
  });

  els.playBtn.addEventListener("click", () => {
    audio.click();
    if (ui.touch) enterImmersive();
    if (ui.mode === "practice") sendPractice();
    else if (ui.mode === "online") startQueue();
    else createRoom();
  });

  els.createRoomBtn.addEventListener("click", () => {
    audio.click();
    if (ui.touch) enterImmersive();
    createRoom();
  });

  els.fullscreenBtn.addEventListener("click", () => {
    audio.click();
    toggleFullscreen();
  });

  els.lockBtn.addEventListener("click", () => {
    audio.click();
    const own = ui.lobby?.players?.find((player) => player.id === ui.selfId);
    if (!own || own.locked) return;
    client?.send({ type: "lockHero" });
  });

  els.roleFilter.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-role]");
    if (!chip) return;
    audio.click();
    ui.roleFilter = chip.dataset.role;
    renderSelect();
  });

  bindMinimapPings();

  els.menuBtn.addEventListener("click", () => {
    audio.click();
    openSettings();
  });

  els.leaveMatchBtn.addEventListener("click", () => {
    audio.click();
    closeSettings();
    backHome();
  });

  els.showcaseBtn.addEventListener("click", () => playShowcase({ manual: true }));

  els.autoAimToggle.addEventListener("click", () => {
    ui.autoAim = !ui.autoAim;
    try {
      localStorage.setItem("logicodix.autoaim", ui.autoAim ? "1" : "0");
    } catch {
      // Storage can be unavailable in restricted contexts.
    }
    syncAutoAimUI();
    audio.click();
  });

  els.joinRoomBtn.addEventListener("click", () => {
    audio.click();
    if (!ensureOnline()) return;
    const code = els.roomCodeInput.value.trim().toUpperCase();
    if (code.length < 4) {
      toast("Masukkan kode room yang valid.", "bad");
      return;
    }
    client.send({ type: "joinRoom", code, ...currentProfile() });
  });

  els.roomCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") els.joinRoomBtn.click();
  });

  els.cancelQueueBtn.addEventListener("click", () => {
    audio.click();
    client?.send({ type: "cancelQueue" });
    showScreen("home");
  });

  els.readyBtn.addEventListener("click", () => {
    audio.click();
    const own = ui.lobby?.players?.find((player) => player.id === ui.selfId);
    client?.send({ type: "ready", value: !(own?.ready ?? false) });
  });

  els.leaveRoomBtn.addEventListener("click", () => {
    audio.click();
    backHome();
  });

  els.copyRoomBtn.addEventListener("click", async () => {
    audio.click();
    const code = els.roomCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      toast(`Kode ${code} disalin.`, "good");
    } catch {
      toast(`Kode room: ${code}`, "");
    }
  });

  els.playAgainBtn.addEventListener("click", () => {
    audio.click();
    playAgain();
  });

  els.backHomeBtn.addEventListener("click", () => {
    audio.click();
    backHome();
  });

  els.retryReconnectBtn.addEventListener("click", () => {
    audio.click();
    els.reconnectText.textContent = "Mencoba menyambung ulang...";
    client?.reconnectNow();
  });

  els.abandonBtn.addEventListener("click", () => {
    audio.click();
    client?.disconnect({ clearSession: true });
    ui.session = null;
    resetMatchUI();
    showScreen("home");
  });

  els.serverChip.addEventListener("click", openSettings);
  els.settingsBtn.addEventListener("click", openSettings);
  els.closeSettingsBtn.addEventListener("click", closeSettings);
  els.settingsModal.addEventListener("click", (event) => {
    if (event.target === els.settingsModal) closeSettings();
  });
  els.saveServerBtn.addEventListener("click", saveSettings);
  els.rotateHint.addEventListener("click", enterImmersive);
  els.serverInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveSettings();
  });
  els.soundBtn.addEventListener("click", toggleAudio);
  els.audioToggle.addEventListener("click", toggleAudio);

  els.gameCanvas.addEventListener("pointermove", (event) => {
    renderer.setPointer(renderer.screenToWorld(event.clientX, event.clientY));
  });
  els.gameCanvas.addEventListener("pointerdown", (event) => {
    renderer.setPointer(renderer.screenToWorld(event.clientX, event.clientY));
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      if (!els.settingsModal.classList.contains("hidden")) closeSettings();
    }
  });

  window.addEventListener("beforeunload", () => {
    client?.disconnect({ clearSession: false });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderer.resize();
  });
}

function startBackground() {
  const canvas = els.bgCanvas;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  const particles = [];
  const colors = ["69,195,255", "255,210,63", "255,93,125", "77,240,194"];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    const count = Math.max(24, Math.min(60, Math.round((width * height) / 42000)));
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: 1 + Math.random() * 1.8,
        color: colors[index % colors.length],
      });
    }
  }

  resize();
  seed();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || ui.screen === "game" || ui.screen === "loading") return;
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.15,
      0,
      width * 0.5,
      height * 0.15,
      Math.max(width, height) * 0.6,
    );
    glow.addColorStop(0, "rgba(30, 120, 160, 0.16)");
    glow.addColorStop(1, "rgba(4, 19, 29, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
    }

    ctx.lineWidth = 1;
    for (let a = 0; a < particles.length; a += 1) {
      for (let b = a + 1; b < particles.length; b += 1) {
        const first = particles[a];
        const second = particles[b];
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (distance > 150) continue;
        ctx.strokeStyle = `rgba(120, 200, 230, ${0.09 * (1 - distance / 150)})`;
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(second.x, second.y);
        ctx.stroke();
      }
    }

    for (const particle of particles) {
      ctx.fillStyle = `rgba(${particle.color}, 0.55)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  requestAnimationFrame(frame);
}

function startFrames() {
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    tickClashTimer();
    const inGame = ui.screen === "game";
    if (screenFx.active !== inGame) screenFx.setActive(inGame);
    screenFx.frame(now);
    if (inGame) renderer.setMinionDetail?.(screenFx.tier === "lite" ? "lite" : "full");
    updateQueueClock();
    updateRoomCountdown();
    if (ui.screen === "select") updateSelectTimer();
    if (ui.screen === "loading") updateLoading(now);
    if (ui.screen === "home") {
      drawPortrait(els.heroPreview, ui.heroId, now, { scale: 1, fx: lobbyFxOptions() });
      const activeCard = els.heroPicker.querySelector(".hero-card.active canvas");
      if (activeCard) {
        drawPortrait(activeCard, ui.heroId, now, {
          scale: 0.8,
          sparkles: false,
          fx: lobbyFxOptions({ density: 0.5, compact: true }),
        });
      }
    }
    if (ui.resultVisible) {
      const heroId =
        ui.mvpHeroId ?? ui.state?.players?.find((player) => player.id === ui.selfId)?.heroId ?? ui.heroId;
      drawPortrait(els.resultHero, heroId, now, { scale: 0.86 });
    }
    if (ui.screen === "game") {
      renderer.setPointer(input.getAim());
      renderer.aimActive = input.skillAiming;
      els.cancelZone.classList.toggle("hidden", !input.skillCancel);
      renderer.render(now);
    }
  }
  requestAnimationFrame(frame);
}

function startInputLoop() {
  window.setInterval(() => {
    if (ui.screen !== "game" || !ui.signalPlaying()) return;
    const aim = input.getAim();
    client?.sendInput(input.getMask(), aim.x, aim.y);
  }, 33);
}

function init() {
  detectNative();
  detectTouch();
  try {
    ui.autoAim = localStorage.getItem("logicodix.autoaim") !== "0";
  } catch {
    ui.autoAim = true;
  }
  loadProfile();
  syncFxUI();
  bindFxSettings();
  buildHeroPicker();
  selectHero(ui.heroId);
  syncAudioUI();
  syncAutoAimUI();
  setMode("practice");
  registerServiceWorker();
  showScreen("home");
  bindEvents();
  startBackground();
  startFrames();
  startInputLoop();
  els.bootStatus.textContent = "Menghubungkan ke server...";

  if (location.search.includes("debug")) window.__logicodix = { handleMessage, ui, showScreen, input, renderer };
  client = new GameClient({ onStatus: handleStatus, onMessage: handleMessage });
  ui.session = client.session;
  els.serverInput.value = client.url;
  client.connect();
  if (ui.native && !localStorage.getItem("logicodix.server")) {
    window.setTimeout(() => {
      toast("Isi alamat server online (https://... atau wss://...) di pengaturan.", "");
      openSettings();
    }, 1500);
  }

  window.setTimeout(() => {
    finishBoot("Server tidak terjangkau. Buka pengaturan untuk mengganti server.");
  }, 3200);

  for (const button of document.querySelectorAll(".big-btn, .mini-btn")) {
    button.addEventListener("pointerdown", () => {
      audio.ensure();
    });
  }
}

init();
