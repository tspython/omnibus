import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import { IpcChannel } from "@shared/ipc.ts";
import type { CancelDownloadRequest, SearchRequest, StartDownloadRequest } from "@shared/ipc.ts";
import type { Settings } from "@shared/types.ts";
import { cancelDownload, startDownload } from "./downloader.ts";
import { searchComics } from "./scraper.ts";
import { getSettings, updateSettings } from "./settings.ts";

// Registers every IPC handler the preload bridge exposes. Called once on app
// ready — handlers own their own error surfacing via the shared status events,
// so this function just wires channels to functions.
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.Search, async (_e, req: SearchRequest) => {
    return searchComics(req.query, req.page);
  });

  ipcMain.handle(IpcChannel.StartDownload, async (_e, req: StartDownloadRequest) => {
    return startDownload(req.result);
  });

  ipcMain.handle(IpcChannel.CancelDownload, async (_e, req: CancelDownloadRequest) => {
    cancelDownload(req.id);
  });

  ipcMain.handle(IpcChannel.GetSettings, async () => {
    return getSettings();
  });

  ipcMain.handle(IpcChannel.UpdateSettings, async (_e, patch: Partial<Settings>) => {
    return updateSettings(patch);
  });

  ipcMain.handle(IpcChannel.PickFolder, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle(IpcChannel.OpenDownloadFolder, async () => {
    const { downloadLocation } = getSettings();
    await shell.openPath(downloadLocation);
  });

  ipcMain.handle(IpcChannel.OpenUrl, async (_e, url: string) => {
    await shell.openExternal(url);
  });
}
