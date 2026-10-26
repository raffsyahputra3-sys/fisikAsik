import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { HEROES } from "../shared/heroes.js";
import { SKILL_LEVELS } from "../shared/constants.js";
import { Room } from "./room.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OPEN = 1;
// Versi diambil dari package.json agar peluncur bisa mendeteksi server lama yang masih berjalan.
const VERSION = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== OPEN) return;
  ws.send(JSON.stringify(payload));
}

function makeCode(rooms) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let code = "";
    for (let index = 0; index < 5; index += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `R${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

function cleanName(raw) {
  const name = String(raw ?? "")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14);
  return name.length >= 2 ? name : "Pilot";
}

function cleanHero(raw) {
  return typeof raw === "string" && HEROES[raw] ? raw : "bastion";
}

function cleanSkill(raw) {
  if (typeof raw === "number") {
    return Math.max(1, Math.min(3, Math.floor(raw)));
  }
  return SKILL_LEVELS[raw] ?? SKILL_LEVELS.menengah;
}

function cleanProfile(message) {
  return {
    name: cleanName(message.name),
    heroId: cleanHero(message.heroId),
    skillLevel: cleanSkill(message.skillLevel),
  };
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function createGameServer(options = {}) {
  const rooms = new Map();
  const sessions = new Map();
  const queue = [];
  const contexts = new Map();
  const startedAt = Date.now();
  const log = options.log ?? console;

  function registerRoom(room) {
    rooms.set(room.code, room);
    room.hooks.onEmpty = () => {
      rooms.delete(room.code);
      for (const player of room.players.values()) {
        if (player.token) sessions.delete(player.token);
      }
    };
    return room;
  }

  function createRoom(mode = "online") {
    const code = makeCode(rooms);
    return registerRoom(new Room(code, mode));
  }

  function bindContext(ctx, room, player) {
    ctx.roomCode = room.code;
    ctx.playerId = player.id;
    ctx.token = player.token;
    sessions.set(player.token, { roomCode: room.code, playerId: player.id });
    ctx.queued = false;
  }

  function findContextByPlayer(roomCode, playerId) {
    for (const [ws, ctx] of contexts) {
      if (ctx.roomCode === roomCode && ctx.playerId === playerId && ws.readyState === OPEN) {
        return { ws, ctx };
      }
    }
    return null;
  }

  function sendError(ws, message) {
    safeSend(ws, { type: "error", message });
  }

  function attachToRoom(ctx, room, player) {
    bindContext(ctx, room, player);
    const existing = findContextByPlayer(room.code, player.id);
    if (existing && existing.ws !== ctx.ws) {
      try {
        existing.ws.close(4001, "Session resumed elsewhere");
      } catch {
        // Ignore stale socket close failures.
      }
    }
  }

  function createSoloRoom(ctx, profile, mode) {
    const room = createRoom(mode);
    const result = room.addHuman({
      ...profile,
      socket: ctx.ws,
    });
    if (result.error) {
      rooms.delete(room.code);
      sendError(ctx.ws, result.error);
      return null;
    }
    attachToRoom(ctx, room, result.player);

    if (mode === "practice") {
      // dua sekutu dan tiga lawan bot diisi otomatis saat countdown (3v3)
      result.player.ready = true;
      room.maybeStartCountdown();
      room.broadcastLobby();
    }
    return { room, player: result.player };
  }

  function createPrivateRoom(ctx, profile) {
    const room = createRoom("online");
    const result = room.addHuman({ ...profile, socket: ctx.ws });
    if (result.error) {
      rooms.delete(room.code);
      sendError(ctx.ws, result.error);
      return null;
    }
    attachToRoom(ctx, room, result.player);
    return { room, player: result.player };
  }

  function joinPrivateRoom(ctx, profile, rawCode) {
    const code = String(rawCode ?? "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      sendError(ctx.ws, "Kode room tidak ditemukan.");
      return null;
    }
    if (room.status !== "lobby" || room.full) {
      sendError(ctx.ws, "Room sudah penuh atau pertandingan sudah berjalan.");
      return null;
    }
    const result = room.addHuman({ ...profile, socket: ctx.ws });
    if (result.error) {
      sendError(ctx.ws, result.error);
      return null;
    }
    attachToRoom(ctx, room, result.player);
    safeSend(ctx.ws, { type: "toast", text: `Bergabung ke room ${room.code}.`, tone: "good" });
    return { room, player: result.player };
  }

  function handleQuickMatch(ctx, profile) {
    if (ctx.roomCode) {
      sendError(ctx.ws, "Kamu sudah berada dalam room.");
      return;
    }
    if (ctx.queued) {
      sendError(ctx.ws, "Kamu sudah berada dalam antrean.");
      return;
    }

    const waitingIndex = queue.findIndex(
      (entry) =>
        entry.ws !== ctx.ws &&
        entry.ws.readyState === OPEN &&
        !entry.ctx.roomCode &&
        entry.ctx.queued,
    );

    if (waitingIndex === -1) {
      queue.push({ ws: ctx.ws, ctx, profile, at: Date.now() });
      ctx.queued = true;
      safeSend(ctx.ws, {
        type: "queueStatus",
        waiting: true,
        position: queue.length,
        text: "Mencari lawan online...",
      });
      return;
    }

    const [waiting] = queue.splice(waitingIndex, 1);
    waiting.ctx.queued = false;
    ctx.queued = false;

    const room = createRoom("online");
    const first = room.addHuman({ ...waiting.profile, socket: waiting.ws });
    if (first.error) {
      rooms.delete(room.code);
      sendError(waiting.ws, first.error);
      queue.push({ ws: ctx.ws, ctx, profile, at: Date.now() });
      ctx.queued = true;
      return;
    }
    const second = room.addHuman({ ...profile, socket: ctx.ws });
    if (second.error) {
      rooms.delete(room.code);
      sendError(ctx.ws, second.error);
      sendError(waiting.ws, "Gagal membuat pertandingan. Coba lagi.");
      return;
    }

    attachToRoom(waiting.ctx, room, first.player);
    attachToRoom(ctx, room, second.player);
    first.player.ready = true;
    second.player.ready = true;
    room.broadcast({ type: "toast", text: "Lawan ditemukan. Bersiap!", tone: "good" });
    room.maybeStartCountdown();
    room.broadcastLobby();
  }

  function cancelQueue(ctx) {
    const index = queue.findIndex((entry) => entry.ws === ctx.ws);
    if (index !== -1) queue.splice(index, 1);
    ctx.queued = false;
    safeSend(ctx.ws, { type: "queueStatus", waiting: false });
  }

  function detach(ws) {
    const ctx = contexts.get(ws);
    if (!ctx) return;
    contexts.delete(ws);
    if (ctx.queued) {
      const index = queue.findIndex((entry) => entry.ws === ws);
      if (index !== -1) queue.splice(index, 1);
      ctx.queued = false;
    }
    if (!ctx.roomCode || !ctx.playerId) return;
    const room = rooms.get(ctx.roomCode);
    if (!room) return;
    const player = room.players.get(ctx.playerId);
    if (!player) return;
    if (player.socket && player.socket !== ws) return;
    room.handleDisconnect(ctx.playerId, Date.now());
  }

  async function serveStatic(request, response) {
    const url = new URL(request.url, "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    if (pathname === "/favicon.ico") pathname = "/assets/favicon.svg";

    const allowed =
      pathname === "/index.html" ||
      pathname === "/styles.css" ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/sw.js" ||
      pathname === "/ui2.css" ||
      pathname.startsWith("/client/") ||
      pathname.startsWith("/shared/") ||
      pathname.startsWith("/assets/");

    if (!allowed) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (!isPathInside(ROOT, filePath) && filePath !== path.join(ROOT, "index.html")) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error("not a file");
      const data = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(data);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  }

  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === "/healthz") {
        const playerCount = [...rooms.values()].reduce(
          (sum, room) => sum + room.players.size,
          0,
        );
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(
          JSON.stringify({
            ok: true,
            version: VERSION,
            uptime: Math.floor((Date.now() - startedAt) / 1000),
            rooms: rooms.size,
            players: playerCount,
            queue: queue.length,
          }),
        );
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405);
        response.end("Method not allowed");
        return;
      }
      await serveStatic(request, response);
    } catch (error) {
      log.error?.("HTTP error", error);
      response.writeHead(500);
      response.end("Internal server error");
    }
  });

  const wss = new WebSocketServer({
    server,
    maxPayload: 16 * 1024,
    perMessageDeflate: false,
  });

  wss.on("connection", (ws, request) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const ctx = {
      ws,
      roomCode: null,
      playerId: null,
      token: null,
      queued: false,
      messages: 0,
      windowStart: Date.now(),
      remoteAddress: request.socket.remoteAddress,
    };
    contexts.set(ws, ctx);

    safeSend(ws, {
      type: "connected",
      version: VERSION,
      serverTime: Date.now(),
    });

    ws.on("message", (buffer) => {
      const now = Date.now();
      if (now - ctx.windowStart > 10_000) {
        ctx.windowStart = now;
        ctx.messages = 0;
      }
      ctx.messages += 1;
      if (ctx.messages > 700) {
        sendError(ws, "Terlalu banyak pesan. Koneksi dihentikan.");
        ws.close(4008, "Rate limit");
        return;
      }

      let message;
      try {
        message = JSON.parse(buffer.toString("utf8"));
      } catch {
        sendError(ws, "Format pesan tidak valid.");
        return;
      }
      if (!message || typeof message.type !== "string") {
        sendError(ws, "Pesan tidak memiliki tipe.");
        return;
      }

      if (message.type === "ping") {
        safeSend(ws, { type: "pong", t: message.t ?? null, serverTime: now });
        return;
      }

      if (message.type === "createRoom") {
        if (ctx.roomCode) return sendError(ws, "Kamu sudah berada dalam room.");
        createPrivateRoom(ctx, cleanProfile(message));
        return;
      }

      if (message.type === "joinRoom") {
        if (ctx.roomCode) return sendError(ws, "Kamu sudah berada dalam room.");
        joinPrivateRoom(ctx, cleanProfile(message), message.code);
        return;
      }

      if (message.type === "practice") {
        if (ctx.roomCode) return sendError(ws, "Kamu sudah berada dalam room.");
        createSoloRoom(ctx, cleanProfile(message), "practice");
        return;
      }

      if (message.type === "quickMatch") {
        handleQuickMatch(ctx, cleanProfile(message));
        return;
      }

      if (message.type === "cancelQueue") {
        cancelQueue(ctx);
        return;
      }

      if (message.type === "resume") {
        if (ctx.roomCode) return sendError(ws, "Koneksi ini sudah terikat ke room.");
        const token = String(message.token ?? "");
        const roomCode = String(message.roomCode ?? "").toUpperCase();
        const session = sessions.get(token);
        if (!session || session.roomCode !== roomCode) {
          sendError(ws, "Sesi reconnect tidak valid atau sudah kedaluwarsa.");
          return;
        }
        const room = rooms.get(session.roomCode);
        if (!room) {
          sessions.delete(token);
          sendError(ws, "Room sudah tidak tersedia.");
          return;
        }
        const result = room.resumePlayer(session.playerId, ws, now);
        if (result.error) {
          sendError(ws, result.error);
          return;
        }
        ctx.roomCode = room.code;
        ctx.playerId = result.player.id;
        ctx.token = result.player.token;
        return;
      }

      if (message.type === "ready") {
        if (!ctx.roomCode || !ctx.playerId) return;
        rooms.get(ctx.roomCode)?.setReady(ctx.playerId, message.value, now);
        return;
      }

      if (message.type === "signal") {
        if (!ctx.roomCode || !ctx.playerId) return;
        rooms.get(ctx.roomCode)?.handlePing(ctx.playerId, message, now);
        return;
      }

      if (message.type === "pickHero") {
        if (!ctx.roomCode || !ctx.playerId) return;
        const result = rooms.get(ctx.roomCode)?.pickHero(ctx.playerId, message.heroId, now);
        if (result?.error) sendError(ws, result.error);
        return;
      }

      if (message.type === "lockHero") {
        if (!ctx.roomCode || !ctx.playerId) return;
        const result = rooms.get(ctx.roomCode)?.lockHero(ctx.playerId, now);
        if (result?.error) sendError(ws, result.error);
        return;
      }

      if (message.type === "input") {
        if (!ctx.roomCode || !ctx.playerId) return;
        rooms.get(ctx.roomCode)?.setInput(ctx.playerId, message);
        return;
      }

      if (message.type === "quizAnswer") {
        if (!ctx.roomCode || !ctx.playerId) return;
        const room = rooms.get(ctx.roomCode);
        if (!room) return;
        const result = room.answerQuiz(
          ctx.playerId,
          String(message.clashId ?? ""),
          Number(message.option),
          now,
        );
        safeSend(ws, {
          type: "quizAck",
          clashId: message.clashId ?? null,
          accepted: result.accepted,
          correct: result.correct ?? false,
          reason: result.reason ?? null,
        });
        return;
      }

      if (message.type === "leave") {
        const roomCode = ctx.roomCode;
        const playerId = ctx.playerId;
        const token = ctx.token;
        if (ctx.queued) cancelQueue(ctx);
        if (roomCode && playerId) {
          const room = rooms.get(roomCode);
          room?.handleDisconnect(playerId, now);
          if (token) sessions.delete(token);
        }
        ctx.roomCode = null;
        ctx.playerId = null;
        ctx.token = null;
        safeSend(ws, { type: "left" });
        return;
      }

      sendError(ws, `Tipe pesan tidak dikenal: ${message.type}`);
    });

    ws.on("close", () => detach(ws));
    ws.on("error", (error) => {
      log.warn?.("WebSocket error", error.message);
      detach(ws);
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // Socket may already be closing.
      }
    }
  }, 30_000);

  const gameLoop = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      try {
        room.tick(now);
      } catch (error) {
        log.error?.(`Room ${room.code} tick error`, error);
      }
    }
  }, 1000 / 30);

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.shouldDispose(now)) {
        rooms.delete(code);
        for (const player of room.players.values()) {
          if (player.token) sessions.delete(player.token);
        }
      }
    }
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      const entry = queue[index];
      if (entry.ws.readyState !== OPEN || entry.ctx.roomCode) {
        entry.ctx.queued = false;
        queue.splice(index, 1);
      }
    }
  }, 10_000);

  async function listen(port = Number(process.env.PORT ?? 8787), host = "0.0.0.0") {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        resolve();
      });
    });
    return server.address();
  }

  async function close() {
    clearInterval(heartbeat);
    clearInterval(gameLoop);
    clearInterval(sweeper);
    for (const ws of wss.clients) {
      try {
        ws.close(1001, "Server shutting down");
      } catch {
        // Ignore.
      }
    }
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }

  return {
    server,
    wss,
    rooms,
    sessions,
    queue,
    contexts,
    listen,
    close,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const app = createGameServer();
  const port = Number(process.env.PORT ?? 8787);
  app
    .listen(port)
    .then((address) => {
      const actualPort = typeof address === "object" && address ? address.port : port;
      console.log(`Logicodix server listening on http://0.0.0.0:${actualPort}`);
      console.log(`Health: http://127.0.0.1:${actualPort}/healthz`);
      for (const addresses of Object.values(networkInterfaces())) {
        for (const address of addresses ?? []) {
          if (address.family === "IPv4" && !address.internal) {
            console.log(`Android/HP di jaringan yang sama: buka http://${address.address}:${actualPort}`);
          }
        }
      }
    })
    .catch((error) => {
      console.error("Failed to start server", error);
      process.exitCode = 1;
    });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}


