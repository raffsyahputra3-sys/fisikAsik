import test from "node:test";
import assert from "node:assert/strict";
import { COMBAT } from "../shared/constants.js";
import { HEROES } from "../shared/heroes.js";

const heroes = Object.values(HEROES);
const TTK_MIN = 10;
const TTK_MAX = 21;
const EPSILON = 1e-9;

/** Waktu (detik) tembakan ke-n dari penuh amunisi: interval hero, lalu isi ulang 1 peluru per reloadTime. */
function timeOfShot(hero, shotCount) {
  let time = 0;
  for (let k = 1; k < shotCount; k += 1) {
    const reloadAt = k >= COMBAT.maxAmmo ? (k - COMBAT.maxAmmo + 1) * COMBAT.reloadTime : 0;
    time = Math.max(time + hero.attackInterval, reloadAt);
  }
  return time;
}

/** TTK level 1: semua tembakan kena, tanpa shield, skill, atau knockback. */
function timeToKill(attacker, victim) {
  return timeOfShot(attacker, Math.ceil(victim.maxHp / attacker.damage));
}

test("TTK level 1 semua pasangan hero berada di 10-21 detik", () => {
  for (const attacker of heroes) {
    for (const victim of heroes) {
      const ttk = timeToKill(attacker, victim);
      assert.ok(
        ttk >= TTK_MIN - EPSILON && ttk <= TTK_MAX + EPSILON,
        `${attacker.name} -> ${victim.name}: ${ttk.toFixed(2)} dtk di luar ${TTK_MIN}-${TTK_MAX}`,
      );
    }
  }
});

test("duel mentah: tidak ada hero yang menang 5-0 atau kalah 0-5", () => {
  const wins = new Map(heroes.map((hero) => [hero.id, 0]));
  const losses = new Map(heroes.map((hero) => [hero.id, 0]));
  for (const a of heroes) {
    for (const b of heroes) {
      if (a.id >= b.id) continue;
      const aKills = timeToKill(a, b);
      const bKills = timeToKill(b, a);
      if (aKills < bKills) {
        wins.set(a.id, wins.get(a.id) + 1);
        losses.set(b.id, losses.get(b.id) + 1);
      } else if (bKills < aKills) {
        wins.set(b.id, wins.get(b.id) + 1);
        losses.set(a.id, losses.get(a.id) + 1);
      }
    }
  }
  const opponents = heroes.length - 1;
  for (const hero of heroes) {
    assert.ok(wins.get(hero.id) < opponents, `${hero.name} menang ${opponents}-0`);
    assert.ok(losses.get(hero.id) < opponents, `${hero.name} kalah ${opponents}-0`);
  }
});
