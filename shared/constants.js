export const ARENA = Object.freeze({
  width: 2600,
  height: 1500,
  inset: 28,
});

export const TEAM_SIZE = 3;

export const TEAM = Object.freeze({
  BLUE: 0,
  RED: 1,
});

export const TEAM_NAMES = Object.freeze(["Samudra", "Merapi"]);

export const SURFACE = Object.freeze({
  friction: 8.5,
  heroRestitution: 0.38,
  coverRestitution: 0.52,
  minionRadius: 12,
  towerRadius: 46,
  nexusRadius: 72,
  baseHealRadius: 220,
});

export const MATCH = Object.freeze({
  duration: 480,
  select: 25,
  countdown: 5,
  respawn: 6,
  tickRate: 30,
  snapshotRate: 15,
  waveInterval: 14,
  firstWaveAt: 2,
  minionsPerWave: 3,
  maxProjectiles: 220,
});

export const CLASH = Object.freeze({
  firstAt: 20,
  interval: 35,
  duration: 5,
  resultDisplay: 2.6,
  slowFactor: 0.18,
  edgeDuration: 10,
  lossDuration: 5,
  lossSpeed: 0.9,
  edgeDamage: 1.15,
  edgeKnockback: 1.35,
});

export const COMBAT = Object.freeze({
  maxAmmo: 3,
  reloadTime: 1.25,
  superMax: 100,
  superPerDamage: 1.6,
  superPerClash: 45,
  superPerTakedown: 35,
  maxShield: 260,
});

export const INPUT = Object.freeze({
  UP: 1,
  DOWN: 2,
  LEFT: 4,
  RIGHT: 8,
  ATTACK: 16,
  DASH: 32,
  SHOCK: 64,
  ULTIMATE: 128,
});

export const SKILL_LEVELS = Object.freeze({
  pemula: 1,
  menengah: 2,
  mahir: 3,
});

export const SKILL_LABELS = Object.freeze({
  pemula: "Pemula",
  menengah: "Menengah",
  mahir: "Mahir",
});

export const DIFFICULTY_NAMES = Object.freeze({
  pemula: "Pemula",
  menengah: "Menengah",
  mahir: "Mahir",
});

export const HERO_ORDER = Object.freeze([
  "bastion",
  "vanguard",
  "shade",
  "ember",
  "quill",
  "lumen",
]);

// Peta MOBA 3 lane: Selat Malaka (atas), Jalan Raya Pos (tengah), Jalur Sutra Maritim (bawah).
export const LANE_IDS = Object.freeze(["top", "mid", "bot"]);
const LANE_Y = Object.freeze({ top: 260, mid: 750, bot: 1240 });

export const NEXUS = Object.freeze([
  Object.freeze({ x: 210, y: 750, radius: 72, hp: 1200 }),
  Object.freeze({ x: ARENA.width - 210, y: 750, radius: 72, hp: 1200 }),
]);

// Titik spawn tiap anggota tim (seat 0..2) di dekat Nexus.
export const SPAWNS = Object.freeze([
  Object.freeze([
    Object.freeze({ x: 360, y: 640 }),
    Object.freeze({ x: 380, y: 750 }),
    Object.freeze({ x: 360, y: 860 }),
  ]),
  Object.freeze([
    Object.freeze({ x: ARENA.width - 360, y: 640 }),
    Object.freeze({ x: ARENA.width - 380, y: 750 }),
    Object.freeze({ x: ARENA.width - 360, y: 860 }),
  ]),
]);

// Jalur lane dari sisi tim biru ke merah. Tim merah memakai urutan terbalik.
const BLUE_LANES = {
  top: [[430, 640], [520, 400], [700, LANE_Y.top], [ARENA.width - 700, LANE_Y.top], [ARENA.width - 520, 400], [ARENA.width - 430, 640]],
  mid: [[430, 750], [ARENA.width - 430, 750]],
  bot: [[430, 860], [520, 1100], [700, LANE_Y.bot], [ARENA.width - 700, LANE_Y.bot], [ARENA.width - 520, 1100], [ARENA.width - 430, 860]],
};

export const LANES = Object.freeze(
  Object.fromEntries(
    LANE_IDS.map((lane) => [
      lane,
      Object.freeze([
        Object.freeze(BLUE_LANES[lane].map(([x, y]) => Object.freeze({ x, y }))),
        Object.freeze(
          [...BLUE_LANES[lane]].reverse().map(([x, y]) => Object.freeze({ x, y })),
        ),
      ]),
    ]),
  ),
);

// Dua menara per lane per tim (luar + dalam). Posisi luar/dalam dihitung sepanjang jalur.
function turretPoint(lane, team, fraction) {
  const path = BLUE_LANES[lane];
  const points = team === 0 ? path : [...path].reverse();
  const lengths = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
    lengths.push(length);
    total += length;
  }
  let remaining = total * fraction;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const t = remaining / lengths[index];
      return {
        x: Math.round(points[index][0] + (points[index + 1][0] - points[index][0]) * t),
        y: Math.round(points[index][1] + (points[index + 1][1] - points[index][1]) * t),
      };
    }
    remaining -= lengths[index];
  }
  return { x: points[points.length - 1][0], y: points[points.length - 1][1] };
}

export const TOWERS = Object.freeze(
  [0, 1].flatMap((team) =>
    LANE_IDS.flatMap((lane) =>
      [
        { tier: "inner", fraction: lane === "mid" ? 0.14 : 0.2 },
        { tier: "outer", fraction: lane === "mid" ? 0.3 : 0.34 },
      ].map(({ tier, fraction }) =>
        Object.freeze({
          ...turretPoint(lane, team, fraction),
          team,
          lane,
          tier,
          radius: 46,
          hp: tier === "inner" ? 620 : 520,
          range: 560,
          damage: 22,
          interval: 0.95,
        }),
      ),
    ),
  ),
);

const COVER_LEFT = [
  { x: 780, y: 420, w: 40, h: 150, hp: 150 },
  { x: 780, y: 930, w: 40, h: 150, hp: 150 },
  { x: 1000, y: 520, w: 160, h: 40, hp: 170 },
  { x: 1000, y: 940, w: 160, h: 40, hp: 170 },
];
export const COVERS = Object.freeze([
  ...COVER_LEFT,
  ...COVER_LEFT.map((cover) => ({ ...cover, x: ARENA.width - cover.x - cover.w })),
  { x: 1220, y: 430, w: 160, h: 40, hp: 170 },
  { x: 1220, y: 1030, w: 160, h: 40, hp: 170 },
].map((cover) => Object.freeze(cover)));

export const MINION = Object.freeze({
  hp: 52,
  radius: 12,
  speed: 82,
  damage: 7,
  interval: 1.05,
  range: 74,
  xp: 20,
});

export const SCORE = Object.freeze({
  kill: 100,
  clashWin: 50,
  correct: 10,
  tower: 180,
  minute: 0,
});
