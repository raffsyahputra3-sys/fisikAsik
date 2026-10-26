import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8787);
const clientUrl = `http://127.0.0.1:${port}`;
const serverUrl = process.env.LOGICODIX_SERVER_URL || `ws://127.0.0.1:${port}`;

const phone = process.argv.includes("--phone");

const expectedVersion = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;

let server = null;
let desktop = null;
let shuttingDown = false;
let ownsServer = false;

async function health() {
  try {
    const response = await fetch(`${clientUrl}/healthz`, {
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Versi server yang sedang berjalan di port ini, atau null bila tidak terjangkau. */
async function runningVersion() {
  try {
    const response = await fetch(`${clientUrl}/healthz`, { signal: AbortSignal.timeout(1200) });
    return (await response.json()).version ?? "?";
  } catch {
    return null;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await health()) return true;
    if (server?.exitCode !== null && server?.exitCode !== undefined) return false;
    await delay(200);
  }
  return false;
}

async function electronBinary() {
  try {
    const electron = await import("electron");
    return typeof electron.default === "string" ? electron.default : null;
  } catch {
    return null;
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (desktop && desktop.exitCode === null) {
    try {
      desktop.kill();
    } catch {
      // Ignore.
    }
  }
  if (ownsServer && server && server.exitCode === null) {
    try {
      server.kill();
    } catch {
      // Ignore.
    }
  }
  process.exit(code);
}

async function main() {
  if (await health()) {
    const version = await runningVersion();
    if (version !== expectedVersion) {
      console.error(`[logicodix] Server lama (versi ${version}) masih berjalan di ${clientUrl}; versi terbaru ${expectedVersion}.`);
      console.error("[logicodix] Tutup terminal yang menjalankannya (Ctrl+C), atau jalankan di PowerShell:");
      console.error(`  Get-NetTCPConnection -LocalPort ${port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error("[logicodix] Lalu ulangi perintah ini.");
      shutdown(1);
      return;
    }
    console.log(`[logicodix] memakai server yang sudah berjalan di ${clientUrl} (versi ${version})`);
  } else {
    ownsServer = true;
    server = spawn(process.execPath, [path.join(root, "server", "index.js")], {
      cwd: root,
      env: { ...process.env, PORT: String(port) },
      stdio: "inherit",
      windowsHide: true,
    });
    server.on("exit", (code) => {
      if (!shuttingDown) {
        console.error(`[logicodix] server berhenti (kode ${code ?? 1}).`);
        shutdown(code ?? 1);
      }
    });
    if (!(await waitForServer())) {
      console.error(`[logicodix] server gagal siap di ${clientUrl}.`);
      shutdown(1);
      return;
    }
  }

  const binary = await electronBinary();
  if (!binary) {
    console.error("[logicodix] Electron belum terpasang. Jalankan: npm install");
    shutdown(1);
    return;
  }

  // VS Code menyetel ELECTRON_RUN_AS_NODE; bila ikut terwarisi, Electron berjalan sebagai Node biasa.
  const desktopEnv = { ...process.env };
  delete desktopEnv.ELECTRON_RUN_AS_NODE;

  desktop = spawn(binary, [root], {
    cwd: root,
    env: {
      ...desktopEnv,
      LOGICODIX_CLIENT_URL: clientUrl,
      LOGICODIX_SERVER_URL: serverUrl,
      ...(phone ? { LOGICODIX_PHONE: "1" } : {}),
    },
    stdio: "inherit",
    windowsHide: false,
  });

  desktop.on("exit", (code) => {
    if (!shuttingDown) {
      console.log("[logicodix] aplikasi desktop ditutup.");
      shutdown(code ?? 0);
    }
  });
  desktop.on("error", (error) => {
    console.error("[logicodix] gagal membuka Electron:", error.message);
    shutdown(1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((error) => {
  console.error("[logicodix] gagal memulai:", error);
  shutdown(1);
});
