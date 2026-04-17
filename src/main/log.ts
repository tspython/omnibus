import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getSettings } from "./settings.ts";

// Appends a timestamped line to log.txt inside the user's configured log
// directory, mirroring the Windows app's LogWriter. Silent no-op when logging
// is disabled in settings, and swallows filesystem errors so logging never
// crashes a user-visible action.
export async function logLine(line: string): Promise<void> {
  const settings = getSettings();
  if (!settings.logEnabled) return;

  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const stamp =
    `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear().toString().slice(-2)} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const logPath = join(settings.logLocation, "log.txt");
  try {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `(${stamp}) - ${line}\n`, "utf8");
  } catch {
    // intentionally suppressed — logging must never surface as a user-facing failure
  }
}
