import { HERO_FX } from "../shared/fx.js";
import { getHero } from "../shared/heroes.js";

// Efek khas hero di kartu karakter lobi: partikel ambient sesuai legenda dan "showcase"
// (3,6 detik: pose serang, ledakan partikel, cincin energi, nama ultimate).
// Tanpa state: semua posisi dihitung dari waktu, jadi aman dipanggil tiap frame.

export const SHOWCASE_MS = 3600;

const LEVEL_DENSITY = { kalem: 0.35, normal: 0.7, ganas: 1 };
const AMBIENT = {
  bastion: "reog",
  vanguard: "map",
  shade: "flame",
  ember: "water",
  quill: "forest",
  lumen: "rain",
};

function hash(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** 0..1 selama showcase berjalan, null di luar itu. */
export function showcaseProgress(time, startedAt) {
  if (!Number.isFinite(startedAt)) return null;
  const elapsed = time - startedAt;
  return elapsed >= 0 && elapsed < SHOWCASE_MS ? elapsed / SHOWCASE_MS : null;
}

/** Nilai pose untuk model 3D selama showcase: serang tiga kali berturut-turut, wajah garang. */
export function showcasePose(time, startedAt) {
  const progress = showcaseProgress(time, startedAt);
  if (progress === null) return null;
  const seconds = progress * (SHOWCASE_MS / 1000);
  const pulse = Math.max(0, Math.sin((seconds - 0.35) * Math.PI * 1.6));
  return { expression: seconds < 0.3 ? "idle" : "angry", attack: seconds > 0.35 && seconds < 2.6 ? pulse : 0 };
}

function glow(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function sparkle(ctx, x, y, radius, color, alpha) {
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Fase 0..1 partikel ke-`index`; `speed` dalam siklus per detik. */
function phaseOf(index, seconds, speed) {
  return (seconds * speed * (0.6 + hash(index, 3) * 0.8) + hash(index, 1)) % 1;
}

const KINDS = {
  // Warok Suro: bara emas naik, bulu merak melayang jatuh, kabut debu merah di kaki.
  reog(ctx, w, h, seconds, count, boost, [dark, gold]) {
    glow(ctx, w * 0.5, h * 0.9, w * 0.42, dark, 0.32 * boost);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.28);
      const x = w * (0.18 + 0.64 * hash(i, 2)) + Math.sin(seconds * 2 + i) * 8;
      sparkle(ctx, x, h * (0.92 - life * 0.78), 1.4 + hash(i, 4) * 2.4, gold, Math.sin(life * Math.PI) * 0.85);
    }
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < Math.ceil(count / 4); i += 1) {
      const life = phaseOf(i, seconds, 0.12);
      const x = w * (0.1 + 0.8 * hash(i, 7)) + Math.sin(seconds * 1.4 + i * 2) * 22;
      ctx.save();
      ctx.translate(x, h * (0.05 + life * 0.85));
      ctx.rotate(Math.sin(seconds * 1.6 + i) * 0.9);
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
      ctx.fillStyle = i % 2 ? "#0f766e" : "#14b8a6";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.ellipse(0, -2, 1.3, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // Patih Gajah: cincin riak peta di lantai, ombak emas, percikan Sumpah Palapa.
  map(ctx, w, h, seconds, count, boost, [, gold]) {
    for (let ring = 0; ring < 3; ring += 1) {
      const life = (seconds * 0.35 + ring / 3) % 1;
      ctx.globalAlpha = (1 - life) * 0.5 * Math.min(1.6, boost);
      ctx.strokeStyle = "#7fb0e6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.86, w * (0.12 + life * 0.3), h * (0.03 + life * 0.07), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22 * boost;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;
    for (let line = 0; line < 3; line += 1) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * (0.9 + line * 0.025) + Math.sin(x * 0.03 + seconds * 2 + line) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.25);
      sparkle(ctx, w * (0.2 + 0.6 * hash(i, 2)), h * (0.9 - life * 0.7), 1.2 + hash(i, 4) * 2, gold, Math.sin(life * Math.PI) * 0.8);
    }
    ctx.globalCompositeOperation = "source-over";
  },

  // Leak Bali: api ungu mengepul, kabut pekat, percikan hijau.
  flame(ctx, w, h, seconds, count, boost, [dark, green]) {
    for (let i = 0; i < 4; i += 1) {
      const drift = (seconds * 0.04 + hash(i, 5)) % 1;
      glow(ctx, w * (-0.1 + drift * 1.2), h * (0.55 + hash(i, 6) * 0.35), w * 0.35, "#6d28d9", 0.16 * boost);
    }
    glow(ctx, w * 0.5, h * 0.88, w * 0.4, dark, 0.35);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.45);
      const x = w * (0.22 + 0.56 * hash(i, 2)) + Math.sin(seconds * 3 + i) * 10 * life;
      const y = h * (0.9 - life * 0.75);
      const size = (1 - life) * (5 + hash(i, 4) * 7);
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.7;
      ctx.fillStyle = i % 3 ? "#a855f7" : "#c084fc";
      ctx.beginPath();
      ctx.moveTo(x, y - size * 2.2);
      ctx.quadraticCurveTo(x + size, y - size * 0.3, x, y + size * 0.6);
      ctx.quadraticCurveTo(x - size, y - size * 0.3, x, y - size * 2.2);
      ctx.fill();
      if (i % 5 === 0) sparkle(ctx, x + 12, y - size * 3, 1.6, green, Math.sin(life * Math.PI));
    }
    ctx.globalCompositeOperation = "source-over";
  },

  // Nyi Roro: gelembung air naik, kilau mutiara, riak laut di kaki.
  water(ctx, w, h, seconds, count, boost, [sea, , pearl]) {
    glow(ctx, w * 0.5, h * 0.9, w * 0.4, sea, 0.4 * boost);
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.3 * boost;
    for (let line = 0; line < 3; line += 1) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * (0.88 + line * 0.03) + Math.sin(x * 0.04 + seconds * 1.6 + line * 2) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.2);
      const x = w * (0.16 + 0.68 * hash(i, 2)) + Math.sin(seconds * 1.8 + i) * 9;
      const y = h * (0.92 - life * 0.85);
      const radius = 2.5 + hash(i, 4) * 6;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.75;
      ctx.strokeStyle = "#a7f3d0";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pearl;
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.9;
      ctx.beginPath();
      ctx.arc(x - radius * 0.35, y - radius * 0.35, Math.max(0.8, radius * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < Math.ceil(count / 3); i += 1) {
      const twinkle = Math.max(0, Math.sin(seconds * 3 + i * 1.7));
      sparkle(ctx, w * (0.15 + 0.7 * hash(i, 8)), h * (0.2 + 0.6 * hash(i, 9)), 1.2 + twinkle * 2, pearl, twinkle * 0.9);
    }
    ctx.globalCompositeOperation = "source-over";
  },

  // Sipet Dayak: daun berguguran, kunang-kunang hutan, tetes racun merah.
  forest(ctx, w, h, seconds, count, boost, [forest, , blood]) {
    glow(ctx, w * 0.5, h * 0.92, w * 0.4, forest, 0.4 * boost);
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.14);
      const x = w * hash(i, 2) + Math.sin(seconds * 1.5 + i * 1.3) * 24;
      ctx.save();
      ctx.translate(x, h * (0.02 + life * 0.9));
      ctx.rotate(seconds * (0.8 + hash(i, 5)) + i);
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.85;
      ctx.fillStyle = i % 2 ? "#4ade80" : "#16a34a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < Math.ceil(count / 3); i += 1) {
      const blink = Math.max(0, Math.sin(seconds * 2.2 + i * 2.1));
      sparkle(
        ctx,
        w * (0.1 + 0.8 * hash(i, 8)) + Math.sin(seconds + i) * 12,
        h * (0.3 + 0.55 * hash(i, 9)) + Math.cos(seconds * 1.2 + i) * 8,
        1.5 + blink * 1.8,
        "#fde047",
        blink * 0.9,
      );
    }
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 4; i += 1) {
      const life = phaseOf(i, seconds, 0.55);
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
      ctx.fillStyle = blood;
      ctx.beginPath();
      ctx.ellipse(w * (0.6 + hash(i, 6) * 0.2), h * (0.55 + life * 0.3), 1.6, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Pawang Hujan: hujan miring, asap dupa melebar, kilau kunyit.
  rain(ctx, w, h, seconds, count, boost, [sky, , gold]) {
    glow(ctx, w * 0.5, h * 0.9, w * 0.4, sky, 0.28 * boost);
    ctx.strokeStyle = "#bcd8f0";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < count; i += 1) {
      const life = phaseOf(i, seconds, 0.9);
      const x = w * hash(i, 2) - life * 18;
      const y = h * (-0.05 + life * 1.05);
      ctx.globalAlpha = Math.sin(life * Math.PI) * 0.55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 12);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i += 1) {
      const life = phaseOf(i, seconds, 0.12);
      const radius = w * (0.04 + life * 0.1);
      glow(ctx, w * (0.7 + Math.sin(seconds * 0.8 + i) * 0.04), h * (0.62 - life * 0.45), radius, "#e2e8f0", Math.sin(life * Math.PI) * 0.22);
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < Math.ceil(count / 4); i += 1) {
      const twinkle = Math.max(0, Math.sin(seconds * 2.6 + i * 1.9));
      sparkle(ctx, w * (0.12 + 0.76 * hash(i, 8)), h * (0.25 + 0.55 * hash(i, 9)), 1.2 + twinkle * 1.8, gold, twinkle * 0.8);
    }
    ctx.globalCompositeOperation = "source-over";
  },
};

/**
 * Gambar efek khas hero di atas potret lobi.
 * fx: { level, tier, showcaseAt, density?, compact?, reducedMotion? }.
 */
export function drawLobbyFx(ctx, width, height, heroId, time, fx = {}) {
  const config = HERO_FX[heroId] ?? HERO_FX.bastion;
  const kind = KINDS[AMBIENT[heroId] ?? "reog"];
  const progress = fx.reducedMotion ? null : showcaseProgress(time, fx.showcaseAt);
  const bell = progress === null ? 0 : Math.sin(progress * Math.PI);
  const boost = 1 + bell * 1.6;
  const density = (LEVEL_DENSITY[fx.level] ?? 0.7) * (fx.density ?? 1) * (fx.reducedMotion ? 0.3 : 1);
  const tierCount = config.particles[fx.tier] ?? config.particles.full;
  const count = Math.min(120, Math.round(tierCount * 0.4 * density * boost));
  const seconds = fx.reducedMotion ? 0 : time / 1000;

  ctx.save();
  kind(ctx, width, height, seconds, count, boost, config.palette);
  ctx.restore();

  // kartu kecil (compact) hanya memakai partikel; cincin, vignette, dan judul untuk potret besar
  if (progress === null || fx.compact) return;

  // showcase: cincin energi, vignette warna hero, dan nama ultimate
  const base = Math.min(width, height);
  const color = config.flash.color;
  ctx.save();
  const ease = 1 - (1 - Math.min(1, progress * 1.6)) ** 3;
  ctx.globalAlpha = Math.max(0, 1 - progress * 1.4) * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 + (1 - progress) * 6;
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.55, base * (0.1 + ease * 0.55), base * (0.05 + ease * 0.3), 0, 0, Math.PI * 2);
  ctx.stroke();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, base * 0.25, width / 2, height / 2, base * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, config.grade.color);
  ctx.globalAlpha = bell * Math.min(0.55, config.grade.peak * 0.7);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const title = getHero(heroId).ultimate?.name ?? "";
  if (title) {
    const appear = Math.min(1, progress * 5) * Math.min(1, (1 - progress) * 4);
    ctx.globalAlpha = appear;
    ctx.textAlign = "center";
    ctx.font = `900 ${Math.max(14, base * 0.058)}px "Trebuchet MS", sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(3, 16, 24, 0.9)";
    ctx.fillStyle = color;
    const y = height * 0.12 - (1 - Math.min(1, progress * 4)) * 14;
    ctx.strokeText(title.toUpperCase(), width / 2, y);
    ctx.fillText(title.toUpperCase(), width / 2, y);
  }
  ctx.restore();
}
