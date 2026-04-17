export type Settings = {
  downloadLocation: string;
  logLocation: string;
  logEnabled: boolean;
  cfduid: string;
  cfClearance: string;
};

export type SearchResult = {
  postUrl: string;
  title: string;
  coverUrl: string;
  date: string;
  description: string;
};

export type SearchResponse = {
  results: SearchResult[];
  hasOlder: boolean;
  hasNewer: boolean;
  page: number;
};

export type DownloadStatus = "pending" | "downloading" | "complete" | "cancelled" | "error";

export type DownloadItem = {
  id: string;
  title: string;
  status: DownloadStatus;
  bytes: number;
  totalBytes: number;
  filePath: string;
  error?: string;
};

export type DownloadProgressEvent = {
  id: string;
  bytes: number;
  totalBytes: number;
};

export type DownloadStatusEvent = {
  id: string;
  status: DownloadStatus;
  filePath?: string;
  error?: string;
};
