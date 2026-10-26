import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQuestionBank } from "../shared/questions.js";
import { HEROES } from "../shared/heroes.js";
import { HERO_ORDER } from "../shared/constants.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const targets = ["client", "server", "shared", "electron", "scripts", "test"];
const required = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "package.json",
  "client/main.js",
  "client/net.js",
  "client/render.js",
  "client/input.js",
  "client/audio.js",
  "server/index.js",
  "server/room.js",
  "server/bot.js",
  "shared/constants.js",
  "shared/heroes.js",
  "shared/physics.js",
  "shared/questions.js",
  "electron/main.js",
  "scripts/start.mjs",
];

async function collect(directory) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const target of targets) {
  const info = await stat(path.join(root, target)).catch(() => null);
  if (!info?.isDirectory()) {
    errors.push(`Folder wajib tidak ditemukan: ${target}/`);
  }
}

for (const file of required) {
  const info = await stat(path.join(root, file)).catch(() => null);
  if (!info?.isFile()) errors.push(`File wajib tidak ditemukan: ${file}`);
}

let checked = 0;
const files = new Set();
for (const target of targets) {
  for (const file of await collect(path.join(root, target))) files.add(file);
}
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8",
  });
  checked += 1;
  if (result.status !== 0) {
    errors.push(`Sintaks gagal: ${path.relative(root, file)}\n${result.stderr.trim()}`);
  }
}

const questionErrors = validateQuestionBank();
errors.push(...questionErrors);

const heroIds = Object.keys(HEROES);
if (HERO_ORDER.length !== 6) errors.push("MVP harus memiliki 6 hero.");
for (const heroId of HERO_ORDER) {
  if (!HEROES[heroId]) errors.push(`Hero tidak ditemukan: ${heroId}`);
}
if (heroIds.length !== HERO_ORDER.length) errors.push("Daftar hero tidak konsisten.");

const html = await readFile(path.join(root, "index.html"), "utf8");
if (!html.includes("/client/main.js")) errors.push("index.html tidak memuat client/main.js.");
if (!html.includes('id="gameCanvas"')) errors.push("index.html tidak memiliki canvas arena.");

const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
if (!["standalone", "fullscreen"].includes(manifest.display)) errors.push("Manifest harus memakai display standalone atau fullscreen.");
if (manifest.orientation !== "landscape") errors.push("Manifest harus mengunci orientasi landscape.");
for (const size of ["192x192", "512x512"]) {
  if (!manifest.icons?.some((icon) => icon.sizes === size && icon.type === "image/png")) errors.push(`Manifest butuh ikon PNG ${size}.`);
}

if (errors.length > 0) {
  console.error("Pemeriksaan gagal:");
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Pemeriksaan lulus: ${checked} file JS valid, bank soal valid, 6 hero tersedia.`);
}
