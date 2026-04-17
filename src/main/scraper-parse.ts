import * as cheerio from "cheerio";
import type { SearchResponse, SearchResult } from "@shared/types.ts";

const BASE = "https://getcomics.info";

// Replicates the Windows app's replaceASCII: GetComics renders a handful of
// common HTML entities in titles that we want displayed as real glyphs.
const ENTITY_MAP: ReadonlyArray<readonly [string, string]> = [
  ["&#8211;", "–"],
  ["&#8217;", "'"],
  ["&#038;", "&"],
  ["&amp;", "&"],
  ["&#8220;", "\u201C"],
  ["&#8221;", "\u201D"],
];

export function decodeTitle(input: string): string {
  let out = input;
  for (const [from, to] of ENTITY_MAP) out = out.split(from).join(to);
  return out.trim();
}

// GetComics only renders listings on the homepage (and /page/N/ for browsing)
// or on /page/N/?s=QUERY for real searches. Hitting /page/1/?s= with a blank
// query returns a WordPress search page with zero results, which is why the
// naive "one URL fits all" shape used in the original Windows app stopped
// working after the site's redesign.
export function buildSearchUrl(query: string, page: number): string {
  const safePage = Math.max(1, Math.floor(page));
  const trimmed = (query ?? "").trim();

  if (!trimmed) {
    return safePage === 1 ? `${BASE}/` : `${BASE}/page/${safePage}/`;
  }
  return `${BASE}/page/${safePage}/?s=${encodeURIComponent(trimmed)}`;
}

// Parses a GetComics listing page. Each post is an <article> containing a
// .post-header-image block (cover + link) and a .post-info block with title,
// category, excerpt, and meta. We walk articles instead of zipping classes by
// index because ads and sidebar widgets can sneak in otherwise.
export function parseListing(
  html: string,
): Pick<SearchResponse, "results" | "hasOlder" | "hasNewer"> {
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  $("article").each((_, el) => {
    const $article = $(el);
    const $header = $article.find(".post-header-image").first();
    const $info = $article.find(".post-info").first();
    if ($header.length === 0 || $info.length === 0) return;

    const img = $header.find("img").first();
    const titleAnchor = $info.find(".post-title a").first();

    const postUrl = titleAnchor.attr("href") ?? $header.find("a").first().attr("href") ?? "";
    const title = decodeTitle(titleAnchor.text() || img.attr("alt") || "");
    const coverUrl = img.attr("data-src") ?? img.attr("src") ?? "";

    const $time = $info.find("time").first();
    const dateText = $time.attr("datetime") || $time.text().trim();

    const excerptHtml = $info.find(".post-excerpt").first();
    const description = decodeTitle(excerptHtml.text().replace(/\s+/g, " ").trim());

    if (!postUrl || !title) return;
    results.push({ postUrl, title, coverUrl, date: dateText, description });
  });

  const hasOlder = $(".pagination-older").length > 0;
  const hasNewer = $(".pagination-newer").length > 0;
  return { results, hasOlder, hasNewer };
}

// Fetches a comic's post page and returns the direct file URL behind the
// 'Download Now' anchor. GetComics uses a few title-case variants and
// occasionally an empty title, so we check both plus a text fallback.
export function findDownloadLink(html: string): string | null {
  const $ = cheerio.load(html);
  const titleMatchers = ["Download Now", "DOWNLOAD NOW"];
  for (const title of titleMatchers) {
    const href = $(`a[title="${title}"]`).first().attr("href");
    if (href) return href;
  }

  let fallback: string | null = null;
  $("a").each((_, el) => {
    if (fallback) return;
    if ($(el).text().trim().toLowerCase() === "download now") {
      const href = $(el).attr("href");
      if (href) fallback = href;
    }
  });
  return fallback;
}
