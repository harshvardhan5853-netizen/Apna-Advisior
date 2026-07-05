// Two-tier in-memory cache for the news pipeline.
//   RSS_CACHE:       key = query string; TTL 15 min.
//   ANALYSIS_CACHE:  key = article fingerprint; TTL ~forever (24h to allow model updates).
//
// Both are module-level Maps living inside the Next.js Node runtime — they
// persist across route hits within the same server process and reset on restart.
// This is the right level of durability for a local-only, single-user app.

import type { NewsAnalysis, RawNewsArticle } from "@/types/news";

interface Entry<T> {
  at: number;
  data: T;
}

const RSS_TTL_MS = 15 * 60 * 1000; // 15 min
const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const RSS_MAX_ENTRIES = 500;
const ANALYSIS_MAX_ENTRIES = 5000;

const RSS_CACHE = new Map<string, Entry<RawNewsArticle[]>>();
const ANALYSIS_CACHE = new Map<string, Entry<NewsAnalysis | { error: string }>>();

function bump<T>(cache: Map<string, Entry<T>>, key: string, entry: Entry<T>, cap: number) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > cap) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function getCachedRss(query: string): RawNewsArticle[] | null {
  const key = query.trim().toLowerCase();
  const entry = RSS_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > RSS_TTL_MS) {
    RSS_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedRss(query: string, data: RawNewsArticle[]): void {
  const key = query.trim().toLowerCase();
  bump(RSS_CACHE, key, { at: Date.now(), data }, RSS_MAX_ENTRIES);
}

export interface CachedAnalysis {
  analysis: NewsAnalysis | null;
  error: string | null;
}

export function getCachedAnalysis(fingerprint: string): CachedAnalysis | null {
  const entry = ANALYSIS_CACHE.get(fingerprint);
  if (!entry) return null;
  if (Date.now() - entry.at > ANALYSIS_TTL_MS) {
    ANALYSIS_CACHE.delete(fingerprint);
    return null;
  }
  const d = entry.data;
  if ("error" in d) return { analysis: null, error: d.error };
  return { analysis: d, error: null };
}

export function setCachedAnalysis(fingerprint: string, analysis: NewsAnalysis): void {
  bump(ANALYSIS_CACHE, fingerprint, { at: Date.now(), data: analysis }, ANALYSIS_MAX_ENTRIES);
}

export function setCachedAnalysisError(fingerprint: string, error: string): void {
  bump(ANALYSIS_CACHE, fingerprint, { at: Date.now(), data: { error } }, ANALYSIS_MAX_ENTRIES);
}

export function inspectCacheStats() {
  return {
    rssEntries: RSS_CACHE.size,
    analysisEntries: ANALYSIS_CACHE.size,
    rssTtlMs: RSS_TTL_MS,
    analysisTtlMs: ANALYSIS_TTL_MS,
  };
}
