import path from "node:path";
import { app, BrowserWindow, Menu, shell } from "electron";

const CLIENT_URL = (process.env.LOGICODIX_CLIENT_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const SERVER_URL = process.env.LOGICODIX_SERVER_URL || "";

// `npm run phone`: jendela berukuran ponsel (landscape) dengan kontrol sentuh yang bisa dicoba dengan mouse.
const PHONE = process.env.LOGICODIX_PHONE === "1";
const PHONE_SIZE = { width: 915, height: 412 };

// Jendela Electron kedua (mis. mode ponsel) tidak boleh berebut folder cache dengan yang pertama.
if (PHONE) app.setPath("userData", path.join(app.getPath("temp"), "logicodix-phone"));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let mainWindow = null;
let retryTimer = null;

function desktopUrl() {
  const url = new URL(`${CLIENT_URL}/`);
  if (SERVER_URL) url.searchParams.set("server", SERVER_URL);
  if (PHONE) url.searchParams.set("phone", "1");
  return url.toString();
}

function loadClient(window) {
  window.loadURL(desktopUrl()).catch(() => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: PHONE ? PHONE_SIZE.width : 1440,
    height: PHONE ? PHONE_SIZE.height : 900,
    useContentSize: true,
    minWidth: PHONE ? 320 : 980,
    minHeight: PHONE ? 320 : 640,
    backgroundColor: "#04131d",
    title: PHONE ? "Logicodix: tampilan HP (F2 putar, F3 ganti ukuran)" : "Logicodix: Momentum Arena",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  if (PHONE) {
    // F2 memutar potret/landscape, F3 berganti ukuran ponsel, F12 membuka DevTools
    const sizes = [
      [915, 412],
      [844, 390],
      [740, 360],
      [1024, 600],
    ];
    let sizeIndex = 0;
    mainWindow.webContents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown" || !mainWindow) return;
      if (input.key === "F2") {
        const [width, height] = mainWindow.getContentSize();
        mainWindow.setContentSize(height, width);
        event.preventDefault();
      } else if (input.key === "F3") {
        sizeIndex = (sizeIndex + 1) % sizes.length;
        const [width, height] = mainWindow.getContentSize();
        const landscape = width >= height;
        const [a, b] = sizes[sizeIndex];
        mainWindow.setContentSize(landscape ? a : b, landscape ? b : a);
        event.preventDefault();
      } else if (input.key === "F12") {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(CLIENT_URL)) event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    console.error(`[logicodix] gagal memuat ${url}: ${description} (${code})`);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mainWindow) loadClient(mainWindow);
    }, 2500);
  });

  loadClient(mainWindow);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  clearTimeout(retryTimer);
});
