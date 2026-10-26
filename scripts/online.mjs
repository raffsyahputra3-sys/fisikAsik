import { spawn } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8787);
const base = `http://127.0.0.1:${port}`;
const toolsDir = path.join(root, "tools");
const isWin = process.platform === "win32";
const binName = isWin ? "cloudflared.exe" : "cloudflared";
const binPath = path.join(toolsDir, binName);

const ASSETS = {
  win32: "cloudflared-windows-amd64.exe",
  linux: process.arch === "arm64" ? "cloudflared-linux-arm64" : "cloudflared-linux-amd64",
};

let server = null;
let tunnel = null;
let ownsServer = false;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [tunnel, ownsServer ? server : null]) {
    if (child && child.exitCode === null) {
      try {
        child.kill();
      } catch {
        // Ignore.
      }
    }
  }
  process.exit(code);
}

async function healthy() {
  try {
    const response = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await healthy()) return true;
    if (server && server.exitCode !== null) return false;
    await delay(200);
  }
  return false;
}

async function ensureServer() {
  if (await healthy()) {
    console.log(`[online] memakai server yang sudah berjalan di ${base}`);
    return;
  }

  ownsServer = true;
  server = spawn(process.execPath, [path.join(root, "server", "index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "inherit",
    windowsHide: true,
  });

  if (!(await waitForServer())) {
    console.error(`[online] server gagal siap di ${base}.`);
    shutdown(1);
    return false;
  }
  console.log(`[online] server game siap di ${base}`);
  return true;
}

async function ensureCloudflared() {
  if (existsSync(binPath)) return true;

  const asset = ASSETS[process.platform];
  if (!asset) {
    console.error("[online] Platform ini belum didukung unduhan otomatis.");
    console.error("[online] Pasang cloudflared manual: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
    return false;
  }

  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`;
  console.log("[online] mengunduh cloudflared sekali saja...");
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await mkdir(toolsDir, { recursive: true });
    await writeFile(binPath, Buffer.from(await response.arrayBuffer()));
    if (!isWin) await chmod(binPath, 0o755);
    console.log("[online] cloudflared siap.");
    return true;
  } catch (error) {
    console.error(`[online] gagal mengunduh cloudflared: ${error.message}`);
    console.error("[online] Pasang manual lalu ulangi: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
    return false;
  }
}

async function startTunnel() {
  return new Promise((resolve, reject) => {
    let found = false;
    let buffer = "";
    const pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

    tunnel = spawn(binPath, ["tunnel", "--url", base, "--no-autoupdate"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const onData = (chunk) => {
      const text = chunk.toString();
      buffer += text;
      if (!found) {
        const match = buffer.match(pattern);
        if (match) {
          found = true;
          resolve(match[0]);
        }
      }
    };

    tunnel.stdout.on("data", onData);
    tunnel.stderr.on("data", onData);

    tunnel.on("error", (error) => {
      if (!found) reject(error);
    });

    tunnel.on("exit", (code) => {
      if (!found) {
        reject(new Error(`cloudflared berhenti (kode ${code ?? 1}).`));
        return;
      }
      if (!shuttingDown) {
        console.error(`[online] tunnel berhenti (kode ${code ?? 1}).`);
        shutdown(code ?? 1);
      }
    });
  });
}

async function main() {
  if (!(await ensureServer())) return;
  if (!(await ensureCloudflared())) {
    shutdown(1);
    return;
  }

  const url = await startTunnel();
  console.log("");
  console.log("  Link publik game kamu (bisa dibuka dari mana saja):");
  console.log(`  ${url}`);
  console.log("");
  console.log("  Buka link itu di HP/laptop siapa pun, lalu:");
  console.log("  - CARI LAWAN untuk matchmaking online");
  console.log("  - BUAT ROOM lalu bagikan kode ke teman");
  console.log("");
  console.log("  Biarkan terminal ini tetap terbuka. Tekan Ctrl+C untuk berhenti.");
  console.log("");
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((error) => {
  console.error(`[online] gagal: ${error.message}`);
  shutdown(1);
});
