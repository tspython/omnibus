import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { IpcChannel } from "@shared/ipc.ts";
import type {
  CancelDownloadRequest,
  OmnibusApi,
  SearchRequest,
  StartDownloadRequest,
} from "@shared/ipc.ts";
import type { DownloadProgressEvent, DownloadStatusEvent, Settings } from "@shared/types.ts";

// Wraps ipcRenderer.on with a disposer. Renderer components get a clean
// unsubscribe function to call from their effect cleanups instead of having
// to remember channel names.
function subscribe<T>(channel: string, listener: (event: T) => void): () => void {
  const wrapped = (_e: IpcRendererEvent, payload: T): void => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.off(channel, wrapped);
  };
}

const api: OmnibusApi = {
  search: (req: SearchRequest) => ipcRenderer.invoke(IpcChannel.Search, req),
  startDownload: (req: StartDownloadRequest) => ipcRenderer.invoke(IpcChannel.StartDownload, req),
  cancelDownload: (req: CancelDownloadRequest) =>
    ipcRenderer.invoke(IpcChannel.CancelDownload, req),
  getSettings: () => ipcRenderer.invoke(IpcChannel.GetSettings),
  updateSettings: (patch: Partial<Settings>) =>
    ipcRenderer.invoke(IpcChannel.UpdateSettings, patch),
  pickFolder: () => ipcRenderer.invoke(IpcChannel.PickFolder),
  openDownloadFolder: () => ipcRenderer.invoke(IpcChannel.OpenDownloadFolder),
  openUrl: (url: string) => ipcRenderer.invoke(IpcChannel.OpenUrl, url),
  onDownloadProgress: (listener: (event: DownloadProgressEvent) => void) =>
    subscribe<DownloadProgressEvent>(IpcChannel.DownloadProgress, listener),
  onDownloadStatus: (listener: (event: DownloadStatusEvent) => void) =>
    subscribe<DownloadStatusEvent>(IpcChannel.DownloadStatus, listener),
};

contextBridge.exposeInMainWorld("api", api);
