import test from "node:test";
import assert from "node:assert/strict";
import { HEROES } from "../shared/heroes.js";
import {
  DEFAULT_FX_SETTINGS,
  FX_LIMITS,
  FX_TIERS,
  HERO_FX,
  lowerTier,
  normalizeFxSettings,
  resolveFx,
} from "../shared/fx.js";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const GANAS = { ...DEFAULT_FX_SETTINGS, level: "ganas" };

test("setiap hero punya config efek yang lengkap dan dalam batas aman", () => {
  for (const id of Object.keys(HEROES)) {
    const fx = HERO_FX[id];
    assert.ok(fx, `config efek ${id}`);
    assert.equal(fx.palette.length, 3, id);
    for (const color of [...fx.palette, fx.grade.color, fx.flash.color]) assert.match(color, HEX, id);
    assert.ok(fx.particles.full > fx.particles.medium && fx.particles.medium > fx.particles.lite, id);
    assert.ok(fx.jumpscare.ms > 0 && fx.jumpscare.ms <= FX_LIMITS.jumpscareMs, `${id} jumpscare`);
    assert.ok(fx.flash.ms > 0 && fx.flash.ms <= FX_LIMITS.flashMs, `${id} flash`);
    assert.ok(fx.grade.ms <= FX_LIMITS.gradeMs, `${id} grading`);
    assert.ok(fx.shake.ms <= FX_LIMITS.shakeMs && fx.shake.amp > 0 && fx.shake.amp <= 1, `${id} shake`);
    assert.ok(fx.ultimateMs <= 1000, id);
  }
});

test("default Normal: efek visual tampil tetapi tanpa jumpscare", () => {
  assert.equal(DEFAULT_FX_SETTINGS.level, "normal");
  const fx = resolveFx("shade", DEFAULT_FX_SETTINGS, "full");
  assert.equal(fx.jumpscare, null);
  assert.ok(fx.grade && fx.flash && fx.shake);
});

test("level Kalem mematikan semua efek visual", () => {
  const fx = resolveFx("shade", { ...DEFAULT_FX_SETTINGS, level: "kalem" }, "full");
  assert.equal(fx.shake, null);
  assert.equal(fx.grade, null);
  assert.equal(fx.flash, null);
  assert.equal(fx.jumpscare, null);
});

test("level Normal tanpa jumpscare, Ganas dengan semua efek", () => {
  const normal = resolveFx("shade", { ...DEFAULT_FX_SETTINGS, level: "normal" }, "full");
  assert.equal(normal.jumpscare, null);
  assert.ok(normal.shake && normal.grade && normal.flash);

  const ganas = resolveFx("shade", { ...DEFAULT_FX_SETTINGS, level: "ganas" }, "full");
  assert.deepEqual(ganas.jumpscare, { kind: "rangda", ms: 300 });
  assert.ok(ganas.grade.peak > normal.grade.peak);
  assert.ok(ganas.shake.amount > normal.shake.amount);
});

test("toggle aksesibilitas mematikan flash, getar, dan jumpscare satu per satu", () => {
  const base = { ...DEFAULT_FX_SETTINGS, level: "ganas" };
  assert.equal(resolveFx("bastion", { ...base, flash: false }, "full").flash, null);
  assert.equal(resolveFx("bastion", { ...base, shake: false }, "full").shake, null);
  assert.equal(resolveFx("bastion", { ...base, jumpscare: false }, "full").jumpscare, null);
  assert.equal(resolveFx("bastion", { ...base, shakeIntensity: 0 }, "full").shake, null);
  const half = resolveFx("bastion", { ...base, shakeIntensity: 0.5 }, "full").shake.amount;
  const full = resolveFx("bastion", base, "full").shake.amount;
  assert.ok(Math.abs(half * 2 - full) < 1e-9);
});

test("prefers-reduced-motion mematikan flash, getar, dan jumpscare", () => {
  const fx = resolveFx("ember", GANAS, "full", { reducedMotion: true });
  assert.equal(fx.flash, null);
  assert.equal(fx.shake, null);
  assert.equal(fx.jumpscare, null);
  assert.ok(fx.grade, "grading boleh tetap tampil");
});

test("tier Lite: tanpa jumpscare, grading hanya vignette gelap, getar dikurangi", () => {
  const full = resolveFx("lumen", GANAS, "full");
  const lite = resolveFx("lumen", GANAS, "lite");
  assert.equal(lite.jumpscare, null);
  assert.equal(lite.grade.color, "#000000");
  assert.ok(lite.shake.amount < full.shake.amount);
  assert.ok(resolveFx("lumen", GANAS, "medium").jumpscare);
});

test("pengaturan tersimpan dirapikan dan tier turun bertahap", () => {
  assert.deepEqual(normalizeFxSettings(null), DEFAULT_FX_SETTINGS);
  const messy = normalizeFxSettings({ level: "gila", tier: "x", flash: "ya", shakeIntensity: 7 });
  assert.equal(messy.level, DEFAULT_FX_SETTINGS.level);
  assert.equal(messy.tier, "auto");
  assert.equal(messy.flash, true);
  assert.equal(messy.shakeIntensity, 1);
  assert.deepEqual(FX_TIERS.map(lowerTier), ["medium", "lite", "lite"]);
});
