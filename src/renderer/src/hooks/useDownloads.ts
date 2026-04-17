import { useCallback, useEffect, useRef, useState } from "react";
import type { DownloadItem, SearchResult } from "@shared/types.ts";

// Tracks the local mirror of the download queue. The main process is the
// source of truth for state transitions and byte counts; this hook stitches
// progress + status events onto an optimistic row keyed by id.
export function useDownloads(): {
  downloads: DownloadItem[];
  enqueue: (result: SearchResult) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  clearCompleted: () => void;
} {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const byId = useRef(new Map<string, number>());

  // Rebuilds the index whenever downloads change. Kept outside the component
  // render path so lookups stay O(1) even as the queue grows.
  useEffect(() => {
    const next = new Map<string, number>();
    for (let i = 0; i < downloads.length; i++) {
      const item = downloads[i];
      if (item) next.set(item.id, i);
    }
    byId.current = next;
  }, [downloads]);

  useEffect(() => {
    const offProgress = window.api.onDownloadProgress(({ id, bytes, totalBytes }) => {
      setDownloads((prev) => {
        const idx = byId.current.get(id);
        if (idx === undefined) return prev;
        const existing = prev[idx];
        if (!existing) return prev;
        const copy = prev.slice();
        copy[idx] = { ...existing, bytes, totalBytes };
        return copy;
      });
    });

    const offStatus = window.api.onDownloadStatus(({ id, status, filePath, error }) => {
      setDownloads((prev) => {
        const idx = byId.current.get(id);
        if (idx === undefined) return prev;
        const existing = prev[idx];
        if (!existing) return prev;
        const copy = prev.slice();
        copy[idx] = {
          ...existing,
          status,
          filePath: filePath ?? existing.filePath,
          ...(error !== undefined ? { error } : {}),
        };
        return copy;
      });
    });

    return () => {
      offProgress();
      offStatus();
    };
  }, []);

  const enqueue = useCallback(async (result: SearchResult) => {
    const { id } = await window.api.startDownload({ result });
    setDownloads((prev) => [
      ...prev,
      {
        id,
        title: result.title,
        status: "pending",
        bytes: 0,
        totalBytes: 0,
        filePath: "",
      },
    ]);
  }, []);

  const cancel = useCallback(async (id: string) => {
    await window.api.cancelDownload({ id });
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) =>
      prev.filter(
        (d) => d.status !== "complete" && d.status !== "cancelled" && d.status !== "error",
      ),
    );
  }, []);

  return { downloads, enqueue, cancel, clearCompleted };
}
