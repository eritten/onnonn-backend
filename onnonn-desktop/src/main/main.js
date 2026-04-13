import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  session,
  shell,
  nativeImage,
  Notification,
  desktopCapturer
} from "electron";
import { autoUpdater } from "electron-updater";
import { createAppMenu } from "./menu.js";
import { clearSession, getSession, getWindowState, setSession, setWindowState } from "./store.js";
import sharedConfig from "../shared/config.json";

const { APP_PROTOCOL, API_BASE_URL } = sharedConfig;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let meetingWindow;
let tray;
let pendingProtocolUrls = [];
let preferredDisplaySourceId = null;

const isDev = !app.isPackaged;
const appIconPath = path.join(__dirname, "../../public/icon.ico");
const packagedRendererIndexPath = path.join(app.getAppPath(), ".vite", "renderer", "index.html");
const apiOrigin = new URL(API_BASE_URL).origin;

function getWindowRoute(route = "/") {
  if (isDev) {
    return `http://localhost:5173/#${route}`;
  }

  return route;
}

function canUseWindow(targetWindow) {
  return Boolean(targetWindow && !targetWindow.isDestroyed());
}

function showWindow(targetWindow) {
  if (canUseWindow(targetWindow)) {
    targetWindow.show();
    return true;
  }

  return false;
}

function focusWindow(targetWindow) {
  if (canUseWindow(targetWindow)) {
    targetWindow.focus();
    return true;
  }

  return false;
}

function sendToWindow(targetWindow, channel, payload) {
  if (canUseWindow(targetWindow) && !targetWindow.webContents.isDestroyed()) {
    targetWindow.webContents.send(channel, payload);
  }
}

async function loadWindow(targetWindow, route = "/") {
  if (!canUseWindow(targetWindow)) {
    return;
  }

  try {
    if (isDev) {
      await targetWindow.loadURL(getWindowRoute(route));
      return;
    }

    await targetWindow.loadFile(packagedRendererIndexPath, { hash: route });
  } catch (error) {
    console.error(`Failed to load renderer route "${route}"`, error);
  }
}

function createMainWindow() {
  const bounds = getWindowState("main", { width: 1440, height: 920 });
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1180,
    minHeight: 760,
    title: "Onnonn",
    backgroundColor: "#0F172A",
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    showWindow(mainWindow);
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Main window failed to load", {
      errorCode,
      errorDescription,
      validatedURL,
      expectedPath: packagedRendererIndexPath
    });
  });
  loadWindow(mainWindow, "/");
  mainWindow.on("close", () => {
    if (canUseWindow(mainWindow)) {
      setWindowState("main", mainWindow.getBounds());
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}

function createMeetingWindow(payload) {
  if (meetingWindow && !meetingWindow.isDestroyed()) {
    meetingWindow.focus();
    meetingWindow.webContents.send("meeting:join", payload);
    return meetingWindow;
  }

  const bounds = getWindowState("meeting", { width: 1600, height: 960 });
  meetingWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1280,
    minHeight: 720,
    title: payload.title || "Onnonn Meeting",
    backgroundColor: "#0F172A",
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  meetingWindow.once("ready-to-show", () => {
    showWindow(meetingWindow);
  });
  meetingWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Meeting window failed to load", {
      errorCode,
      errorDescription,
      validatedURL,
      expectedPath: packagedRendererIndexPath
    });
  });
  loadWindow(meetingWindow, `/meeting-room?meetingId=${encodeURIComponent(payload.meetingId || "")}&title=${encodeURIComponent(payload.title || "Meeting")}`);
  meetingWindow.on("close", () => {
    if (canUseWindow(meetingWindow)) {
      setWindowState("meeting", meetingWindow.getBounds());
    }
  });
  meetingWindow.on("closed", () => {
    meetingWindow = null;
  });
  return meetingWindow;
}

function setupTray() {
  tray = new Tray(nativeImage.createFromPath(appIconPath));
  tray.setToolTip("Onnonn");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Onnonn", click: () => showWindow(mainWindow) || createMainWindow() },
    { label: "Start Instant Meeting", click: () => sendToWindow(mainWindow, "app:start-instant-meeting") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  ]));
}

function setupProtocolHandling() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  const forwardProtocolUrl = (url) => {
    if (canUseWindow(mainWindow) && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("protocol:url", url);
    } else {
      pendingProtocolUrls.push(url);
    }
  };

  app.on("open-url", (event, url) => {
    event.preventDefault();
    forwardProtocolUrl(url);
  });

  const singleInstanceLock = app.requestSingleInstanceLock();
  if (!singleInstanceLock) {
    app.quit();
    return;
  }

  app.on("second-instance", (_event, commandLine) => {
    const protocolUrl = commandLine.find((value) => value.startsWith(`${APP_PROTOCOL}://`));
    if (protocolUrl) {
      forwardProtocolUrl(protocolUrl);
    }
    if (canUseWindow(mainWindow)) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      showWindow(mainWindow);
      focusWindow(mainWindow);
    }
  });

  const initialProtocolUrl = process.argv.find((value) => value.startsWith(`${APP_PROTOCOL}://`));
  if (initialProtocolUrl) {
    pendingProtocolUrls.push(initialProtocolUrl);
  }
}

function setupUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.on("update-downloaded", () => {
    if (Notification.isSupported()) {
      new Notification({
        title: "Onnonn update ready",
        body: "The latest update has been downloaded and will install on restart."
      }).show();
    }
  });

  const updateConfigPath = path.join(process.resourcesPath, "app-update.yml");
  if (!isDev && fs.existsSync(updateConfigPath)) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
}

function registerIpc() {
  ipcMain.handle("session:get", () => getSession());
  ipcMain.handle("session:set", (_event, payload) => {
    setSession(payload);
    return true;
  });
  ipcMain.handle("session:clear", () => {
    clearSession();
    return true;
  });
  ipcMain.handle("shell:openExternal", (_event, url) => shell.openExternal(url));
  ipcMain.handle("window:openMeeting", (_event, payload) => {
    createMeetingWindow(payload);
    return true;
  });
  ipcMain.handle("window:focusMain", () => {
    showWindow(mainWindow);
    focusWindow(mainWindow);
    return true;
  });
  ipcMain.handle("meeting:close", () => {
    if (canUseWindow(meetingWindow)) {
      meetingWindow.close();
    }
    showWindow(mainWindow);
    return true;
  });
  ipcMain.handle("notify:show", (_event, payload) => {
    if (Notification.isSupported()) {
      new Notification(payload).show();
    }
    return true;
  });
  ipcMain.handle("protocol:getPending", () => {
    const urls = [...pendingProtocolUrls];
    pendingProtocolUrls = [];
    return urls;
  });
  ipcMain.handle("screen-share:setSource", (_event, sourceId) => {
    preferredDisplaySourceId = sourceId || null;
    return true;
  });
  ipcMain.handle("screen-share:listSources", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 320, height: 180 }
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  });
}

function configureApiRequestHeaders() {
  const filter = { urls: [`${apiOrigin}/*`] };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        Origin: apiOrigin,
        Referer: `${apiOrigin}/`
      }
    });
  });
}

function configureDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 320, height: 180 }
      });
      const selectedSource = sources.find((source) => source.id === preferredDisplaySourceId) || sources[0];
      preferredDisplaySourceId = null;

      if (!selectedSource) {
        callback({ video: null, audio: false });
        return;
      }

      callback({ video: selectedSource, audio: false });
    } catch (error) {
      preferredDisplaySourceId = null;
      console.error("Failed to resolve display media source", error);
      callback({ video: null, audio: false });
    }
  }, {
    useSystemPicker: false
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(createAppMenu({ openMainWindow: () => showWindow(mainWindow) || createMainWindow() }));
  configureApiRequestHeaders();
  configureDisplayMediaHandler();
  registerIpc();
  createMainWindow();
  setupTray();
  setupProtocolHandling();
  setupUpdater();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
