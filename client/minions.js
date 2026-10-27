// Logika murni animasi minion (tanpa DOM/WebGL) agar bisa dites.

/**
 * Angka stabil dari id minion. Id dari server berupa string ("m-12"), jadi tidak boleh
 * dikalikan langsung: "m-12" * 1.3 adalah NaN dan membuat minion hilang dari layar.
 */
export function minionSeed(id) {
  const digits = String(id).replace(/\D/g, "");
  if (digits) return Number(digits) % 997;
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.codePointAt(0)) % 997;
  return hash;
}

/**
 * Pose per frame: goyang jalan, miring badan, ayunan senjata (lebih besar saat menyerang),
 * dan penyusutan saat mati. Semua nilai dijamin berhingga.
 */
export function minionPose(time, seed, { attacking = false, dyingProgress = 0 } = {}) {
  const phase = time * 9 + seed * 1.3;
  const stride = Math.sin(phase);
  const swing = attacking ? 0.4 + Math.abs(Math.sin(time * 18 + seed)) * 1.5 : 0.15 + stride * 0.22;
  const fade = Math.max(0, 1 - dyingProgress);
  return {
    bob: Math.abs(stride) * 2.4 * fade,
    tilt: stride * 0.08,
    armX: swing,
    shieldX: stride * 0.12,
    scale: fade,
    spin: dyingProgress * 1.4,
  };
}

/** Lama minion mati ditampilkan menyusut sebelum dihapus (ms). */
export const MINION_DEATH_MS = 260;
