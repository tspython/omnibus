import { BrowserWindow } from "electron";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { buildHeaders } from "./http.ts";
import { logLine } from "./log.ts";
import { resolveDownloadLink } from "./scraper.ts";
import { getSettings } from "./settings.ts";
import { IpcChannel } from "@shared/ipc.ts";
import type { DownloadStatus, SearchResult } from "@shared/types.ts";

// One entry per queued/active download. The AbortController drives cancellation
// from any renderer-side cancel command through to fetch + pipeline teardown.
type Job = {
  id: string;
  title: string;
  filePath: string;
  controller: AbortController;
};

const jobs = new Map<string, Job>();

function sanitizeFilename(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function emitStatus(
  id: string,
  status: DownloadStatus,
  extra?: { filePath?: string; error?: string },
): void {
  broadcast(IpcChannel.DownloadStatus, { id, status, ...extra });
}

function emitProgress(id: string, bytes: number, totalBytes: number): void {
  broadcast(IpcChannel.DownloadProgress, { id, bytes, totalBytes });
}

// Resolves the .cbr destination path, guaranteeing the target directory
// exists. Collisions append -1, -2, … so we never silently overwrite.
async function allocateFilePath(title: string): Promise<string> {
  const settings = getSettings();
  await mkdir(settings.downloadLocation, { recursive: true });

  const base = sanitizeFilename(title);
  const first = join(settings.downloadLocation, `${base}.cbr`);
  if (!(await fileExists(first))) return first;

  let i = 1;
  while (true) {
    const candidate = join(settings.downloadLocation, `${base}-${i}.cbr`);
    if (!(await fileExists(candidate))) return candidate;
    i++;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Kicks off an async download and returns its id immediately so the UI can
// render a row. Errors after this point flow through IPC status events, not
// thrown exceptions, so the renderer stays in charge of how to surface them.
export async function startDownload(result: SearchResult): Promise<{ id: string }> {
  const id = randomUUID();
  const controller = new AbortController();

  const downloadUrl = await resolveDownloadLink(result.postUrl);
  if (!downloadUrl) {
    emitStatus(id, "error", { error: "No Download Now link found on post page." });
    return { id };
  }

  const filePath = await allocateFilePath(result.title);
  const job: Job = { id, title: result.title, filePath, controller };
  jobs.set(id, job);

  emitStatus(id, "pending", { filePath });
  void logLine(`Downloading new comic: ${filePath}`);

  void runDownload(job, downloadUrl);
  return { id };
}

async function runDownload(job: Job, url: string): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: job.controller.signal,
      redirect: "follow",
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const totalHeader = res.headers.get("content-length");
    const total = totalHeader ? Number.parseInt(totalHeader, 10) : 0;
    let received = 0;

    emitStatus(job.id, "downloading");

    const fileStream = createWriteStream(job.filePath);
    const bodyStream = Readable.fromWeb(res.body);

    bodyStream.on("data", (chunk: Buffer) => {
      received += chunk.length;
      emitProgress(job.id, received, total);
    });

    await pipeline(bodyStream, fileStream, { signal: job.controller.signal });

    emitProgress(job.id, received, total || received);
    emitStatus(job.id, "complete", { filePath: job.filePath });
  } catch (err) {
    const aborted =
      job.controller.signal.aborted ||
      (err instanceof Error && (err.name === "AbortError" || err.name === "ResponseAborted"));

    if (aborted) {
      await rm(job.filePath, { force: true });
      emitStatus(job.id, "cancelled");
      void logLine(`Download cancelled: ${job.filePath}`);
    } else {
      await rm(job.filePath, { force: true });
      const message = err instanceof Error ? err.message : String(err);
      emitStatus(job.id, "error", { error: message });
      void logLine(`Download failed: ${job.filePath} — ${message}`);
    }
  } finally {
    jobs.delete(job.id);
  }
}

export function cancelDownload(id: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.controller.abort();
}
