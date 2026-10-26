// Menyalin client web (HTML/CSS/JS/aset) ke ./www untuk dibungkus Capacitor menjadi APK.
// Server game tetap berjalan terpisah; aplikasi hanya menyambung lewat WebSocket.
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "www");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ["index.html", "styles.css", "ui2.css", "manifest.webmanifest"]) {
  await cp(path.join(root, entry), path.join(out, entry));
}
for (const directory of ["client", "shared", "assets"]) {
  await cp(path.join(root, directory), path.join(out, directory), { recursive: true });
}

// Di aplikasi native, CSP bawaan halaman cukup; tandai build agar klien tahu ia berjalan native.
const indexPath = path.join(out, "index.html");
let html = await readFile(indexPath, "utf8");
const defaultServer = (process.env.LOGICODIX_DEFAULT_SERVER || "").trim();
if (defaultServer) {
  const tag = `<script>window.LOGICODIX_DEFAULT_SERVER = ${JSON.stringify(defaultServer)};</script>\n</head>`;
  html = html.replace("</head>", tag);
}
await writeFile(indexPath, html.replace('<body data-screen="home">', '<body data-screen="home" data-native="1">'));

console.log(`www siap: ${out}`);
