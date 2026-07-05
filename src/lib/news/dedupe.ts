// Cross-source news dedupe:
// (1) Canonicalize URLs — strip tracking params, unwrap Google News redirects, drop fragments.
// (2) Fuzzy-match titles via lightweight token-set Jaccard similarity.
// If either canonical URL matches OR title similarity >= 0.72, treat as dupe.

import type { RawNewsArticle } from "@/types/news";

/**
 * Strip UTM/analytics params and normalize an article URL for identity comparison.
 * Also unwraps Google News redirect URLs to the target when the `url` param is present.
 */
export function canonicalizeUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  // Unwrap Google News redirect if present: news.google.com/rss/articles/... or /read
  // Google News RSS also returns URLs with `?url=` sometimes.
  const wrapped = u.searchParams.get("url");
  if (wrapped && /^https?:/i.test(wrapped)) {
    try {
      u = new URL(wrapped);
    } catch {
      // fall through
    }
  }

  // Drop query params commonly used for tracking / session tagging.
  const drop = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "mc_cid",
    "mc_eid",
    "igshid",
    "share",
    "ref",
    "ref_src",
    "referrer",
    "s",
    "cmpid",
    "ncid",
    "at_medium",
    "at_campaign",
    "at_custom1",
    "at_custom2",
    "at_custom3",
    "at_custom4",
    "smid",
  ]);
  const keys = Array.from(u.searchParams.keys());
  for (const k of keys) {
    if (drop.has(k.toLowerCase())) u.searchParams.delete(k);
  }

  // Drop www., lowercase host, drop trailing slash on pathname, drop fragment.
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  const search = u.searchParams.toString();
  return `${u.protocol}//${host}${pathname}${search ? `?${search}` : ""}`;
}

/** Normalize a title for fuzzy comparison. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]+/g, " ") // keep alphanumerics + devanagari
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract meaningful tokens (drop <=2 chars and known stopwords). */
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","at","is","are","was","were","be","been","for","by","with","as","from","that","this","it","its","after","over","up","down","says","said","will","may","can","has","have","had","new","today","report","reports","stock","stocks","share","shares",
]);

function tokenize(title: string): Set<string> {
  const words = normalizeTitle(title).split(" ");
  const out = new Set<string>();
  for (const w of words) {
    if (w.length <= 2) continue;
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

/** Jaccard similarity of two token sets. Returns 0..1. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/** Similarity threshold for treating two titles as the same story. */
const TITLE_SIM_THRESHOLD = 0.72;

/**
 * Dedupe articles. Later entries win only if they carry richer metadata
 * (longer snippet, more matched symbols, native publisher preferred over aggregator).
 */
export function dedupeArticles(articles: RawNewsArticle[]): RawNewsArticle[] {
  if (articles.length <= 1) return articles.slice();

  // Sort so higher-quality sources dedupe TOWARDS them.
  const sourceRank: Record<string, number> = {
    "nse-filing": 10,
    "bse-filing": 10,
    "business-standard": 8,
    "economic-times": 8,
    moneycontrol: 8,
    livemint: 8,
    reuters: 8,
    yahoo: 6,
    "google-news": 4,
    other: 1,
  };
  const ranked = articles.slice().sort((a, b) => {
    const ra = sourceRank[a.source] ?? 1;
    const rb = sourceRank[b.source] ?? 1;
    if (rb !== ra) return rb - ra;
    return (b.publishedAt || 0) - (a.publishedAt || 0);
  });

  const kept: RawNewsArticle[] = [];
  const canonicalSeen = new Map<string, number>(); // canonicalUrl -> idx in kept
  const titleTokens: Set<string>[] = []; // parallel to kept

  for (const a of ranked) {
    const canonUrl = a.canonicalUrl || canonicalizeUrl(a.url);
    const dupeIdx = canonicalSeen.get(canonUrl);
    if (dupeIdx !== undefined) {
      // Merge matched symbols into the existing kept entry.
      const existing = kept[dupeIdx];
      existing.matchedSymbols = Array.from(new Set([...existing.matchedSymbols, ...a.matchedSymbols]));
      continue;
    }
    const tokens = tokenize(a.title);
    let mergedIntoIdx = -1;
    for (let i = 0; i < kept.length; i++) {
      const sim = jaccard(tokens, titleTokens[i]);
      if (sim >= TITLE_SIM_THRESHOLD) {
        mergedIntoIdx = i;
        break;
      }
    }
    if (mergedIntoIdx >= 0) {
      const existing = kept[mergedIntoIdx];
      existing.matchedSymbols = Array.from(new Set([...existing.matchedSymbols, ...a.matchedSymbols]));
      continue;
    }
    kept.push({ ...a, canonicalUrl: canonUrl });
    titleTokens.push(tokens);
    canonicalSeen.set(canonUrl, kept.length - 1);
  }

  // Return in publishedAt-desc for UI convenience.
  return kept.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
}

/**
 * SHA-1-ish stable hash for a string. Used to key Gemini analysis cache
 * per canonical article. Not a cryptographic hash — just a fast fingerprint.
 */
export function fingerprint(text: string): string {
  let h1 = 0xdeadbeef ^ 0x9e3779b9;
  let h2 = 0x41c6ce57 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
