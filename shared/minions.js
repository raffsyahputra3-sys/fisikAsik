import { TEAM } from "./constants.js";

// Tampilan minion per faksi (murni visual; statistik minion ada di MINION, constants.js).
// Samudra: prajurit pesisir biru-teal bersenjata tombak/trisula dan tameng kerang.
// Merapi: prajurit gunung merah-emas bersenjata pedang pendek dan tameng kayu.
// Perbedaan tim terbaca lewat bentuk (tombak vs pedang, kerang vs kayu, kain vs sabuk),
// bukan hanya warna, agar aman untuk buta warna.

export const MINION_SKINS = Object.freeze({
  [TEAM.BLUE]: Object.freeze({
    faction: "Samudra",
    name: "Prajurit Pesisir",
    palette: Object.freeze({ main: "#1E90FF", dark: "#0A4D4A", light: "#F0F8FF", accent: "#7DD3FC" }),
    melee: "trident",
    ranged: "bow",
    shield: "shell",
    outfit: "cloth",
  }),
  [TEAM.RED]: Object.freeze({
    faction: "Merapi",
    name: "Prajurit Gunung",
    palette: Object.freeze({ main: "#8B1A1A", dark: "#1A1A1A", light: "#D4AF37", accent: "#F97316" }),
    melee: "sword",
    ranged: "fireBow",
    shield: "wood",
    outfit: "vest",
  }),
});

export const MINION_VARIANTS = Object.freeze(["melee", "ranged"]);

/** Dalam satu lane (3 minion): dua petarung jarak dekat dan satu pemanah. */
export function minionVariant(index) {
  return index % 3 === 2 ? "ranged" : "melee";
}

/** "#RRGGBB" menjadi angka 0xRRGGBB untuk material. */
export function hexToNumber(hex) {
  return Number.parseInt(String(hex).replace("#", ""), 16);
}

export function minionSkin(team) {
  return MINION_SKINS[team] ?? MINION_SKINS[TEAM.BLUE];
}
