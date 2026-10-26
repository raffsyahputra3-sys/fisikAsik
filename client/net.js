export function normalizeServerUrl(raw) {
  let value = String(raw ?? "").trim();
  if (!value) return "ws://127.0.0.1:8787";
  if (value.startsWith("http://")) value = `ws://${value.slice(7)}`;
  else if (value.startsWith("https://")) value = `wss://${value.slice(8)}`;
  else if (!value.startsWith("ws://") && !value.startsWith("wss://")) {
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/.test(value);
    value = `${isLocal ? "ws" : "wss"}://${value}`;
  }
  return value.replace(/\/+$/, "");
}

function defaultServerUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("server");
  if (fromQuery) return normalizeServerUrl(fromQuery);
  const saved = localStorage.getItem("logicodix.server");
  if (saved) return normalizeServerUrl(saved);
  // Server bawaan yang disuntikkan saat build (mis. server publik untuk APK).
  if (window.LOGICODIX_DEFAULT_SERVER) return normalizeServerUrl(window.LOGICODIX_DEFAULT_SERVER);
  // Aplikasi Android (Capacitor) dimuat dari perangkat sendiri, bukan dari server game:
  // alamat server harus diisi pemain (emulator memakai 10.0.2.2 untuk komputer host).
  if (document.body?.dataset.native === "1") return "ws://10.0.2.2:8787";
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://127.0.0.1:8787";
}

export class GameClient {
  constructor({ onStatus, onMessage }) {
    this.url = defaultServerUrl();
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.ws = null;
    this.session = this.readSession();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.attempt = 0;
    this.manualClose = false;
    this.lastInputAt = 0;
    this.connecting = false;
  }

  readSession() {
    try {
      const raw = sessionStorage.getItem("logicodix.session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.token && parsed?.roomCode) return parsed;
    } catch {
      // Ignore corrupt session storage.
    }
    return null;
  }

  setSession(session) {
    this.session = session;
    if (!session) {
      sessionStorage.removeItem("logicodix.session");
      return;
    }
    sessionStorage.setItem("logicodix.session", JSON.stringify(session));
  }

  clearSession() {
    this.setSession(null);
  }

  setUrl(raw) {
    this.url = normalizeServerUrl(raw);
    localStorage.setItem("logicodix.server", this.url);
  }

  connect(url = this.url) {
    this.setUrl(url);
    this.manualClose = false;
    this.clearReconnectTimer();
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      try {
        this.ws.close(4000, "Reconnect");
      } catch {
        // Ignore.
      }
      this.ws = null;
    }
    this.open();
  }

  open() {
    if (this.connecting) return;
    this.connecting = true;
    this.onStatus?.("connecting", { url: this.url, attempt: this.attempt });
    let socket;
    try {
      socket = new WebSocket(this.url);
    } catch (error) {
      this.connecting = false;
      this.onStatus?.("offline", { error: error.message });
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.addEventListener("open", () => {
      if (this.ws !== socket) return;
      this.connecting = false;
      this.attempt = 0;
      this.onStatus?.("online", { url: this.url });
      this.startHeartbeat();
      if (this.session) {
        this.send({
          type: "resume",
          token: this.session.token,
          roomCode: this.session.roomCode,
        });
      }
    });

    socket.addEventListener("message", (event) => {
      if (this.ws !== socket) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      this.onMessage?.(message);
    });

    socket.addEventListener("close", (event) => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.connecting = false;
      this.stopHeartbeat();
      if (this.manualClose) return;
      this.onStatus?.("offline", {
        code: event.code,
        reason: event.reason,
        attempt: this.attempt,
      });
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      if (this.ws !== socket) return;
      this.onStatus?.("offline", { attempt: this.attempt });
    });
  }

  scheduleReconnect() {
    if (this.manualClose || this.reconnectTimer) return;
    const delay = Math.min(6000, 700 * 2 ** Math.min(this.attempt, 3));
    this.attempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  reconnectNow() {
    this.clearReconnectTimer();
    if (this.ws) {
      try {
        this.ws.close(4000, "Manual retry");
      } catch {
        // Ignore.
      }
      this.ws = null;
    }
    this.attempt = 0;
    this.connecting = false;
    this.open();
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: "ping", t: Date.now() });
    }, 20_000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  sendInput(mask, aimX, aimY, now = performance.now()) {
    if (now - this.lastInputAt < 33) return;
    this.lastInputAt = now;
    this.send({
      type: "input",
      mask,
      aimX: Math.round(aimX * 10) / 10,
      aimY: Math.round(aimY * 10) / 10,
    });
  }

  disconnect({ clearSession = true } = {}) {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (clearSession) this.clearSession();
    if (this.ws) {
      try {
        this.ws.close(1000, "Client closed");
      } catch {
        // Ignore.
      }
      this.ws = null;
    }
    this.connecting = false;
  }
}
