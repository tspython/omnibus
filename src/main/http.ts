import { getSettings } from "./settings.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

// Builds the header bag used for every request to getcomics.info. The site
// routinely sits behind Cloudflare's interstitial, so we attach the user's
// cf_clearance / __cfduid cookies from settings — those must be captured via a
// browser visit and pasted into the Settings dialog.
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const settings = getSettings();
  const cookieParts: string[] = [];
  if (settings.cfduid) cookieParts.push(`__cfduid=${settings.cfduid}`);
  if (settings.cfClearance) cookieParts.push(`cf_clearance=${settings.cfClearance}`);

  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...(cookieParts.length > 0 ? { Cookie: cookieParts.join("; ") } : {}),
    ...extra,
  };
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: buildHeaders(), redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}
