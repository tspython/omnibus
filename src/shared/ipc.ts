import type {
  DownloadProgressEvent,
  DownloadStatusEvent,
  SearchResponse,
  SearchResult,
  Settings,
} from "./types.ts";

export const IpcChannel = {
  Search: "search",
  StartDownload: "download:start",
  CancelDownload: "download:cancel",
  GetSettings: "settings:get",
  UpdateSettings: "settings:update",
  PickFolder: "settings:pickFolder",
  OpenDownloadFolder: "shell:openDownloadFolder",
  OpenUrl: "shell:openUrl",
  DownloadProgress: "download:progress",
  DownloadStatus: "download:status",
} as const;

export type SearchRequest = { query: string; page: number };
export type StartDownloadRequest = { result: SearchResult };
export type CancelDownloadRequest = { id: string };

// Shape exposed on window.api via the preload bridge. One method per IPC channel,
// plus subscribe helpers for the push-style progress/status events.
export type OmnibusApi = {
  search(req: SearchRequest): Promise<SearchResponse>;
  startDownload(req: StartDownloadRequest): Promise<{ id: string }>;
  cancelDownload(req: CancelDownloadRequest): Promise<void>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  pickFolder(): Promise<string | null>;
  openDownloadFolder(): Promise<void>;
  openUrl(url: string): Promise<void>;
  onDownloadProgress(listener: (event: DownloadProgressEvent) => void): () => void;
  onDownloadStatus(listener: (event: DownloadStatusEvent) => void): () => void;
};

declare global {
  interface Window {
    api: OmnibusApi;
  }
}
