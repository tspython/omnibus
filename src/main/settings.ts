import { app } from "electron";
import Store from "electron-store";
import { join } from "node:path";
import type { Settings } from "@shared/types.ts";

// Backed by ~/Library/Application Support/Omnibus/config.json on macOS via
// electron-store. First-run defaults point the download folder at the standard
// Downloads directory so the app is usable before the user opens Settings.
const store = new Store<Settings>({
  name: "config",
  defaults: {
    downloadLocation: "",
    logLocation: "",
    logEnabled: false,
    cfduid: "",
    cfClearance: "",
  },
});

function defaultDownloadDir(): string {
  return join(app.getPath("downloads"), "Omnibus");
}

function defaultLogDir(): string {
  return app.getPath("userData");
}

// Reads settings, filling in platform-appropriate defaults when the stored
// value is blank. Persisting the resolved default makes later reads stable.
export function getSettings(): Settings {
  const current = store.store;
  let downloadLocation = current.downloadLocation;
  let logLocation = current.logLocation;

  if (!downloadLocation) {
    downloadLocation = defaultDownloadDir();
    store.set("downloadLocation", downloadLocation);
  }
  if (!logLocation) {
    logLocation = defaultLogDir();
    store.set("logLocation", logLocation);
  }

  return { ...current, downloadLocation, logLocation };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  for (const [key, value] of Object.entries(patch) as [
    keyof Settings,
    Settings[keyof Settings],
  ][]) {
    store.set(key, value as never);
  }
  return getSettings();
}
