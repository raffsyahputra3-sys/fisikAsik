// Config efek layar "Ganas & Mengerikan" per hero. Murni visual/audio: tidak menyentuh gameplay.
// Semua angka bisa di-tweak di sini tanpa mengubah kode logika.

export const FX_LEVELS = Object.freeze(["kalem", "normal", "ganas"]);
export const FX_TIERS = Object.freeze(["full", "medium", "lite"]);

/** Batas keras demi keamanan fotosensitif dan keterbacaan (PRD v1.8 FR-N4/N5). */
export const FX_LIMITS = Object.freeze({
  jumpscareMs: 300,
  flashMs: 200,
  gradeMs: 1000,
  shakeMs: 500,
});

/** Intensitas per level pilihan pemain. */
export const FX_LEVEL_RULES = Object.freeze({
  kalem: Object.freeze({ shake: 0, grade: 0, flash: false, jumpscare: false, stinger: 0.5 }),
  normal: Object.freeze({ shake: 0.6, grade: 0.5, flash: true, jumpscare: false, stinger: 0.8 }),
  ganas: Object.freeze({ shake: 1, grade: 1, flash: true, jumpscare: true, stinger: 1 }),
});

/** Tier performa (PRD v1.9 §105). Lite: grading hanya vignette, tanpa jumpscare. */
export const FX_TIER_RULES = Object.freeze({
  full: Object.freeze({ shake: 1, grade: 1, tint: true, jumpscare: true, particles: 1, afterimage: 7 }),
  medium: Object.freeze({ shake: 0.7, grade: 0.5, tint: true, jumpscare: true, particles: 0.6, afterimage: 4 }),
  lite: Object.freeze({ shake: 0.3, grade: 0.5, tint: false, jumpscare: false, particles: 0.25, afterimage: 2 }),
});

// Normal tanpa jumpscare: pemain baru tidak langsung dikagetkan; Ganas dipilih sendiri.
export const DEFAULT_FX_SETTINGS = Object.freeze({
  level: "normal",
  tier: "auto",
  flash: true,
  jumpscare: true,
  shake: true,
  shakeIntensity: 1,
});

export const HERO_FX = Object.freeze({
  bastion: Object.freeze({
    palette: Object.freeze(["#8B1A1A", "#D4AF37", "#1A1A1A"]),
    particles: Object.freeze({ full: 120, medium: 70, lite: 30 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([5, 7]),
    jumpscare: Object.freeze({ kind: "reog", ms: 250 }),
    sfx: Object.freeze({ hz: 80, endHz: 45, ms: 600, noise: 0.06 }),
    grade: Object.freeze({ color: "#8B1A1A", peak: 0.55, ms: 1000 }),
    shake: Object.freeze({ amp: 0.6, ms: 400 }),
    flash: Object.freeze({ color: "#D4AF37", ms: 150 }),
  }),
  vanguard: Object.freeze({
    palette: Object.freeze(["#5C3A1E", "#B8860B", "#1E3A5F"]),
    particles: Object.freeze({ full: 100, medium: 60, lite: 25 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([5, 7]),
    jumpscare: Object.freeze({ kind: "palapa", ms: 200 }),
    sfx: Object.freeze({ hz: 70, endHz: 50, ms: 700, noise: 0.05 }),
    grade: Object.freeze({ color: "#C2410C", peak: 0.5, ms: 1000 }),
    shake: Object.freeze({ amp: 0.4, ms: 300 }),
    flash: Object.freeze({ color: "#B8860B", ms: 150 }),
  }),
  shade: Object.freeze({
    palette: Object.freeze(["#2D0A3A", "#39FF14", "#F5F5DC"]),
    particles: Object.freeze({ full: 150, medium: 85, lite: 35 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([4, 6]),
    jumpscare: Object.freeze({ kind: "rangda", ms: 300 }),
    sfx: Object.freeze({ hz: 60, endHz: 140, ms: 500, noise: 0.1 }),
    grade: Object.freeze({ color: "#2D0A3A", peak: 0.85, ms: 1000 }),
    shake: Object.freeze({ amp: 0.5, ms: 200 }),
    flash: Object.freeze({ color: "#39FF14", ms: 120 }),
  }),
  ember: Object.freeze({
    palette: Object.freeze(["#0A4D4A", "#D4AF37", "#F0F8FF"]),
    particles: Object.freeze({ full: 130, medium: 75, lite: 30 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([5, 7]),
    jumpscare: Object.freeze({ kind: "eyes", ms: 200 }),
    sfx: Object.freeze({ hz: 55, endHz: 35, ms: 800, noise: 0.12 }),
    grade: Object.freeze({ color: "#0A4D4A", peak: 0.6, ms: 1000 }),
    shake: Object.freeze({ amp: 0.45, ms: 400 }),
    flash: Object.freeze({ color: "#F0F8FF", ms: 150 }),
  }),
  quill: Object.freeze({
    palette: Object.freeze(["#1B4D1B", "#8B4513", "#DC143C"]),
    particles: Object.freeze({ full: 90, medium: 55, lite: 20 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([4, 6]),
    jumpscare: Object.freeze({ kind: "animalEyes", ms: 200 }),
    sfx: Object.freeze({ hz: 90, endHz: 70, ms: 350, noise: 0.08 }),
    grade: Object.freeze({ color: "#0F2D0F", peak: 0.6, ms: 1000 }),
    shake: Object.freeze({ amp: 0.35, ms: 200 }),
    flash: Object.freeze({ color: "#DC143C", ms: 100 }),
  }),
  lumen: Object.freeze({
    palette: Object.freeze(["#4682B4", "#F0F8FF", "#DAA520"]),
    particles: Object.freeze({ full: 110, medium: 65, lite: 25 }),
    ultimateMs: 1000,
    showcaseSec: Object.freeze([5, 7]),
    jumpscare: Object.freeze({ kind: "smokeFace", ms: 200 }),
    sfx: Object.freeze({ hz: 110, endHz: 80, ms: 600, noise: 0.04 }),
    grade: Object.freeze({ color: "#4682B4", peak: 0.4, ms: 1000 }),
    shake: Object.freeze({ amp: 0.25, ms: 300 }),
    flash: Object.freeze({ color: "#F0F8FF", ms: 120 }),
  }),
});

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

/** Rapikan pengaturan dari penyimpanan: nilai tak dikenal kembali ke default. */
export function normalizeFxSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const defaults = DEFAULT_FX_SETTINGS;
  return {
    level: FX_LEVELS.includes(source.level) ? source.level : defaults.level,
    tier: source.tier === "auto" || FX_TIERS.includes(source.tier) ? source.tier : defaults.tier,
    flash: typeof source.flash === "boolean" ? source.flash : defaults.flash,
    jumpscare: typeof source.jumpscare === "boolean" ? source.jumpscare : defaults.jumpscare,
    shake: typeof source.shake === "boolean" ? source.shake : defaults.shake,
    shakeIntensity:
      source.shakeIntensity === undefined ? defaults.shakeIntensity : clamp01(Number(source.shakeIntensity)),
  };
}

/**
 * Gabungkan config hero, level, tier, dan pilihan aksesibilitas menjadi efek final.
 * Setiap bagian bernilai null bila tidak boleh tampil. `reducedMotion` mematikan
 * flash, getar, dan jumpscare.
 */
export function resolveFx(heroId, settings, tier = "full", { reducedMotion = false } = {}) {
  const hero = HERO_FX[heroId] ?? HERO_FX.bastion;
  const prefs = normalizeFxSettings(settings);
  const level = FX_LEVEL_RULES[prefs.level];
  const tierRules = FX_TIER_RULES[FX_TIERS.includes(tier) ? tier : "full"];

  const shakeAmount = hero.shake.amp * level.shake * tierRules.shake * prefs.shakeIntensity;
  const gradePeak = hero.grade.peak * level.grade * tierRules.grade;

  return {
    shake:
      prefs.shake && !reducedMotion && shakeAmount > 0
        ? { amount: shakeAmount, ms: Math.min(hero.shake.ms, FX_LIMITS.shakeMs) }
        : null,
    grade:
      gradePeak > 0
        ? {
            color: tierRules.tint ? hero.grade.color : "#000000",
            peak: Math.min(1, gradePeak),
            ms: Math.min(hero.grade.ms, FX_LIMITS.gradeMs),
          }
        : null,
    flash:
      level.flash && prefs.flash && !reducedMotion
        ? { color: hero.flash.color, ms: Math.min(hero.flash.ms, FX_LIMITS.flashMs) }
        : null,
    jumpscare:
      level.jumpscare && tierRules.jumpscare && prefs.jumpscare && !reducedMotion
        ? { kind: hero.jumpscare.kind, ms: Math.min(hero.jumpscare.ms, FX_LIMITS.jumpscareMs) }
        : null,
    stinger: { ...hero.sfx, gain: level.stinger },
  };
}

/** Turunkan tier satu langkah (full > medium > lite); lite tetap lite. */
export function lowerTier(tier) {
  const index = FX_TIERS.indexOf(tier);
  return FX_TIERS[Math.min(FX_TIERS.length - 1, Math.max(0, index) + 1)];
}
