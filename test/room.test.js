import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";
import { CLASH, MATCH } from "../shared/constants.js";

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

function setupRoom(now = 1_000_000) {
  const room = new Room("TEST1", "online");
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const playerA = room.addHuman({
    name: "Alpha",
    heroId: "bastion",
    skillLevel: 2,
    socket: socketA,
  }).player;
  const playerB = room.addHuman({
    name: "Bravo",
    heroId: "ember",
    skillLevel: 2,
    socket: socketB,
  }).player;
  room.setReady(playerA.id, true, now);
  room.setReady(playerB.id, true, now);
  room.lockHero(playerA.id, now);
  room.lockHero(playerB.id, now);
  room.tick(now + MATCH.countdown * 1000 + 50);
  return { room, playerA, playerB, socketA, socketB };
}

test("dua pemain siap memulai match setelah countdown", () => {
  const now = 2_000_000;
  const { room } = setupRoom(now);
  assert.equal(room.status, "playing");
  assert.ok(room.match);
  assert.equal(room.match.clashCount, 0);
  assert.equal(room.players.size, 6);
  assert.equal(room.towers.length, 12);
  assert.equal(room.nexuses.length, 2);
});

test("jawaban salah memberi Momentum Loss dan mengunci pemain", () => {
  const now = 3_000_000;
  const { room, playerA } = setupRoom(now);
  room.startClash(now + 1000);
  const clash = room.clash;
  const wrong = (clash.question.answer + 1) % 4;
  const answerAt = now + 1500;

  const result = room.answerQuiz(playerA.id, clash.id, wrong, answerAt);
  assert.equal(result.accepted, true);
  assert.equal(result.correct, false);
  assert.ok(playerA.slowUntil > answerAt);
  assert.equal(clash.answerStatus[playerA.index], "locked");

  const duplicate = room.answerQuiz(playerA.id, clash.id, clash.question.answer, answerAt + 100);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "locked");
});

test("jawaban benar pertama memenangkan Clash dan memberi Physics Edge", () => {
  const now = 4_000_000;
  const { room, playerA, playerB } = setupRoom(now);
  room.startClash(now + 1000);
  const clash = room.clash;

  const invalid = room.answerQuiz(playerA.id, clash.id, 9, now + 1100);
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "option");

  const stale = room.answerQuiz(playerA.id, "clash-tidak-ada", 0, now + 1100);
  assert.equal(stale.accepted, false);
  assert.equal(stale.reason, "clash-ended");

  const wrong = (clash.question.answer + 2) % 4;
  room.answerQuiz(playerA.id, clash.id, wrong, now + 1200);
  const winning = room.answerQuiz(playerB.id, clash.id, clash.question.answer, now + 1300);

  assert.equal(winning.accepted, true);
  assert.equal(winning.correct, true);
  assert.equal(room.clash.phase, "resolved");
  assert.equal(room.clash.winnerSlot, playerB.slot);
  assert.equal(playerB.insight, 1);
  assert.equal(playerB.super, 100);
  assert.equal(playerB.stats.clashWins, 1);
  assert.ok(playerB.edgeUntil > now + 1300);
  assert.equal(playerA.edgeUntil, 0);
});

test("kedua jawaban salah menyelesaikan Clash tanpa pemenang", () => {
  const now = 5_000_000;
  const { room, playerA, playerB } = setupRoom(now);
  room.startClash(now + 1000);
  const clash = room.clash;
  const wrongA = (clash.question.answer + 1) % 4;
  const wrongB = (clash.question.answer + 3) % 4;

  room.answerQuiz(playerA.id, clash.id, wrongA, now + 1200);
  room.answerQuiz(playerB.id, clash.id, wrongB, now + 1300);
  for (const other of room.players.values()) {
    if (other.id !== playerA.id && other.id !== playerB.id) room.answerQuiz(other.id, clash.id, wrongA, now + 1400);
  }

  assert.equal(room.clash.phase, "resolved");
  assert.equal(room.clash.winnerSlot, null);
  assert.equal(room.clash.reason, "bothWrong");
  assert.equal(playerA.edgeUntil, 0);
  assert.equal(playerB.edgeUntil, 0);
  assert.ok(playerA.slowUntil > now);
  assert.ok(playerB.slowUntil > now);
});

test("jawaban setelah timer habis ditolak", () => {
  const now = 6_000_000;
  const { room, playerA } = setupRoom(now);
  room.startClash(now + 1000);
  const clash = room.clash;
  const late = room.answerQuiz(
    playerA.id,
    clash.id,
    clash.question.answer,
    clash.endsAt + 1,
  );
  assert.equal(late.accepted, false);
  assert.equal(late.reason, "timeout");

  room.tick(clash.endsAt + 2);
  assert.equal(room.clash.phase, "resolved");
  assert.equal(room.clash.winnerSlot, null);
  assert.ok(room.clash.endsAt < CLASH.duration * 1000 + now + 1000 + 1000);
});

test("disconnect mengaktifkan AI takeover dan reconnect memulihkan kendali", () => {
  const now = 7_000_000;
  const { room, playerA } = setupRoom(now);
  room.startClash(now + 1000);

  room.handleDisconnect(playerA.id, now + 1500);
  assert.equal(playerA.connected, false);
  assert.equal(playerA.bot, true);
  assert.equal(playerA.socket, null);

  const resumedSocket = fakeSocket();
  const resumed = room.resumePlayer(playerA.id, resumedSocket, now + 2500);
  assert.ok(resumed.player);
  assert.equal(playerA.connected, true);
  assert.equal(playerA.bot, false);
  assert.equal(playerA.socket, resumedSocket);
  const welcome = resumedSocket.sent.find((message) => message.type === "welcome");
  assert.equal(welcome?.resumed, true);
  assert.equal(welcome?.playerId, playerA.id);

  room.handleDisconnect(playerA.id, now + 3000);
  const late = room.resumePlayer(playerA.id, fakeSocket(), now + 3000 + 60_001);
  assert.match(late.error ?? "", /reconnect/i);
});

test("pemain tidak dapat reconnect ketika sesi masih aktif", () => {
  const now = 8_000_000;
  const { room, playerA } = setupRoom(now);
  const result = room.resumePlayer(playerA.id, fakeSocket(), now + 1000);
  assert.match(result.error ?? "", /aktif/i);
});

test("Tali Usus: di bawah 30% HP, separuh damage menjadi perisai lalu cooldown", () => {
  const now = 3_000_000;
  const { room, playerA, playerB } = setupRoom(now);
  const t = now + MATCH.countdown * 1000 + 3000;
  playerA.hp = playerA.maxHp * 0.25;
  playerA.shield = 0;
  room.applyPlayerDamage(playerA, 40, playerB, t);
  assert.equal(playerA.hp, playerA.maxHp * 0.25 - 20);
  assert.equal(playerA.shield, 20);
  assert.ok(playerA.taliUntil > t);
  // setelah 5 detik efek habis, cooldown belum selesai
  const later = t + 6000;
  playerA.shield = 0;
  const hpBefore = playerA.hp;
  room.applyPlayerDamage(playerA, 10, playerB, later);
  assert.equal(playerA.hp, hpBefore - 10);
  assert.ok(later < playerA.taliReadyAt);
});

test("Tali Usus tidak aktif untuk hero lain", () => {
  const now = 4_000_000;
  const { room, playerA, playerB } = setupRoom(now);
  const t = now + MATCH.countdown * 1000 + 3000;
  playerB.hp = playerB.maxHp * 0.2;
  room.applyPlayerDamage(playerB, 10, playerA, t);
  assert.equal(playerB.hp, playerB.maxHp * 0.2 - 10);
  assert.equal(playerB.shield, 0);
});

test("Amukan Reog menurunkan damage sebesar 60% (80% saat empowered)", () => {
  const now = 5_000_000;
  const { room, playerA, playerB } = setupRoom(now);
  const t = now + MATCH.countdown * 1000 + 3000;
  playerA.guardUntil = t + 3000;
  playerA.guardFactor = 0.4;
  const hp = playerA.hp;
  room.applyPlayerDamage(playerA, 50, playerB, t);
  assert.equal(playerA.hp, hp - 20);
});

test("3v3: tim terisi 3 pemain dengan seat unik dan spawn berbeda", () => {
  const { room } = setupRoom(8_000_000);
  for (const team of [0, 1]) {
    const members = [...room.players.values()].filter((player) => player.slot === team);
    assert.equal(members.length, 3);
    assert.deepEqual(members.map((player) => player.seat).sort(), [0, 1, 2]);
    assert.equal(new Set(members.map((player) => `${player.x},${player.y}`)).size, 3);
  }
  const indices = [...room.players.values()].map((player) => player.index).sort();
  assert.deepEqual(indices, [0, 1, 2, 3, 4, 5]);
});

test("Nexus terlindungi sampai kedua menara satu lane hancur", () => {
  const now = 9_000_000;
  const { room, playerA } = setupRoom(now);
  const t = now + MATCH.countdown * 1000 + 3000;
  const nexus = room.nexuses.find((candidate) => candidate.team === 1);
  const before = nexus.hp;
  room.damageStructure(nexus, 100, playerA, t);
  assert.equal(nexus.hp, before);

  const midTowers = room.towers.filter((tower) => tower.team === 1 && tower.lane === "mid");
  const inner = midTowers.find((tower) => tower.tier === "inner");
  const outer = midTowers.find((tower) => tower.tier === "outer");
  // menara dalam tidak bisa dirusak sebelum menara luar jatuh
  room.damageStructure(inner, 50, playerA, t);
  assert.equal(inner.hp, inner.maxHp);
  room.damageStructure(outer, 9999, playerA, t);
  assert.equal(outer.alive, false);
  room.damageStructure(inner, 9999, playerA, t);
  assert.equal(inner.alive, false);
  assert.equal(room.isNexusExposed(1), true);
  room.damageStructure(nexus, 100, playerA, t);
  assert.equal(nexus.hp, before - 100);
});

test("gelombang minion muncul di tiga lane untuk kedua tim", () => {
  const now = 10_000_000;
  const { room } = setupRoom(now);
  room.spawnWave(now + 5000);
  const lanes = new Set(room.minions.map((minion) => `${minion.team}:${minion.lane}`));
  assert.equal(lanes.size, 6);
  assert.equal(room.minions.length, 18);
});

test("simulasi 90 detik: bot bergerak di lane tanpa error dan minion maju", () => {
  const start = 11_000_000;
  const { room } = setupRoom(start);
  const begin = start + MATCH.countdown * 1000 + 50;
  const spawnPositions = new Map([...room.players.values()].map((player) => [player.id, { x: player.x, y: player.y }]));
  const farthest = new Map();
  for (let step = 1; step <= 90 * 30; step += 1) {
    room.tick(begin + step * 33);
    for (const player of room.players.values()) {
      const from = spawnPositions.get(player.id);
      const away = Math.hypot(player.x - from.x, player.y - from.y);
      farthest.set(player.id, Math.max(farthest.get(player.id) ?? 0, away));
    }
    if (room.status === "ended") break;
  }
  assert.ok(room.status === "playing" || room.status === "ended");
  const moved = [...room.players.values()].filter((player) => (farthest.get(player.id) ?? 0) > 150);
  assert.ok(moved.length >= 4, `hanya ${moved.length} bot yang bergerak`);
  assert.ok(room.minions.length > 0);
  const advanced = room.minions.some((minion) => minion.waypoint > 1);
  assert.ok(advanced);
});

test("champion select: pick hero, kunci, hero lawan disembunyikan, lalu loading", () => {
  const now = 12_000_000;
  const room = new Room("SEL01", "online");
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const A = room.addHuman({ name: "A", heroId: "bastion", skillLevel: 2, socket: socketA }).player;
  const B = room.addHuman({ name: "B", heroId: "ember", skillLevel: 2, socket: socketB }).player;
  room.setReady(A.id, true, now);
  room.setReady(B.id, true, now);
  assert.equal(room.status, "select");
  assert.ok(room.selectEndsAt > now);
  assert.equal(room.players.size, 6);

  const lobbyA = socketA.sent.filter((m) => m.type === "lobby").at(-1);
  assert.equal(lobbyA.status, "select");
  const enemyView = lobbyA.players.filter((p) => p.slot !== A.slot);
  assert.ok(enemyView.every((p) => p.heroId === null), "hero lawan harus disembunyikan");
  assert.ok(lobbyA.players.filter((p) => p.slot === A.slot).every((p) => p.heroId));

  assert.equal(room.pickHero(A.id, "tidak-ada", now).error, "Hero tidak valid.");
  assert.ok(room.pickHero(A.id, "lumen", now).ok);
  assert.equal(A.heroId, "lumen");
  // bot satu tim tidak boleh kembar dengan hero manusia
  const mates = [...room.players.values()].filter((p) => p.slot === A.slot && p.bot);
  assert.ok(mates.every((bot) => bot.heroId !== "lumen"));

  assert.ok(room.lockHero(A.id, now + 1000).ok);
  assert.equal(room.status, "select");
  assert.equal(room.pickHero(A.id, "shade", now + 1100).error, "Tidak bisa memilih sekarang.");

  // B belum mengunci: waktu habis memaksa kunci otomatis lalu loading
  room.tick(room.selectEndsAt + 10);
  assert.equal(room.status, "countdown");
  assert.ok(B.locked);
  const lobbyB = socketB.sent.filter((m) => m.type === "lobby").at(-1);
  assert.ok(lobbyB.players.every((p) => p.heroId), "lineup terbuka saat loading");
  room.tick(room.countdownAt + 10);
  assert.equal(room.status, "playing");
});

test("champion select: hero yang dikunci rekan tim manusia tidak bisa dipilih", () => {
  const now = 13_000_000;
  const room = new Room("SEL02", "online");
  const A = room.addHuman({ name: "A", heroId: "bastion", skillLevel: 2, socket: fakeSocket() }).player;
  const B = room.addHuman({ name: "B", heroId: "ember", skillLevel: 2, socket: fakeSocket() }).player;
  // paksa B ke tim A agar menjadi rekan
  room.teams[B.slot][B.seat] = null;
  B.slot = A.slot;
  B.seat = 1;
  B.index = B.slot * 3 + 1;
  room.teams[A.slot][1] = B.id;
  room.setReady(A.id, true, now);
  room.setReady(B.id, true, now);
  assert.ok(room.lockHero(A.id, now).ok);
  assert.equal(room.pickHero(B.id, "bastion", now).error, "Hero itu sudah dikunci rekan satu tim.");
  assert.ok(room.pickHero(B.id, "quill", now).ok);
});

test("sinyal minimap: hanya rekan tim yang menerima, ada batas kecepatan, bot rekan bergerak", () => {
  const now = 14_000_000;
  const room = new Room("PING1", "online");
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const A = room.addHuman({ name: "A", heroId: "bastion", skillLevel: 2, socket: socketA }).player;
  const B = room.addHuman({ name: "B", heroId: "ember", skillLevel: 2, socket: socketB }).player;
  // jadikan B rekan satu tim A
  room.teams[B.slot][B.seat] = null;
  B.slot = A.slot;
  B.seat = 1;
  B.index = B.slot * 3 + 1;
  room.teams[A.slot][1] = B.id;
  room.setReady(A.id, true, now);
  room.setReady(B.id, true, now);
  room.lockHero(A.id, now);
  room.lockHero(B.id, now);
  room.tick(now + MATCH.countdown * 1000 + 50);
  assert.equal(room.status, "playing");
  const t = now + MATCH.countdown * 1000 + 3000;

  assert.equal(room.handlePing(A.id, { kind: "go", x: 1300, y: 750 }, t).ok, true);
  const gotB = socketB.sent.filter((m) => m.type === "signal");
  assert.equal(gotB.length, 1);
  assert.deepEqual([gotB[0].kind, gotB[0].x, gotB[0].y, gotB[0].name], ["go", 1300, 750, "A"]);

  // bot rekan satu tim menuju titik; bot lawan tidak
  const mateBot = [...room.players.values()].find((p) => p.bot && p.slot === A.slot);
  const enemyBot = [...room.players.values()].find((p) => p.bot && p.slot !== A.slot);
  assert.ok(mateBot.pingUntil > t);
  assert.equal(enemyBot.pingUntil, 0);

  // batas kecepatan dan validasi
  assert.equal(room.handlePing(A.id, { kind: "go", x: 1, y: 1 }, t + 200).error, "cooldown");
  assert.equal(room.handlePing(A.id, { kind: "go", x: "abc", y: 1 }, t + 3000).error, "invalid");
  assert.equal(room.handlePing(A.id, { kind: "danger", x: 99999, y: -50 }, t + 3000).ok, true);
  const danger = socketB.sent.filter((m) => m.type === "signal").at(-1);
  assert.equal(danger.kind, "danger");
  assert.equal(danger.x, 2600);
  assert.equal(danger.y, 0);
});
