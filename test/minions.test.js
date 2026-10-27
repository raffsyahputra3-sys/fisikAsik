import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";
import { LANE_IDS, MATCH, TEAM } from "../shared/constants.js";
import { MINION_SKINS, hexToNumber, minionSkin, minionVariant } from "../shared/minions.js";
import { MINION_DEATH_MS, minionPose, minionSeed } from "../client/minions.js";

function fakeSocket() {
  return { readyState: 1, sent: [], send(raw) { this.sent.push(JSON.parse(raw)); }, close() {} };
}

function startedRoom(startAt = 1_000_000) {
  const room = new Room("MIN01", "online");
  const socket = fakeSocket();
  const a = room.addHuman({ name: "Alpha", heroId: "bastion", skillLevel: 2, socket }).player;
  const b = room.addHuman({ name: "Bravo", heroId: "ember", skillLevel: 2, socket: fakeSocket() }).player;
  room.setReady(a.id, true, startAt);
  room.setReady(b.id, true, startAt);
  room.lockHero(a.id, startAt);
  room.lockHero(b.id, startAt);
  room.tick(startAt + MATCH.countdown * 1000 + 50);
  return { room, socket, now: startAt + MATCH.countdown * 1000 + 50 };
}

test("regresi: id minion dari server berupa string, dan pose tetap berhingga (bukan NaN)", () => {
  // bug lama: "m-12" * 1.3 adalah NaN sehingga minion tidak pernah tergambar
  assert.ok(Number.isNaN("m-12" * 1.3));
  for (const id of ["m-1", "m-12", "m-4096", "tanpa-angka", 7]) {
    const seed = minionSeed(id);
    assert.ok(Number.isFinite(seed), String(id));
    for (const time of [0, 0.5, 123.456, 99999]) {
      for (const options of [{}, { attacking: true }, { dyingProgress: 0.5 }, { dyingProgress: 1 }]) {
        const pose = minionPose(time, seed, options);
        for (const [key, value] of Object.entries(pose)) {
          assert.ok(Number.isFinite(value), `${id} ${key}`);
        }
      }
    }
  }
  assert.equal(minionSeed("m-12"), minionSeed("m-12"));
  assert.notEqual(minionSeed("m-12"), minionSeed("m-13"));
});

test("pose: menyerang mengayun lebih jauh, mati menyusut sampai nol", () => {
  const idle = minionPose(1, 3, {});
  const attack = minionPose(1, 3, { attacking: true });
  assert.ok(attack.armX > idle.armX);
  assert.equal(minionPose(1, 3, { dyingProgress: 1 }).scale, 0);
  assert.ok(minionPose(1, 3, { dyingProgress: 0.5 }).scale < 1);
  assert.ok(MINION_DEATH_MS > 0 && MINION_DEATH_MS <= 500);
});

test("skin faksi: palet sesuai spesifikasi dan bentuk berbeda (aman buta warna)", () => {
  const samudra = minionSkin(TEAM.BLUE);
  const merapi = minionSkin(TEAM.RED);
  assert.equal(samudra.faction, "Samudra");
  assert.equal(merapi.faction, "Merapi");
  assert.deepEqual(
    [samudra.palette.main, samudra.palette.dark, samudra.palette.light],
    ["#1E90FF", "#0A4D4A", "#F0F8FF"],
  );
  assert.deepEqual(
    [merapi.palette.main, merapi.palette.light, merapi.palette.dark],
    ["#8B1A1A", "#D4AF37", "#1A1A1A"],
  );
  for (const key of ["melee", "ranged", "shield", "outfit"]) {
    assert.notEqual(samudra[key], merapi[key], `${key} harus beda bentuk, bukan hanya warna`);
  }
  assert.equal(hexToNumber("#1E90FF"), 0x1e90ff);
  assert.equal(minionSkin(99), MINION_SKINS[TEAM.BLUE], "tim tak dikenal kembali ke Samudra");
});

test("varian: tiap lane berisi dua petarung dan satu pemanah", () => {
  assert.deepEqual([0, 1, 2].map(minionVariant), ["melee", "melee", "ranged"]);
});

test("gelombang minion: dua tim, tiga lane, varian dan id string terkirim ke client", () => {
  const { room, socket, now } = startedRoom();
  room.spawnWave(now);
  room.broadcastState(now + 10);
  const state = [...socket.sent].reverse().find((message) => message.type === "state");
  assert.ok(state, "snapshot state terkirim");
  const minions = state.minions;
  assert.equal(minions.length, 2 * LANE_IDS.length * MATCH.minionsPerWave);
  for (const team of [TEAM.BLUE, TEAM.RED]) {
    for (const lane of LANE_IDS) {
      const group = minions.filter((minion) => minion.team === team && minion.lane === lane);
      assert.deepEqual(group.map((minion) => minion.variant).sort(), ["melee", "melee", "ranged"]);
    }
  }
  for (const minion of minions) {
    assert.equal(typeof minion.id, "string");
    assert.ok(Number.isFinite(minionSeed(minion.id)));
    assert.ok(Number.isFinite(minion.x) && Number.isFinite(minion.y));
    assert.equal(minion.attacking, false);
  }
});

test("minion yang baru menyerang ditandai attacking sebentar saja", () => {
  const { room, socket, now } = startedRoom();
  room.spawnWave(now);
  const minion = room.minions[0];
  minion.attackedAt = now + 100;
  room.broadcastState(now + 200);
  let state = [...socket.sent].reverse().find((message) => message.type === "state");
  assert.equal(state.minions.find((entry) => entry.id === minion.id).attacking, true);
  room.broadcastState(now + 100 + 400);
  state = [...socket.sent].reverse().find((message) => message.type === "state");
  assert.equal(state.minions.find((entry) => entry.id === minion.id).attacking, false);
});

test("batas jumlah minion per tim tetap berlaku", () => {
  const { room, now } = startedRoom();
  for (let wave = 0; wave < 12; wave += 1) room.spawnWave(now + wave);
  for (const team of [TEAM.BLUE, TEAM.RED]) {
    assert.ok(room.minions.filter((minion) => minion.team === team).length <= 36 + LANE_IDS.length * MATCH.minionsPerWave);
  }
});
