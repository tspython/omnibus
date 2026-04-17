import { BrowserWindow, app, shell } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc.ts";

// electron-vite injects a module-scoped __dirname for us; we just join from it.
// Main bundle lands in out/main, preload in out/preload — hop up one level.
const preloadPath = join(__dirname, "../preload/index.js");

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: "Omnibus",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0b0b0f",
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  // Outgoing target=_blank / window.open calls open in the user's default browser
  // rather than a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
