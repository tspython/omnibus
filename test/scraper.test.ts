import { describe, expect, test } from "bun:test";
import {
  buildSearchUrl,
  decodeTitle,
  findDownloadLink,
  parseListing,
} from "../src/main/scraper-parse.ts";

describe("scraper helpers", () => {
  test("decodeTitle replaces common GetComics HTML entities", () => {
    expect(decodeTitle("Batman &#8211; #1")).toBe("Batman – #1");
    expect(decodeTitle("What&#8217;s up")).toBe("What's up");
    expect(decodeTitle("Bob &#038; Alice")).toBe("Bob & Alice");
  });

  test("buildSearchUrl routes blank queries to the homepage", () => {
    // Blank query must hit the homepage/paginated home, not /?s= — that route
    // returns a WordPress zero-results page and is why the UI showed empty.
    expect(buildSearchUrl("", 1)).toBe("https://getcomics.info/");
    expect(buildSearchUrl("   ", 1)).toBe("https://getcomics.info/");
    expect(buildSearchUrl("", 3)).toBe("https://getcomics.info/page/3/");
  });

  test("buildSearchUrl encodes real queries and clamps the page", () => {
    expect(buildSearchUrl("batman begins", 1)).toBe(
      "https://getcomics.info/page/1/?s=batman%20begins",
    );
    expect(buildSearchUrl("x", 0)).toBe("https://getcomics.info/page/1/?s=x");
    expect(buildSearchUrl("x", -5)).toBe("https://getcomics.info/page/1/?s=x");
  });

  test("parseListing extracts articles with title, cover, date, excerpt", () => {
    const html = `
      <article id="post-1">
        <div class="post-header-image">
          <a href="https://getcomics.info/foo">
            <img src="https://img/x.jpg" alt="Foo Comic (2026)" />
          </a>
        </div>
        <div class="post-info">
          <h1 class="post-title"><a href="https://getcomics.info/foo">Foo &#8211; Comic (2026)</a></h1>
          <p class="post-excerpt">Short description.</p>
          <ul class="post-meta">
            <li class="post-meta-date">
              <a href="https://getcomics.info/foo"><time datetime="2026-04-15">2 days ago</time></a>
            </li>
          </ul>
        </div>
      </article>
      <div class="pagination-older"><a href="#">Older</a></div>
    `;
    const out = parseListing(html);
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toEqual({
      postUrl: "https://getcomics.info/foo",
      title: "Foo – Comic (2026)",
      coverUrl: "https://img/x.jpg",
      date: "2026-04-15",
      description: "Short description.",
    });
    expect(out.hasOlder).toBe(true);
    expect(out.hasNewer).toBe(false);
  });

  test("parseListing skips articles missing header or info", () => {
    const html = `
      <article><div class="post-header-image"><a href="/x"><img src="/i.jpg"/></a></div></article>
      <article><div class="post-info"><h1 class="post-title"><a href="/y">Y</a></h1></div></article>
    `;
    expect(parseListing(html).results).toHaveLength(0);
  });

  test("findDownloadLink prefers title attribute, falls back to text", () => {
    expect(findDownloadLink('<a title="Download Now" href="https://x/file.cbr">click</a>')).toBe(
      "https://x/file.cbr",
    );
    expect(findDownloadLink('<a title="DOWNLOAD NOW" href="https://x/FILE.cbr">click</a>')).toBe(
      "https://x/FILE.cbr",
    );
    expect(findDownloadLink('<a href="https://x/text.cbr">Download Now</a>')).toBe(
      "https://x/text.cbr",
    );
    expect(findDownloadLink("<p>nothing here</p>")).toBeNull();
  });
});
