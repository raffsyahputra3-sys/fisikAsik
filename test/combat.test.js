import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";
import { MATCH } from "../shared/constants.js";
import {
  ALERT_MERGE_MS,
  alertLabel,
  angleToward,
  collectHitEvents,
  hpTone,
  mergeAlert,
} from "../client/combat.js";

function fakeSocket() {
  return { readyState: 1, sent: [], send(raw) { this.sent.push(JSON.parse(raw)); }, close() {} };
}

function setup(startAt = 1_000_000) {
  const room = new Room("HIT01", "online");
  const a = room.addHuman({ name: "Alpha", heroId: "bastion", skillLevel: 2, socket: fakeSocket() }).player;
  const b = room.addHuman({ name: "Bravo", heroId: "ember", skillLevel: 2, socket: fakeSocket() }).player;
  room.setReady(a.id, true, startAt);
  room.setReady(b.id, true, startAt);
  room.lockHero(a.id, startAt);
  room.lockHero(b.id, startAt);
  room.tick(startAt + MATCH.countdown * 1000 + 50);
  for (const player of room.players.values()) player.invulnUntil = 0;
  return { room, a, b, now: startAt + 20_000 };
}

test("server mencatat penyerang hero, minion, dan menara pada lastHit", () => {
  const { room, a, b, now } = setup();
  assert.equal(b.lastHit, null);
  room.applyPlayerDamage(b, 20, a, now);
  assert.deepEqual(b.lastHit, { by: a.id, kind: "hero", at: now, amount: 20 });
  room.applyPlayerDamage(a, 7, null, now + 100, "minion");
  assert.deepEqual(a.lastHit, { by: null, kind: "minion", at: now + 100, amount: 7 });
  room.applyPlayerDamage(a, 22, null, now + 200, "tower");
  assert.equal(a.lastHit.kind, "tower");
});

test("lastHit ikut disnapshot dan tidak dicatat saat kebal", () => {
  const { room, a, b, now } = setup();
  b.invulnUntil = now + 5000;
  room.applyPlayerDamage(b, 20, a, now);
  assert.equal(b.lastHit, null, "serangan saat kebal tidak dihitung");
  b.invulnUntil = 0;
  room.applyPlayerDamage(b, 18, a, now + 10);
  const serialized = room.serializePlayerFor(a, b, now + 20);
  assert.equal(serialized.lastHit.by, a.id);
  assert.equal(serialized.lastHit.amount, 18);
});

const hit = (by, at, amount = 10, kind = "hero") => ({ by, kind, at, amount });

test("collectHitEvents: panggilan pertama hanya menyiapkan, hit baru memicu kejadian", () => {
  const players = [
    { id: "me", name: "AKU", lastHit: hit("e1", 100) },
    { id: "e1", name: "ARIA", lastHit: hit("me", 90) },
  ];
  const seen = new Map();
  assert.deepEqual(collectHitEvents(players, seen, "me", { prime: true }), []);
  assert.deepEqual(collectHitEvents(players, seen, "me"), [], "hit lama tidak diputar ulang");

  players[0].lastHit = hit("e1", 200, 25);
  players[1].lastHit = hit("me", 210, 12);
  const events = collectHitEvents(players, seen, "me");
  assert.deepEqual(events.map((event) => event.dir).sort(), ["in", "out"]);
  const incoming = events.find((event) => event.dir === "in");
  assert.equal(incoming.source.name, "ARIA");
  assert.equal(incoming.hit.amount, 25);
  assert.deepEqual(collectHitEvents(players, seen, "me"), [], "tidak ganda");
});

test("serangan antar pihak lain tidak memicu notifikasi", () => {
  const players = [
    { id: "me", name: "AKU", lastHit: null },
    { id: "a", name: "A", lastHit: hit("b", 5) },
    { id: "b", name: "B", lastHit: null },
  ];
  assert.deepEqual(collectHitEvents(players, new Map(), "me"), []);
});

test("label notifikasi menyebut penyerang atau jenis sumber", () => {
  const target = { id: "me", name: "AKU" };
  const aria = { id: "e1", name: "ARIA" };
  assert.equal(alertLabel({ dir: "in", hit: hit("e1", 1), target, source: aria }), "DISERANG ARIA");
  assert.equal(alertLabel({ dir: "in", hit: hit(null, 1, 5, "tower"), target, source: null }), "DISERANG MENARA");
  assert.equal(alertLabel({ dir: "in", hit: hit(null, 1, 5, "minion"), target, source: null }), "DISERANG MINION");
  assert.equal(alertLabel({ dir: "in", hit: hit(null, 1, 5, "other"), target, source: null }), "DISERANG SERANGAN");
  assert.equal(alertLabel({ dir: "out", hit: hit("me", 1), target: aria, source: target }), "MENGENAI ARIA");
});

test("mergeAlert menjumlahkan serangan beruntun dari sumber sama, memulai baru bila beda atau lama", () => {
  const target = { id: "me", name: "AKU" };
  const aria = { id: "e1", name: "ARIA" };
  const bayu = { id: "e2", name: "BAYU" };
  const event = (source, amount) => ({ dir: "in", hit: hit(source.id, 0, amount), target, source });

  let alert = mergeAlert(null, event(aria, 10), 1000);
  assert.deepEqual([alert.amount, alert.hits], [10, 1]);
  alert = mergeAlert(alert, event(aria, 15), 1000 + ALERT_MERGE_MS - 1);
  assert.deepEqual([alert.amount, alert.hits], [25, 2]);
  const other = mergeAlert(alert, event(bayu, 5), 1500);
  assert.equal(other.amount, 5);
  assert.equal(other.label, "DISERANG BAYU");
  const stale = mergeAlert(alert, event(aria, 8), alert.updatedAt + ALERT_MERGE_MS + 1);
  assert.equal(stale.amount, 8);
});

test("arah penyerang dan warna bar HP", () => {
  const origin = { x: 100, y: 100 };
  assert.ok(Math.abs(angleToward(origin, { x: 100, y: 0 })) < 1e-9, "atas layar = 0");
  assert.ok(Math.abs(angleToward(origin, { x: 200, y: 100 }) - Math.PI / 2) < 1e-9, "kanan");
  assert.ok(Math.abs(Math.abs(angleToward(origin, { x: 100, y: 200 })) - Math.PI) < 1e-9, "bawah");
  assert.deepEqual([1, 0.6, 0.4, 0.25, 0.1].map(hpTone), ["ok", "ok", "warn", "critical", "critical"]);
});
