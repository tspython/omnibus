import { fetchHtml } from "./http.ts";
import { buildSearchUrl, findDownloadLink, parseListing } from "./scraper-parse.ts";
import type { SearchResponse } from "@shared/types.ts";

export async function searchComics(query: string, page: number): Promise<SearchResponse> {
  const html = await fetchHtml(buildSearchUrl(query, page));
  const parsed = parseListing(html);
  return { ...parsed, page };
}

export async function resolveDownloadLink(postUrl: string): Promise<string | null> {
  const html = await fetchHtml(postUrl);
  return findDownloadLink(html);
}
