import { ARENA, TEAM } from "../shared/constants.js";
import { getHero } from "../shared/heroes.js";
import { clamp } from "../shared/physics.js";

export const OUTLINE = "#041018";
export const TEAM_COLORS = ["#45c3ff", "#ff5d7d"];
export const TEAM_DARK = ["#1274d4", "#c92e56"];

export function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const decorRandom = mulberry32(20261025);
const TUFT = Array.from({ length: 46 }, () => ({
  x: 80 + decorRandom() * (ARENA.width - 160),
  y: 80 + decorRandom() * (ARENA.height - 160),
  size: 6 + decorRandom() * 11,
  flip: decorRandom() > 0.5,
}));
const FLOWER = Array.from({ length: 22 }, () => ({
  x: 100 + decorRandom() * (ARENA.width - 200),
  y: 90 + decorRandom() * (ARENA.height - 180),
  color: decorRandom() > 0.5 ? "#ffe36d" : "#f9a8d4",
  size: 3 + decorRandom() * 3,
}));

function drawFace(ctx, skin, cy = -6, options = {}) {
  ctx.fillStyle = skin;
  ellipse(ctx, 0, cy, 15, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = options.eye ?? "#1b1210";
  ellipse(ctx, -5.5, cy + 1.5, 2.8, 3.8);
  ctx.fill();
  ellipse(ctx, 5.5, cy + 1.5, 2.8, 3.8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ellipse(ctx, -4.6, cy + 0.2, 1, 1.3);
  ctx.fill();
  ellipse(ctx, 6.4, cy + 0.2, 1, 1.3);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4.5, cy + 8);
  ctx.quadraticCurveTo(0, cy + (options.grin ? 13 : 11), 4.5, cy + 8);
  ctx.stroke();
  ctx.lineWidth = 3.6;
}

function bodyGradient(ctx, top, mid, bottom, y0 = -28, y1 = 28) {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.45, mid);
  gradient.addColorStop(1, bottom);
  return gradient;
}

// Warok Suro: jawara Ponorogo bertelanjang dada, sabuk tali usus, dhadhak merak.
function drawWarok(ctx, hero, time) {
  // dhadhak merak: kipas bulu merak di punggung
  for (let index = 0; index < 9; index += 1) {
    const angle = -Math.PI + 0.2 + (index / 8) * (Math.PI - 0.4);
    ctx.save();
    ctx.translate(0, -4);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = index % 2 ? "#0f766e" : "#14b8a6";
    ellipse(ctx, 0, -38, 7, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ellipse(ctx, 0, -43, 3.4, 4.6);
    ctx.fill();
    ctx.fillStyle = "#1d4ed8";
    ellipse(ctx, 0, -43, 1.5, 2.2);
    ctx.fill();
    ctx.restore();
  }
  // celana pangsi hitam
  ctx.fillStyle = "#18181b";
  roundedRect(ctx, -22, 12, 44, 18, 8);
  ctx.fill();
  ctx.stroke();
  // dada telanjang
  ctx.fillStyle = bodyGradient(ctx, "#e6b27a", hero.color, hero.accent, -6, 18);
  ellipse(ctx, 0, 4, 27, 17);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 30, 8, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 10);
  ctx.moveTo(-14, 3);
  ctx.quadraticCurveTo(-7, 8, -1, 3);
  ctx.moveTo(14, 3);
  ctx.quadraticCurveTo(7, 8, 1, 3);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // bahu macan loreng
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#ea7a12";
    ellipse(ctx, side * 25, -2, 10, 9);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(side * 20, -8);
    ctx.lineTo(side * 24, -1);
    ctx.moveTo(side * 26, -9);
    ctx.lineTo(side * 29, -2);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.6;
  }
  // tali usus: sabuk tali hitam tebal
  ctx.fillStyle = "#0a0a0c";
  roundedRect(ctx, -24, 12, 48, 8, 4);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#8b8b95";
  ctx.lineWidth = 1.6;
  for (let x = -20; x < 22; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, 13);
    ctx.lineTo(x + 4, 19);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  drawFace(ctx, "#cf9460", -12);
  // alis tebal, kumis dan jenggot hitam lebat
  ctx.strokeStyle = "#0a0a0c";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(-2, -13);
  ctx.moveTo(10, -16);
  ctx.lineTo(2, -13);
  ctx.stroke();
  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.quadraticCurveTo(-10, -9, -14, -1);
  ctx.quadraticCurveTo(-8, 0, 0, -1);
  ctx.quadraticCurveTo(8, 0, 14, -1);
  ctx.quadraticCurveTo(10, -9, 0, -5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 1);
  ctx.quadraticCurveTo(0, 14, 6, 1);
  ctx.fill();
  // udeng hitam
  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.moveTo(-15, -20);
  ctx.quadraticCurveTo(0, -34, 15, -20);
  ctx.lineTo(15, -16);
  ctx.quadraticCurveTo(0, -22, -15, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

// Patih Gajah: panglima Majapahit berzirah perunggu, keris pusaka, kain sarung.
function drawGajah(ctx, hero, time) {
  // keris luk
  ctx.save();
  ctx.translate(27, 2);
  ctx.rotate(-0.25);
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.quadraticCurveTo(5, -12, -2, -20);
  ctx.quadraticCurveTo(7, -28, 1, -36);
  ctx.quadraticCurveTo(-4, -26, -7, -20);
  ctx.quadraticCurveTo(-1, -12, -7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6b3f1d";
  roundedRect(ctx, -9, -5, 12, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // kain sarung batik terlilit
  ctx.fillStyle = "#7c2d12";
  roundedRect(ctx, -24, 12, 48, 18, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(252, 211, 77, 0.6)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-20, 18);
  ctx.lineTo(20, 26);
  ctx.moveTo(-20, 25);
  ctx.lineTo(8, 29);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // zirah perunggu
  ctx.fillStyle = bodyGradient(ctx, "#fde68a", "#d4903a", "#7a4a12", -8, 20);
  ellipse(ctx, 0, 4, 25, 17);
  ctx.fill();
  ctx.stroke();
  // surya majapahit di dada
  ctx.fillStyle = "#fef3c7";
  ellipse(ctx, 0, 5, 6, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 2;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 8, 5 + Math.sin(angle) * 8);
    ctx.lineTo(Math.cos(angle) * 11.5, 5 + Math.sin(angle) * 11.5);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // pelindung bahu
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#e0a64a";
    ellipse(ctx, side * 24, -3, 9, 8);
    ctx.fill();
    ctx.stroke();
  }
  drawFace(ctx, "#c98f5c", -12);
  // alis tegas, mulut datar
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-10, -15);
  ctx.lineTo(-2.5, -13);
  ctx.moveTo(10, -15);
  ctx.lineTo(2.5, -13);
  ctx.stroke();
  ctx.fillStyle = "#c98f5c";
  ctx.fillRect(-5, -4.5, 10, 3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -3);
  ctx.lineTo(4.5, -3);
  ctx.stroke();
  ctx.lineWidth = 3.6;
  // mahkota perunggu
  ctx.fillStyle = "#e0a64a";
  ctx.beginPath();
  ctx.moveTo(-15, -20);
  ctx.quadraticCurveTo(-15, -28, -6, -30);
  ctx.lineTo(0, -44);
  ctx.lineTo(6, -30);
  ctx.quadraticCurveTo(15, -28, 15, -20);
  ctx.quadraticCurveTo(0, -25, -15, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dc2626";
  ellipse(ctx, 0, -27, 2.8, 2.8);
  ctx.fill();
}

// Leak Bali: penyihir hitam bertopeng Rangda, lidah panjang, cakar, rambut api.
function drawLeak(ctx, hero, time) {
  // rambut api
  const flicker = Math.sin(time * 0.01);
  for (let index = 0; index < 7; index += 1) {
    const angle = -Math.PI + 0.1 + (index / 6) * (Math.PI - 0.2);
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = index % 2 ? "#f97316" : "#dc2626";
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.quadraticCurveTo(-9 + flicker * 2, -30, 0, -42 - (index % 3) * 4);
    ctx.quadraticCurveTo(9, -30, 6, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // jubah gelap
  ctx.fillStyle = bodyGradient(ctx, "#4c1d95", hero.accent, "#0f0a1f", -4, 30);
  ctx.beginPath();
  ctx.moveTo(-24, 28);
  ctx.quadraticCurveTo(-20, 0, 0, -2);
  ctx.quadraticCurveTo(20, 0, 24, 28);
  ctx.quadraticCurveTo(0, 36, -24, 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // cakar tajam
  ctx.fillStyle = "#f1f5f9";
  for (const side of [-1, 1]) {
    for (let finger = 0; finger < 3; finger += 1) {
      ctx.beginPath();
      ctx.moveTo(side * (24 + finger * 3), 8 + finger * 5);
      ctx.lineTo(side * (36 + finger * 2), 12 + finger * 7);
      ctx.lineTo(side * (25 + finger * 3), 13 + finger * 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // lidah bandul
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = "#e11d48";
  const sway = Math.sin(time * 0.006) * 4;
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.quadraticCurveTo(-5 + sway, 18, -2 + sway, 30);
  ctx.quadraticCurveTo(2 + sway, 33, 4 + sway, 30);
  ctx.quadraticCurveTo(5 + sway, 18, 4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // topeng
  ctx.fillStyle = "#e8e0cc";
  ellipse(ctx, 0, -8, 16, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fafafa";
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 2.4;
  ctx.fillStyle = "#fef08a";
  ellipse(ctx, -6, -9, 4.6, 4.6);
  ctx.fill();
  ellipse(ctx, 6, -9, 4.6, 4.6);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#b91c1c";
  ellipse(ctx, -6, -9, 1.9, 1.9);
  ctx.fill();
  ellipse(ctx, 6, -9, 1.9, 1.9);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#7f1d1d";
  ctx.beginPath();
  ctx.moveTo(-12, -16);
  ctx.lineTo(-3, -13);
  ctx.moveTo(12, -16);
  ctx.lineTo(3, -13);
  ctx.stroke();
  // mulut bertaring
  ctx.fillStyle = "#1c0b0b";
  roundedRect(ctx, -8, -1, 16, 7, 3);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  for (const x of [-7, 5]) {
    ctx.beginPath();
    ctx.moveTo(x, -1);
    ctx.lineTo(x + 2.4, -1);
    ctx.lineTo(x + 1.2, 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 3.6;
}

// Nyi Roro: ratu Laut Selatan berkebaya hijau, mahkota emas, bola air.
function drawNyiRoro(ctx, hero, time) {
  // ombak di kaki
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 4;
  for (const [y, w] of [[24, 30], [30, 38]]) {
    ctx.beginPath();
    ctx.moveTo(-w, y);
    for (let x = -w; x < w; x += 12) {
      ctx.quadraticCurveTo(x + 3, y - 6, x + 6, y);
      ctx.quadraticCurveTo(x + 9, y + 5, x + 12, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // rambut panjang
  ctx.fillStyle = "#0b1f1b";
  ctx.beginPath();
  ctx.moveTo(-17, -14);
  ctx.quadraticCurveTo(-30, 10, -22, 30);
  ctx.lineTo(22, 30);
  ctx.quadraticCurveTo(30, 10, 17, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // kebaya hijau
  ctx.fillStyle = bodyGradient(ctx, "#6ee7b7", "#10b981", "#047857", -4, 30);
  ellipse(ctx, 0, 11, 20, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  roundedRect(ctx, -3, 4, 6, 24, 2);
  ctx.fill();
  drawFace(ctx, "#e7efe9", -8);
  ctx.strokeStyle = "#065f46";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3.5, 3);
  ctx.quadraticCurveTo(0, 5, 3.5, 3);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // mahkota emas bercahaya
  const glow = ctx.createRadialGradient(0, -27, 2, 0, -27, 22);
  glow.addColorStop(0, "rgba(253, 230, 138, 0.8)");
  glow.addColorStop(1, "rgba(253, 230, 138, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-24, -50, 48, 46);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.lineTo(-13, -30);
  ctx.lineTo(-6, -25);
  ctx.lineTo(0, -36);
  ctx.lineTo(6, -25);
  ctx.lineTo(13, -30);
  ctx.lineTo(14, -18);
  ctx.quadraticCurveTo(0, -22, -14, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#34d399";
  ellipse(ctx, 0, -25, 2.8, 3.4);
  ctx.fill();
  // bola air melayang
  for (let index = 0; index < 3; index += 1) {
    const angle = time * 0.003 + (index / 3) * Math.PI * 2;
    const ox = Math.cos(angle) * 33;
    const oy = -2 + Math.sin(angle) * 11;
    ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
    ellipse(ctx, ox, oy, 6, 6);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ellipse(ctx, ox - 1.8, oy - 2, 1.8, 1.8);
    ctx.fill();
  }
  ctx.lineWidth = 3.6;
}

// Sipet Dayak: pengintai Kalimantan, rompi tulang, mahkota bulu enggang, sumpit.
function drawDayak(ctx, hero, time) {
  // sumpit panjang
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-6, 20);
  ctx.lineTo(36, -6);
  ctx.stroke();
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // cawat dan rok serat
  ctx.fillStyle = "#7c2d12";
  roundedRect(ctx, -20, 16, 40, 14, 6);
  ctx.fill();
  ctx.stroke();
  // badan + zirah tulang
  ctx.fillStyle = bodyGradient(ctx, "#d6a574", hero.color, hero.accent, -6, 20);
  ellipse(ctx, 0, 6, 22, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f8f4e6";
  for (let y = -2; y <= 12; y += 6) {
    roundedRect(ctx, -16 + Math.abs(y - 5) * 0.3, y, 32 - Math.abs(y - 5) * 0.6, 4, 2);
    ctx.fill();
    ctx.stroke();
  }
  // tato
  ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.quadraticCurveTo(-24, 6, -20, 12);
  ctx.moveTo(20, 0);
  ctx.quadraticCurveTo(24, 6, 20, 12);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  drawFace(ctx, "#d49a68", -11);
  // cat wajah
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-8, -4);
  ctx.moveTo(14, -6);
  ctx.lineTo(8, -4);
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -15);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  // bulu enggang
  const colors = ["#111827", "#f8fafc", "#dc2626", "#111827", "#f8fafc", "#dc2626", "#111827"];
  for (let index = 0; index < 7; index += 1) {
    const angle = -Math.PI * 0.5 + (index - 3) * 0.3;
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = colors[index];
    ellipse(ctx, 0, -17, 4.8, 15);
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#b45309";
  roundedRect(ctx, -15, -25, 30, 8, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  for (const x of [-9, 0, 9]) {
    ellipse(ctx, x, -21, 2, 2);
    ctx.fill();
  }
  // tangan memegang sumpit
  ctx.fillStyle = "#d49a68";
  ellipse(ctx, 16, 2, 5, 5);
  ctx.fill();
  ctx.stroke();
}

// Pawang Hujan: pawang cuaca berjubah janur, sapu rotan, mangkuk dan dupa.
function drawPawang(ctx, hero, time) {
  // sapu rotan
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-26, 24);
  ctx.lineTo(-24, -26);
  ctx.stroke();
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.fillStyle = "#ca8a04";
  ctx.beginPath();
  ctx.moveTo(-29, -26);
  ctx.lineTo(-19, -26);
  ctx.lineTo(-14, -42);
  ctx.lineTo(-34, -42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  // jubah putih
  ctx.fillStyle = bodyGradient(ctx, "#ffffff", "#f1f5f9", "#cbd5e1", -4, 30);
  ellipse(ctx, 0, 11, 22, 19);
  ctx.fill();
  ctx.stroke();
  // selempang janur anyaman
  ctx.fillStyle = "#65a30d";
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-8, -3);
  ctx.lineTo(20, 22);
  ctx.lineTo(10, 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(20, 60, 10, 0.6)";
  ctx.lineWidth = 1.6;
  for (let step = 0; step < 4; step += 1) {
    ctx.beginPath();
    ctx.moveTo(-10 + step * 7, 2 + step * 6);
    ctx.lineTo(-4 + step * 7, 8 + step * 6);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  drawFace(ctx, "#c99468", -9);
  // jenggot uban
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.quadraticCurveTo(0, 18, 9, 0);
  ctx.quadraticCurveTo(0, 5, -9, 0);
  ctx.fill();
  ctx.stroke();
  // ikat kepala putih
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(-15, -17);
  ctx.quadraticCurveTo(0, -32, 15, -17);
  ctx.lineTo(15, -13);
  ctx.quadraticCurveTo(0, -20, -15, -13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // mangkuk bernyanyi
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(32, 6);
  ctx.quadraticCurveTo(30, 18, 23, 18);
  ctx.quadraticCurveTo(16, 18, 14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // asap dupa
  ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
  ctx.lineWidth = 2.4;
  for (let index = 0; index < 2; index += 1) {
    const phase = time * 0.004 + index * 1.7;
    ctx.beginPath();
    ctx.moveTo(20 + index * 5, 4);
    ctx.bezierCurveTo(
      16 + index * 5 + Math.sin(phase) * 4, -6,
      28 + index * 5 + Math.cos(phase) * 4, -12,
      22 + index * 5, -22,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
}

const HERO_PAINTERS = {
  bastion: drawWarok,
  vanguard: drawGajah,
  shade: drawLeak,
  ember: drawNyiRoro,
  quill: drawDayak,
  lumen: drawPawang,
};

function drawHeroBody(ctx, heroId, time, facing = 1) {
  const hero = getHero(heroId);
  const bob = Math.sin(time * 0.004) * 1.4;
  ctx.save();
  ctx.scale(facing, 1);
  ctx.translate(0, bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.6;
  (HERO_PAINTERS[hero.id] ?? drawWarok)(ctx, hero, time);
  ctx.restore();
}

export function drawHeroPortrait(canvas, heroId, time, options = {}) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width;
  const height = rect.height || canvas.height;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const hero = getHero(heroId);
  const base = Math.min(width, height);
  const scale = (base / 150) * (options.scale ?? 1);

  const glow = ctx.createRadialGradient(width / 2, height * 0.52, 5, width / 2, height * 0.52, base * 0.45);
  glow.addColorStop(0, `${hero.color}55`);
  glow.addColorStop(0.55, `${hero.accent}18`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height * 0.55);
  ctx.scale(scale, scale);
  drawHeroBody(ctx, heroId, time, options.facing ?? 1);
  ctx.restore();

  if (options.sparkles !== false) {
    for (let index = 0; index < 7; index += 1) {
      const angle = time * 0.00035 + index * 0.92;
      const radius = base * (0.26 + (index % 3) * 0.04);
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height * 0.5 + Math.sin(angle) * radius * 0.72;
      const alpha = 0.28 + Math.sin(time * 0.002 + index) * 0.18;
      ctx.fillStyle = `rgba(255, 236, 153, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (index % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = null;
    this.selfId = null;
    this.pointer = { x: 900, y: 500 };
    this.smooth = new Map();
    this.stateAt = performance.now();
    this.lastFrame = performance.now();
    this.serverOffset = 0;
    this.transform = { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0, dpr: 1 };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const padding = width < 700 ? 4 : 12;
    const scale = Math.min(
      (width - padding * 2) / ARENA.width,
      (height - padding * 2) / ARENA.height,
    );
    this.transform = {
      scale,
      offsetX: (width - ARENA.width * scale) / 2,
      offsetY: (height - ARENA.height * scale) / 2,
      width,
      height,
      dpr,
    };
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const worldX = (x - this.transform.offsetX) / this.transform.scale;
    const worldY = (y - this.transform.offsetY) / this.transform.scale;
    return {
      x: clamp(worldX, 0, ARENA.width),
      y: clamp(worldY, 0, ARENA.height),
    };
  }

  setState(state) {
    if (!state) return;
    this.state = state;
    this.stateAt = performance.now();
    this.serverOffset = state.serverTime - Date.now();
    const seenPlayers = new Set();
    const seenMinions = new Set();
    const smoothFactor = 1;
    for (const player of state.players ?? []) {
      const key = `p:${player.id}`;
      seenPlayers.add(key);
      this.updateSmooth(key, player.x, player.y, smoothFactor);
    }
    for (const minion of state.minions ?? []) {
      const key = `m:${minion.id}`;
      seenMinions.add(key);
      this.updateSmooth(key, minion.x, minion.y, smoothFactor);
    }
    for (const key of this.smooth.keys()) {
      if (!seenPlayers.has(key) && !seenMinions.has(key)) this.smooth.delete(key);
    }
  }

  updateSmooth(key, x, y, factor = 1) {
    const existing = this.smooth.get(key);
    if (!existing) {
      this.smooth.set(key, { x, y, targetX: x, targetY: y });
      return;
    }
    existing.targetX = x;
    existing.targetY = y;
    if (Math.hypot(x - existing.x, y - existing.y) > 260) {
      existing.x = x;
      existing.y = y;
    } else {
      existing.x += (x - existing.x) * factor;
      existing.y += (y - existing.y) * factor;
    }
  }

  setSelf(playerId) {
    this.selfId = playerId;
  }

  setPointer(world) {
    this.pointer = world;
  }

  getSelf() {
    return this.state?.players?.find((player) => player.id === this.selfId) ?? null;
  }

  render(now = performance.now()) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const ctx = this.ctx;
    const { width, height, dpr, scale, offsetX, offsetY } = this.transform;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#061a24");
    backdrop.addColorStop(0.5, "#0a2a36");
    backdrop.addColorStop(1, "#04131b");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    if (!this.state) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = '700 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("Menyiapkan arena...", width / 2, height / 2);
      return;
    }

    for (const [key, point] of this.smooth) {
      const speed = 18;
      const factor = 1 - Math.exp(-dt * speed);
      point.x += (point.targetX - point.x) * factor;
      point.y += (point.targetY - point.y) * factor;
    }

    const shake = this.getShake();
    ctx.save();
    ctx.translate(offsetX + (Math.random() - 0.5) * shake, offsetY + (Math.random() - 0.5) * shake);
    ctx.scale(scale, scale);

    ctx.save();
    roundedRect(ctx, 0, 0, ARENA.width, ARENA.height, 24);
    ctx.clip();
    this.drawArena(ctx, now);
    this.drawCovers(ctx, now);
    this.drawBases(ctx, now);
    this.drawMinions(ctx, now);
    this.drawTowers(ctx, now);
    this.drawNexuses(ctx, now);
    this.drawPlayers(ctx, now);
    this.drawProjectiles(ctx, now);
    this.drawEffects(ctx, now);
    this.drawAim(ctx, now);
    ctx.restore();

    roundedRect(ctx, 0, 0, ARENA.width, ARENA.height, 24);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(3, 16, 24, 0.85)";
    ctx.stroke();
    roundedRect(ctx, 5, 5, ARENA.width - 10, ARENA.height - 10, 20);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(164, 227, 255, 0.15)";
    ctx.stroke();

    ctx.restore();
  }

  // Titik pemasangan objek dunia; renderer 3D menimpanya dengan proyeksi.
  place(ctx, x, y) {
    ctx.translate(x, y);
  }

  // Melukis lantai statis (tanpa dekorasi berdiri) untuk tekstur 3D.
  paintGround(ctx) {
    this.groundOnly = true;
    try {
      this.drawArena(ctx, 0);
    } finally {
      this.groundOnly = false;
    }
  }

  getShake() {
    const serverNow = Date.now() + this.serverOffset;
    let shake = 0;
    for (const effect of this.state.effects ?? []) {
      const age = serverNow - effect.start;
      if (age < 0 || age > 260) continue;
      if (effect.type === "explosion" || effect.type === "shock" || effect.type === "towerDown") {
        shake = Math.max(shake, 7 * (1 - age / 260));
      } else if (effect.type === "super" || effect.type === "clash") {
        shake = Math.max(shake, 4 * (1 - age / 260));
      }
    }
    return shake;
  }

  drawArena(ctx, now) {
    const background = ctx.createLinearGradient(0, 0, ARENA.width, ARENA.height);
    background.addColorStop(0, "#5a9e3a");
    background.addColorStop(0.5, "#6cb043");
    background.addColorStop(1, "#4f9238");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);

    // petak sawah terasering di sisi atas dan bawah
    for (const [top, bottom] of [[34, 170], [830, 966]]) {
      for (let y = top; y < bottom; y += 34) {
        const shade = ((y - top) / 34) % 2 === 0;
        ctx.fillStyle = shade ? "rgba(214, 238, 120, 0.22)" : "rgba(34, 94, 38, 0.2)";
        roundedRect(ctx, 40, y, ARENA.width - 80, 30, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 82, 36, 0.35)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // sungai cekungan Trowulan membelah dua kerajaan
    ctx.save();
    const river = ctx.createLinearGradient(840, 0, 960, 0);
    river.addColorStop(0, "#2f86a8");
    river.addColorStop(0.5, "#5cc0dc");
    river.addColorStop(1, "#2f86a8");
    ctx.fillStyle = river;
    ctx.beginPath();
    ctx.moveTo(850, 0);
    ctx.bezierCurveTo(800, 220, 920, 380, 860, 500);
    ctx.bezierCurveTo(800, 620, 930, 780, 850, ARENA.height);
    ctx.lineTo(950, ARENA.height);
    ctx.bezierCurveTo(1030, 780, 900, 620, 960, 500);
    ctx.bezierCurveTo(1020, 380, 900, 220, 950, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 22]);
    ctx.stroke();
    ctx.restore();

    // jalan tanah desa dari gerbang ke gerbang
    const road = ctx.createLinearGradient(0, 380, 0, 620);
    road.addColorStop(0, "#b98b55");
    road.addColorStop(0.5, "#d3a76d");
    road.addColorStop(1, "#b98b55");
    ctx.fillStyle = road;
    roundedRect(ctx, 210, 392, ARENA.width - 420, 216, 60);
    ctx.fill();
    ctx.strokeStyle = "rgba(92, 58, 24, 0.55)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(92, 58, 24, 0.18)";
    for (let x = 270; x < ARENA.width - 270; x += 74) {
      ellipse(ctx, x, 470 + ((x / 74) % 3) * 24, 7, 4);
      ctx.fill();
    }
    // jembatan kayu di atas sungai Trowulan
    ctx.fillStyle = "#8d6a3f";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    roundedRect(ctx, 832, 392, 136, 216, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(50, 28, 8, 0.55)";
    ctx.lineWidth = 2;
    for (let x = 848; x < 968; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 396);
      ctx.lineTo(x, 604);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#fff8dc";
    ctx.font = '700 18px "Trebuchet MS", sans-serif';
    ctx.fillText("JALAN RAYA POS", 330, 506);
    ctx.fillText("JALAN RAYA POS", 1230, 506);
    ctx.restore();

    const blueZone = ctx.createLinearGradient(0, 0, 520, 0);
    blueZone.addColorStop(0, "rgba(69,195,255,0.18)");
    blueZone.addColorStop(1, "rgba(69,195,255,0)");
    ctx.fillStyle = blueZone;
    ctx.fillRect(0, 0, 520, ARENA.height);

    const redZone = ctx.createLinearGradient(ARENA.width, 0, ARENA.width - 520, 0);
    redZone.addColorStop(0, "rgba(255,93,125,0.16)");
    redZone.addColorStop(1, "rgba(255,93,125,0)");
    ctx.fillStyle = redZone;
    ctx.fillRect(ARENA.width - 520, 0, 520, ARENA.height);

    for (const tuft of TUFT) {
      // rumpun padi
      ctx.strokeStyle = "rgba(230, 206, 80, 0.7)";
      ctx.lineWidth = 2;
      for (const lean of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(tuft.x, tuft.y + tuft.size * 0.6);
        ctx.quadraticCurveTo(
          tuft.x + lean * tuft.size * 0.6,
          tuft.y - tuft.size * 0.2,
          tuft.x + lean * tuft.size * 1.3,
          tuft.y - tuft.size,
        );
        ctx.stroke();
      }
    }

    for (const flower of FLOWER) {
      ctx.fillStyle = flower.color;
      ctx.globalAlpha = 0.45;
      for (let petal = 0; petal < 4; petal += 1) {
        const angle = (petal / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(
          flower.x + Math.cos(angle) * flower.size,
          flower.y + Math.sin(angle) * flower.size,
          flower.size * 0.8,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    this.drawBush(ctx, 915, 92, 95, 36);
    this.drawBush(ctx, 885, 908, 120, 34);
    this.drawBush(ctx, 205, 845, 80, 34);
    this.drawBush(ctx, 1595, 145, 92, 34);
    this.drawBush(ctx, 1115, 858, 70, 28);

    this.drawPalm(ctx, 70, 70, 1);
    this.drawPalm(ctx, 1730, 70, -1);
    this.drawPalm(ctx, 70, 930, 1);
    this.drawPalm(ctx, 1730, 930, -1);
    this.drawPalm(ctx, 780, 330, 1);
    this.drawPalm(ctx, 1020, 680, -1);
    this.drawWarung(ctx, 330, 905);
    this.drawWarung(ctx, 1470, 95);
    this.drawCandi(ctx, 1190, 120);
    this.drawCandi(ctx, 610, 880);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#fff8dc";
    ctx.font = '700 30px "Trebuchet MS", sans-serif';
    ctx.fillText("p = m v", 182, 430);
    ctx.fillText("F = m a", 1480, 610);
    ctx.fillText("Ek = 1/2 m v2", 770, 920);
    ctx.font = '700 21px "Trebuchet MS", sans-serif';
    ctx.fillText("IMPULS", 390, 120);
    ctx.fillText("MOMENTUM", 1310, 890);
    ctx.restore();

    const zoneActive = Boolean(this.state?.clash);
    ctx.save();
    ctx.translate(ARENA.width / 2, ARENA.height / 2);
    ctx.strokeStyle = zoneActive ? "rgba(255, 224, 96, 0.65)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = zoneActive ? 5 : 2;
    ctx.setLineDash(zoneActive ? [] : [10, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, 205, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = zoneActive ? 0.16 + Math.sin(now * 0.006) * 0.06 : 0.05;
    ctx.fillStyle = "#ffe36d";
    ctx.beginPath();
    ctx.arc(0, 0, 205, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#f5ffe9";
    ctx.font = '700 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("ALUN-ALUN FISIKA", 0, -7);
    ctx.textAlign = "left";
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 100; x < ARENA.width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA.height);
      ctx.stroke();
    }
    for (let y = 100; y < ARENA.height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA.width, y);
      ctx.stroke();
    }
  }

  drawBush(ctx, x, y, width, height) {
    if (this.groundOnly) return;
    ctx.save();
    // rumpun bambu
    ctx.lineCap = "round";
    const stalks = Math.max(5, Math.round(width / 12));
    for (let index = 0; index < stalks; index += 1) {
      const sx = x + (index / (stalks - 1)) * width;
      const lean = (index % 3 - 1) * 5;
      const h = height * (1.5 + (index % 4) * 0.35);
      ctx.strokeStyle = "rgba(20, 70, 30, 0.85)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(sx, y + 8);
      ctx.lineTo(sx + lean, y - h);
      ctx.stroke();
      ctx.strokeStyle = index % 2 ? "#8bc34a" : "#6aa83a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, y + 8);
      ctx.lineTo(sx + lean, y - h);
      ctx.stroke();
      ctx.strokeStyle = "rgba(20, 70, 30, 0.7)";
      ctx.lineWidth = 2;
      for (let node = 1; node < 4; node += 1) {
        const ny = y - (h * node) / 4;
        ctx.beginPath();
        ctx.moveTo(sx + lean * (node / 4) - 4, ny);
        ctx.lineTo(sx + lean * (node / 4) + 4, ny);
        ctx.stroke();
      }
      ctx.fillStyle = "#7cb342";
      ctx.beginPath();
      ctx.ellipse(sx + lean + 6, y - h, 9, 3, -0.5, 0, Math.PI * 2);
      ctx.ellipse(sx + lean - 6, y - h + 3, 9, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPalm(ctx, x, y, flip) {
    if (this.groundOnly) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(10, 14, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(14, -30, 6, -66);
    ctx.stroke();
    ctx.strokeStyle = "#a9794a";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#2e7d32";
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 2;
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index - 2.5) * 0.62;
      ctx.save();
      ctx.translate(6, -66);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(26, -14, 56, 6);
      ctx.quadraticCurveTo(26, -2, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#6d4c2a";
    ctx.beginPath();
    ctx.arc(2, -62, 5, 0, Math.PI * 2);
    ctx.arc(11, -60, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCandi(ctx, x, y) {
    if (this.groundOnly) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(6, 18, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    const steps = [[-34, 4, 68, 14], [-26, -10, 52, 14], [-18, -24, 36, 14]];
    for (const [sx, sy, sw, sh] of steps) {
      ctx.fillStyle = "#8f95a3";
      roundedRect(ctx, sx, sy, sw, sh, 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#a7adbb";
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.lineTo(0, -48);
    ctx.lineTo(12, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawWarung(ctx, x, y) {
    if (this.groundOnly) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    roundedRect(ctx, -44, 2, 92, 18, 8);
    ctx.fill();
    ctx.fillStyle = "#8d5b30";
    roundedRect(ctx, -38, -22, 76, 34, 6);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#f5deb3";
    roundedRect(ctx, -30, -16, 60, 12, 4);
    ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(-46, -22);
    ctx.lineTo(-30, -44);
    ctx.lineTo(30, -44);
    ctx.lineTo(46, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    for (let step = -2; step <= 1; step += 1) {
      ctx.beginPath();
      ctx.moveTo(step * 20 + 3, -22);
      ctx.lineTo(step * 20 + 12, -44);
      ctx.lineTo(step * 20 + 22, -44);
      ctx.lineTo(step * 20 + 23, -22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#fff8dc";
    ctx.font = '700 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("WARUNG", 0, 5);
    ctx.textAlign = "left";
    ctx.restore();
  }

  drawCovers(ctx, now) {
    for (const cover of this.state.covers ?? []) {
      if (!cover.alive) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#263b3d";
        roundedRect(ctx, cover.x + 5, cover.y + 5, cover.w - 10, cover.h - 10, 8);
        ctx.fill();
        ctx.restore();
        continue;
      }
      const ratio = cover.hp / cover.maxHp;
      ctx.save();
      ctx.translate(cover.x, cover.y);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      roundedRect(ctx, 6, 8, cover.w, cover.h, 9);
      ctx.fill();

      const gradient = ctx.createLinearGradient(0, 0, 0, cover.h);
      gradient.addColorStop(0, "#d8c46a");
      gradient.addColorStop(0.5, "#a89440");
      gradient.addColorStop(1, "#6e5f22");
      ctx.fillStyle = gradient;
      roundedRect(ctx, 0, 0, cover.w, cover.h, 9);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();

      // pagar bambu: ruas-ruas bambu dengan buku
      ctx.strokeStyle = "rgba(255, 244, 170, 0.35)";
      ctx.lineWidth = 2;
      roundedRect(ctx, 6, 6, cover.w - 12, cover.h - 12, 5);
      ctx.stroke();

      ctx.strokeStyle = "rgba(60, 46, 8, 0.5)";
      if (cover.w > cover.h) {
        for (let x = 24; x < cover.w - 10; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 6);
          ctx.lineTo(x, cover.h - 6);
          ctx.stroke();
        }
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(0, cover.h / 2 - 3, cover.w, 6);
        ctx.fillStyle = "#f8fafc";
        for (let x = 10; x < cover.w - 12; x += 36) ctx.fillRect(x, cover.h / 2 - 3, 12, 6);
      } else {
        for (let y = 24; y < cover.h - 10; y += 30) {
          ctx.beginPath();
          ctx.moveTo(6, y);
          ctx.lineTo(cover.w - 6, y);
          ctx.stroke();
        }
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(cover.w / 2 - 3, 0, 6, cover.h);
        ctx.fillStyle = "#f8fafc";
        for (let y = 10; y < cover.h - 12; y += 36) ctx.fillRect(cover.w / 2 - 3, y, 6, 12);
      }

      if (ratio < 0.7) {
        ctx.strokeStyle = "rgba(15, 24, 24, 0.72)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cover.w * 0.25, 4);
        ctx.lineTo(cover.w * 0.42, cover.h * 0.42);
        ctx.lineTo(cover.w * 0.3, cover.h * 0.66);
        ctx.lineTo(cover.w * 0.55, cover.h - 4);
        ctx.stroke();
      }
      if (ratio < 0.35) {
        ctx.beginPath();
        ctx.moveTo(cover.w * 0.75, 2);
        ctx.lineTo(cover.w * 0.58, cover.h * 0.4);
        ctx.lineTo(cover.w * 0.7, cover.h * 0.7);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(4, 4, cover.w - 8, 4);
      ctx.restore();

      if (ratio < 0.999) {
        this.drawHealthBar(
          ctx,
          cover.x + cover.w / 2,
          cover.y - 10,
          Math.min(cover.w, 80),
          cover.hp,
          cover.maxHp,
          0,
          "#d7f99a",
        );
      }
    }
  }

  drawBases(ctx, now) {
    for (const team of [TEAM.BLUE, TEAM.RED]) {
      const x = team === TEAM.BLUE ? 150 : ARENA.width - 150;
      const color = TEAM_COLORS[team];
      ctx.save();
      ctx.translate(x, ARENA.height / 2);
      const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 190);
      glow.addColorStop(0, `${color}33`);
      glow.addColorStop(1, `${color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 190, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${color}45`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = '700 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(team === TEAM.BLUE ? "PELABUHAN MUARO JAMBI" : "BENTENG KOTAGEDE", 0, 148);
      ctx.textAlign = "left";
      ctx.restore();
    }
  }

  drawTowers(ctx, now) {
    for (const tower of this.state.towers ?? []) {
      const color = TEAM_COLORS[tower.team];
      const dark = TEAM_DARK[tower.team];
      ctx.save();
      ctx.translate(tower.x, tower.y);
      if (!tower.alive) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#263b3d";
        for (let index = 0; index < 4; index += 1) {
          ctx.beginPath();
          ctx.arc(Math.cos(index * 2.1) * 23, Math.sin(index * 1.7) * 16, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ellipse(ctx, 7, 26, 54, 20);
      ctx.fill();

      // pos ronda: gardu panggung bambu beratap limas, dengan kentongan
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4;
      ctx.fillStyle = "#6e4a26";
      for (const px of [-30, 30]) {
        roundedRect(ctx, px - 5, -4, 10, 44, 3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#b98b55";
      roundedRect(ctx, -42, 8, 84, 12, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e7d29a";
      roundedRect(ctx, -30, -22, 60, 32, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(60, 40, 10, 0.55)";
      roundedRect(ctx, -12, -14, 24, 24, 4);
      ctx.fill();

      const roofGradient = ctx.createLinearGradient(0, -52, 0, -20);
      roofGradient.addColorStop(0, "#fff");
      roofGradient.addColorStop(0.25, color);
      roofGradient.addColorStop(1, dark);
      ctx.fillStyle = roofGradient;
      ctx.beginPath();
      ctx.moveTo(-42, -20);
      ctx.lineTo(-14, -50);
      ctx.lineTo(14, -50);
      ctx.lineTo(42, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a8763a";
      roundedRect(ctx, 34, 0, 20, 8, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.45;
      ellipse(ctx, 0, 40, 58, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (tower.hp < tower.maxHp) {
        this.drawHealthBar(ctx, 0, -58, 92, tower.hp, tower.maxHp, 0, color);
      }
      ctx.restore();
    }
  }

  drawNexuses(ctx, now) {
    for (const nexus of this.state.nexuses ?? []) {
      const color = TEAM_COLORS[nexus.team];
      const dark = TEAM_DARK[nexus.team];
      ctx.save();
      ctx.translate(nexus.x, nexus.y);
      if (!nexus.alive) {
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = "#1c3338";
        for (let index = 0; index < 5; index += 1) {
          const angle = (index / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
          ctx.lineTo(Math.cos(angle + 0.4) * 58, Math.sin(angle + 0.4) * 58);
          ctx.lineTo(Math.cos(angle + 0.8) * 18, Math.sin(angle + 0.8) * 18);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      const pulse = 1 + Math.sin(now * 0.003 + nexus.team) * 0.035;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ellipse(ctx, 8, 52, 75, 26);
      ctx.fill();

      ctx.save();
      ctx.rotate(now * 0.00018 * (nexus.team === 0 ? 1 : -1));
      ctx.strokeStyle = `${color}77`;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 91, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.scale(pulse, pulse);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 5;
      if (nexus.team === TEAM.BLUE) {
        // Muaro Jambi: candi bata merah bertingkat dengan stupa, bendera kerajaan
        const tiers = [[-64, 30, 128, 30], [-50, 4, 100, 28], [-36, -20, 72, 26], [-22, -42, 44, 24]];
        tiers.forEach(([tx, ty, tw, th], index) => {
          const brick = ctx.createLinearGradient(0, ty, 0, ty + th);
          brick.addColorStop(0, index === 0 ? "#c2603f" : "#d9714a");
          brick.addColorStop(1, "#8a3a22");
          ctx.fillStyle = brick;
          roundedRect(ctx, tx, ty, tw, th, 3);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "rgba(60, 20, 8, 0.45)";
          ctx.lineWidth = 1.6;
          for (let bx = tx + 10; bx < tx + tw - 4; bx += 14) {
            ctx.beginPath();
            ctx.moveTo(bx, ty + 3);
            ctx.lineTo(bx, ty + th - 3);
            ctx.stroke();
          }
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 5;
        });
        ctx.fillStyle = "rgba(30, 10, 4, 0.7)";
        roundedRect(ctx, -9, 36, 18, 24, 8);
        ctx.fill();
        const stupa = ctx.createLinearGradient(0, -78, 0, -40);
        stupa.addColorStop(0, "#fff");
        stupa.addColorStop(0.3, color);
        stupa.addColorStop(1, dark);
        ctx.fillStyle = stupa;
        ctx.beginPath();
        ctx.moveTo(-16, -42);
        ctx.quadraticCurveTo(-18, -66, 0, -78);
        ctx.quadraticCurveTo(18, -66, 16, -42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f4d35e";
        ctx.beginPath();
        ctx.moveTo(-3, -78);
        ctx.lineTo(0, -92);
        ctx.lineTo(3, -78);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
      // Kotagede: Joglo di atas platform batu vulkanik bertingkat
      ctx.fillStyle = "#3b3f4a";
      roundedRect(ctx, -66, 50, 132, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4b5060";
      roundedRect(ctx, -58, 40, 116, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8d6a3f";
      roundedRect(ctx, -52, 20, 104, 40, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f1dfae";
      roundedRect(ctx, -40, 4, 80, 30, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#6e4a26";
      for (const px of [-30, -10, 10, 30]) {
        roundedRect(ctx, px - 3, 4, 6, 46, 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(60, 40, 10, 0.5)";
      roundedRect(ctx, -8, 26, 16, 24, 3);
      ctx.fill();

      const roofLow = ctx.createLinearGradient(0, -14, 0, 8);
      roofLow.addColorStop(0, color);
      roofLow.addColorStop(1, dark);
      ctx.fillStyle = roofLow;
      ctx.beginPath();
      ctx.moveTo(-62, 8);
      ctx.lineTo(-36, -22);
      ctx.lineTo(36, -22);
      ctx.lineTo(62, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const roofHigh = ctx.createLinearGradient(0, -66, 0, -20);
      roofHigh.addColorStop(0, "#ffffff");
      roofHigh.addColorStop(0.3, color);
      roofHigh.addColorStop(1, dark);
      ctx.fillStyle = roofHigh;
      ctx.beginPath();
      ctx.moveTo(-34, -22);
      ctx.lineTo(-14, -56);
      ctx.lineTo(14, -56);
      ctx.lineTo(34, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // mahkota atap
      ctx.fillStyle = "#f4d35e";
      ctx.beginPath();
      ctx.moveTo(-4, -56);
      ctx.lineTo(0, -72);
      ctx.lineTo(4, -56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // bendera merah-putih kecil
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, -86, 20, 7);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(0, -93, 20, 7);
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, -93, 20, 14);
      ctx.beginPath();
      ctx.moveTo(0, -95);
      ctx.lineTo(0, -72);
      ctx.stroke();
      }

      if (nexus.protected) {
        ctx.strokeStyle = "rgba(255, 224, 96, 0.72)";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 9]);
        ctx.beginPath();
        ctx.arc(0, 0, 104 + Math.sin(now * 0.004) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 224, 96, 0.8)";
        ctx.font = '700 9px "Trebuchet MS", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("TERLINDUNG", 0, 121);
        ctx.textAlign = "left";
      }

      this.drawHealthBar(ctx, 0, -112, 118, nexus.hp, nexus.maxHp, 0, color);
      ctx.restore();
    }
  }

  drawMinions(ctx, now) {
    for (const minion of this.state.minions ?? []) {
      const smooth = this.smooth.get(`m:${minion.id}`);
      const x = smooth?.x ?? minion.x;
      const y = smooth?.y ?? minion.y;
      const color = TEAM_COLORS[minion.team];
      const dark = TEAM_DARK[minion.team];
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ellipse(ctx, 3, 8, 15, 7);
      ctx.fill();

      const gradient = ctx.createLinearGradient(0, -14, 0, 14);
      gradient.addColorStop(0, "#f5fdff");
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ellipse(ctx, 0, 0, 13, 13);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, -19);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -21, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#071a23";
      ellipse(ctx, -4.2, -2, 2.4, 3);
      ctx.fill();
      ellipse(ctx, 4.2, -2, 2.4, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ellipse(ctx, -3.5, -2.8, 0.8, 1);
      ctx.fill();
      ellipse(ctx, 4.9, -2.8, 0.8, 1);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-3, 5);
      ctx.lineTo(3, 5);
      ctx.stroke();

      if (minion.hp < minion.maxHp) {
        this.drawHealthBar(ctx, 0, -32, 32, minion.hp, minion.maxHp, 0, color);
      }
      ctx.restore();
    }
  }

  drawPlayers(ctx, now) {
    for (const player of this.state.players ?? []) {
      const smooth = this.smooth.get(`p:${player.id}`);
      const x = smooth?.x ?? player.x;
      const y = smooth?.y ?? player.y;
      const hero = getHero(player.heroId);
      const teamColor = TEAM_COLORS[player.slot];

      ctx.save();
      ctx.translate(x, y);
      if (!player.alive) {
        ctx.globalAlpha = 0.24;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = teamColor;
        ctx.font = '700 11px "Trebuchet MS", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(player.respawnIn / 1000)}`, 0, 4);
        ctx.textAlign = "left";
        ctx.restore();
        continue;
      }

      if (player.edge) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "#ffe36d";
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 17 + Math.sin(now * 0.006) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let index = 0; index < 3; index += 1) {
          const angle = now * 0.002 + (index / 3) * Math.PI * 2;
          ctx.fillStyle = "#ffe36d";
          ctx.beginPath();
          ctx.arc(
            Math.cos(angle) * (player.radius + 23),
            Math.sin(angle) * (player.radius + 23),
            2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      if (player.slowed) {
        ctx.fillStyle = "rgba(69, 195, 255, 0.18)";
        ellipse(ctx, 0, player.radius * 0.7, player.radius * 1.2, player.radius * 0.45);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ellipse(ctx, 5, player.radius * 0.75, player.radius * 1.1, player.radius * 0.42);
      ctx.fill();

      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ellipse(ctx, 0, player.radius * 0.75, player.radius * 0.9, player.radius * 0.32);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const figureScale = player.radius / 24;
      ctx.save();
      ctx.scale(figureScale, figureScale);
      drawHeroBody(ctx, player.heroId, now + player.slot * 700, player.slot === 0 ? 1 : -1);
      ctx.restore();

      if (player.shielded || player.shield > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(166, 238, 255, 0.8)";
        ctx.fillStyle = "rgba(122, 220, 255, 0.12)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (player.reflect) {
        ctx.save();
        ctx.strokeStyle = "#d8f8ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const barWidth = 76;
      this.drawHealthBar(
        ctx,
        0,
        -player.radius - 27,
        barWidth,
        player.hp,
        player.maxHp,
        player.shield,
        hero.color,
      );

      ctx.fillStyle = "rgba(3, 16, 24, 0.72)";
      roundedRect(ctx, -barWidth / 2 - 12, -player.radius - 50, 24, 15, 5);
      ctx.fill();
      ctx.fillStyle = "#ffe36d";
      ctx.font = '700 8px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(`${player.level}`, -barWidth / 2, -player.radius - 39);

      ctx.fillStyle = player.id === this.selfId ? "#ffe36d" : "rgba(255,255,255,0.72)";
      ctx.font = '700 9px "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(
        player.id === this.selfId ? `${player.name} / YOU` : player.name,
        0,
        -player.radius - 57,
      );
      ctx.textAlign = "left";

      if (player.id === this.selfId) {
        const bob = Math.sin(now * 0.006) * 3;
        ctx.fillStyle = "#ffe36d";
        ctx.beginPath();
        ctx.moveTo(0, -player.radius - 70 + bob);
        ctx.lineTo(-7, -player.radius - 81 + bob);
        ctx.lineTo(7, -player.radius - 81 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawProjectiles(ctx, now) {
    const age = Math.min(0.09, (now - this.stateAt) / 1000);
    for (const projectile of this.state.projectiles ?? []) {
      const x = projectile.x + projectile.vx * age;
      const y = projectile.y + projectile.vy * age;
      const color = TEAM_COLORS[projectile.team] ?? "#ffe36d";
      const radius = projectile.radius;
      ctx.save();
      this.place(ctx, x, y, 22);
      const angle = Math.atan2(projectile.vy, projectile.vx);
      ctx.rotate(angle);

      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = color;
      ctx.lineWidth = radius * 1.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-radius * 6, 0);
      ctx.lineTo(-radius * 1.2, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (projectile.type === "nova") {
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 2.8);
        glow.addColorStop(0, "#fff3ba");
        glow.addColorStop(0.35, "#ff9d3c");
        glow.addColorStop(1, "rgba(255,80,30,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd28a";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.1);
        glow.addColorStop(0, "#ffffff");
        glow.addColorStop(0.3, color);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f7fdff";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawEffects(ctx, now) {
    const serverNow = Date.now() + this.serverOffset;
    for (const effect of this.state.effects ?? []) {
      const age = serverNow - effect.start;
      if (age < 0 || age > effect.duration) continue;
      const progress = clamp(age / effect.duration, 0, 1);
      const fade = 1 - progress;
      const radius = effect.radius * (0.35 + progress * 0.8);
      ctx.save();
      this.place(ctx, effect.x, effect.y, 0);
      ctx.globalAlpha = fade;

      if (
        effect.type === "shock" ||
        effect.type === "explosion" ||
        effect.type === "clash" ||
        effect.type === "towerDown"
      ) {
        const color =
          effect.type === "clash" || effect.type === "towerDown"
            ? "#ffe36d"
            : effect.color || "#fef3c7";
        ctx.strokeStyle = color;
        ctx.lineWidth = effect.type === "towerDown" ? 12 : 7;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.24;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.8;
        ctx.strokeStyle = "#fff6cf";
        ctx.lineWidth = 2;
        for (let index = 0; index < 8; index += 1) {
          const angle = index * 0.785 + effect.start * 0.0003;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius * 0.4, Math.sin(angle) * radius * 0.4);
          ctx.lineTo(Math.cos(angle) * radius * 1.1, Math.sin(angle) * radius * 1.1);
          ctx.stroke();
        }
      } else if (effect.type === "hit" || effect.type === "minionHit" || effect.type === "spark") {
        ctx.strokeStyle = effect.color || "#fff3c4";
        ctx.lineWidth = effect.type === "spark" ? 2 : 3.5;
        for (let index = 0; index < 6; index += 1) {
          const angle = (index / 6) * Math.PI * 2 + progress;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius * 0.25, Math.sin(angle) * radius * 0.25);
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.stroke();
        }
      } else if (effect.type === "muzzle" || effect.type === "towerShot") {
        ctx.fillStyle = effect.color || "#fff3c4";
        ctx.globalAlpha = fade * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === "shield" || effect.type === "reflect") {
        ctx.strokeStyle = effect.color || "#bae6fd";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.14;
        ctx.fillStyle = effect.color || "#bae6fd";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === "death" || effect.type === "coverBreak") {
        ctx.fillStyle = effect.color || "#ff8b8b";
        for (let index = 0; index < 9; index += 1) {
          const angle = index * 2.3 + progress * 2;
          const distance = radius * (0.5 + (index % 3) * 0.22);
          const size = 4 + (index % 4) * 2;
          ctx.globalAlpha = fade * 0.8;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (effect.type === "dash") {
        ctx.strokeStyle = effect.color || "#4df0c2";
        ctx.lineWidth = 4;
        ctx.globalAlpha = fade * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, radius, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      } else if (effect.type === "level" || effect.type === "spawn" || effect.type === "heal") {
        ctx.strokeStyle = effect.type === "heal" ? "#5ce6a8" : "#ffe36d";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.4;
        ctx.fillStyle = effect.type === "heal" ? "#5ce6a8" : "#ffe36d";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === "wrong") {
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, -radius * 0.4);
        ctx.lineTo(radius * 0.4, radius * 0.4);
        ctx.moveTo(radius * 0.4, -radius * 0.4);
        ctx.lineTo(-radius * 0.4, radius * 0.4);
        ctx.stroke();
      } else if (effect.type === "edge" || effect.type === "super") {
        ctx.strokeStyle = effect.color || "#ffe36d";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.25;
        ctx.fillStyle = effect.color || "#ffe36d";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === "protected" || effect.type === "shieldHit") {
        ctx.strokeStyle = effect.color || "#ffe36d";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (effect.type === "blink") {
        ctx.strokeStyle = effect.color || "#c4b5fd";
        ctx.lineWidth = 4;
        for (let index = 0; index < 4; index += 1) {
          const angle = index * 1.57;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2);
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.stroke();
        }
      } else if (effect.type === "impact") {
        ctx.strokeStyle = effect.color || "#ffe36d";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawAim(ctx, now) {
    const self = this.getSelf();
    if (!self || !self.alive || this.state.status !== "playing") return;
    const x = this.smooth.get(`p:${self.id}`)?.x ?? self.x;
    const y = this.smooth.get(`p:${self.id}`)?.y ?? self.y;
    const pointer = this.pointer;
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) return;
    const direction = { x: dx / distance, y: dy / distance };
    const start = 26;
    const end = Math.min(distance, 430);

    ctx.save();
    ctx.strokeStyle = "rgba(227, 249, 255, 0.36)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(x + direction.x * start, y + direction.y * start);
    ctx.lineTo(x + direction.x * end, y + direction.y * end);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(pointer.x, pointer.y);
    ctx.strokeStyle = "rgba(255, 246, 210, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe36d";
    ctx.fill();
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 17, Math.sin(angle) * 17);
      ctx.lineTo(Math.cos(angle) * 23, Math.sin(angle) * 23);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHealthBar(ctx, x, y, width, hp, maxHp, shield, color) {
    const ratio = clamp(hp / maxHp, 0, 1);
    const shieldRatio = clamp(shield / maxHp, 0, 1 - ratio);
    const height = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(3, 16, 24, 0.75)";
    roundedRect(ctx, -width / 2 - 2, -2, width + 4, height + 4, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundedRect(ctx, -width / 2, 0, width, height, 4);
    ctx.fill();
    if (ratio > 0) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#c5ffe3");
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, "#0b5f4e");
      ctx.fillStyle = gradient;
      roundedRect(ctx, -width / 2, 0, width * ratio, height, 4);
      ctx.fill();
    }
    if (shieldRatio > 0) {
      ctx.fillStyle = "rgba(140, 229, 255, 0.8)";
      roundedRect(ctx, -width / 2 + width * ratio, 0, width * shieldRatio, height, 3);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    roundedRect(ctx, -width / 2, 0, width, height, 4);
    ctx.stroke();
    ctx.restore();
  }
}
