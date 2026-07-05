import Parser from "rss-parser";
import type { RawNewsArticle, NewsSource } from "@/types/news";
import { canonicalizeUrl } from "./dedupe";
import { fingerprint } from "./dedupe";
import { getCachedRss, setCachedRss } from "./cache";

// -----------------------------------------------------------------------------
// Google News RSS fetcher
// -----------------------------------------------------------------------------
//   URL shape: https://news.google.com/rss/search?q=<QUERY>&hl=en-IN&gl=IN&ceid=IN:en
// - Google News aggregates 100s of Indian financial publishers (ET, BS, MC, Mint,
//   Reuters India, LiveMint, NDTV Profit, CNBC-TV18 …) into a single feed.
// - No auth, no rate limit surfaced. Cache 15 minutes to be polite.
// -----------------------------------------------------------------------------

const GOOGLE_NEWS_BASE = "https://news.google.com/rss/search";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_ITEMS_PER_QUERY = 12;

interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
  source?: { $?: { url?: string }; _?: string } | string;
}

const parser = new Parser<Record<string, unknown>, GoogleNewsItem>({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent": UA,
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    "Accept-Language": "en-IN,en;q=0.9",
  },
  customFields: {
    item: [["source", "source", { keepArray: false }]],
  },
});

export interface RssFetchOptions {
  matchedSymbols?: string[]; // pre-populate before dedupe step re-attributes
  bypassCache?: boolean;
}

function buildGoogleNewsUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "en-IN",
    gl: "IN",
    ceid: "IN:en",
  });
  return `${GOOGLE_NEWS_BASE}?${params.toString()}`;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPublisher(item: GoogleNewsItem): string | null {
  const src = item.source;
  if (!src) return null;
  if (typeof src === "string") return src.trim() || null;
  if (typeof src === "object") {
    if (typeof src._ === "string" && src._.trim()) return src._.trim();
    if (src.$?.url) {
      try {
        const host = new URL(src.$.url).hostname.replace(/^www\./, "");
        return host || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function inferSourceFromPublisher(publisher: string | null): NewsSource {
  if (!publisher) return "google-news";
  const p = publisher.toLowerCase();
  if (p.includes("business standard")) return "business-standard";
  if (p.includes("economictimes") || p.includes("economic times")) return "economic-times";
  if (p.includes("moneycontrol")) return "moneycontrol";
  if (p.includes("livemint") || p.includes("mint")) return "livemint";
  if (p.includes("reuters")) return "reuters";
  if (p.includes("yahoo")) return "yahoo";
  return "google-news";
}

function parsePubDate(item: GoogleNewsItem): number {
  const source = item.isoDate ?? item.pubDate;
  if (!source) return Date.now();
  const parsed = Date.parse(source);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeItem(item: GoogleNewsItem, matchedSymbols: string[]): RawNewsArticle | null {
  const title = item.title?.trim();
  const rawLink = item.link?.trim();
  if (!title || !rawLink) return null;

  const canonicalUrl = canonicalizeUrl(rawLink);
  const publisher = extractPublisher(item);
  const source = inferSourceFromPublisher(publisher);
  const snippetRaw = item.contentSnippet ?? item.content ?? null;
  const snippet = snippetRaw ? stripHtml(snippetRaw) || null : null;

  return {
    id: fingerprint(canonicalUrl),
    url: rawLink,
    canonicalUrl,
    title: stripHtml(title),
    snippet,
    publisher,
    source,
    publishedAt: parsePubDate(item),
    matchedSymbols: [...matchedSymbols],
  };
}

/**
 * Fetch a single Google News RSS query and return normalized RawNewsArticle[].
 * Cached for 15 minutes.
 */
export async function fetchGoogleNewsQuery(
  query: string,
  options: RssFetchOptions = {},
): Promise<RawNewsArticle[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = trimmed.toLowerCase();
  if (!options.bypassCache) {
    const cached = getCachedRss(cacheKey);
    if (cached) {
      // Re-attribute matched symbols since cache is shared across queries.
      if (options.matchedSymbols?.length) {
        return cached.map((article) => ({
          ...article,
          matchedSymbols: mergeSymbols(article.matchedSymbols, options.matchedSymbols!),
        }));
      }
      return cached;
    }
  }

  const url = buildGoogleNewsUrl(trimmed);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`google-news responded ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);
    const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_QUERY);

    const articles: RawNewsArticle[] = [];
    for (const item of items) {
      const normalized = normalizeItem(item, options.matchedSymbols ?? []);
      if (normalized) articles.push(normalized);
    }

    setCachedRss(cacheKey, articles);
    return articles;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`google-news timed out for "${trimmed}"`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function mergeSymbols(a: string[], b: string[]): string[] {
  const set = new Set<string>();
  for (const s of a) set.add(s.toUpperCase());
  for (const s of b) set.add(s.toUpperCase());
  return Array.from(set);
}

/**
 * Fetch multiple queries in parallel, tagging each article with the symbol keys
 * whose queries produced it. Failures are captured as warnings, not thrown.
 */
export async function fetchQueriesInParallel(
  queries: Array<{ symbolKey: string; query: string }>,
  concurrency = 4,
): Promise<{ articles: RawNewsArticle[]; warnings: string[] }> {
  const warnings: string[] = [];
  const collected = new Map<string, RawNewsArticle>();

  // simple pool: process in batches of `concurrency`
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((entry) =>
        fetchGoogleNewsQuery(entry.query, { matchedSymbols: [entry.symbolKey] }),
      ),
    );

    results.forEach((result, idx) => {
      const entry = batch[idx];
      if (result.status === "rejected") {
        warnings.push(
          `Failed news lookup for ${entry.symbolKey} ("${entry.query}"): ${result.reason?.message ?? result.reason}`,
        );
        return;
      }
      for (const article of result.value) {
        const existing = collected.get(article.canonicalUrl);
        if (!existing) {
          collected.set(article.canonicalUrl, article);
        } else {
          existing.matchedSymbols = mergeSymbols(existing.matchedSymbols, article.matchedSymbols);
        }
      }
    });
  }

  return { articles: Array.from(collected.values()), warnings };
}
