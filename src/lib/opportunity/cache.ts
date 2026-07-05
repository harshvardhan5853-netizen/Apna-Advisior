import { getDB, type CachedOpportunity } from "@/lib/db";
import type { OpportunityAnalysis } from "@/types/opportunity";

/**
 * 24 hour TTL for cached opportunity analyses. Screener + Yahoo fundamentals
 * do not move fast enough to justify a shorter window, and cold-fetching the
 * ~180 stock universe is expensive.
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Read a cached analysis for `symbol`. Returns null when missing or stale. */
export async function getCachedAnalysis(
  symbol: string,
): Promise<OpportunityAnalysis | null> {
  const id = symbol.toUpperCase();
  const row = await getDB().opportunityCache.get(id);
  if (!row) return null;
  if (Date.now() - row.fetchedAt > CACHE_TTL_MS) return null;
  return row.analysis;
}

/** Upsert an analysis. Row id is uppercased symbol so lookups are canonical. */
export async function setCachedAnalysis(
  analysis: OpportunityAnalysis,
): Promise<void> {
  const id = analysis.symbol.toUpperCase();
  const row: CachedOpportunity = {
    id,
    symbol: analysis.symbol,
    fetchedAt: Date.now(),
    analysis,
  };
  await getDB().opportunityCache.put(row);
}

/** Delete every row whose fetchedAt is older than the TTL. Returns count. */
export async function pruneExpiredAnalyses(): Promise<number> {
  const cutoff = Date.now() - CACHE_TTL_MS;
  const stale = await getDB()
    .opportunityCache.where("fetchedAt")
    .below(cutoff)
    .toArray();
  const ids = stale.map((r) => r.id);
  if (ids.length > 0) {
    await getDB().opportunityCache.bulkDelete(ids);
  }
  return ids.length;
}

/** Nuke the entire cache. Used when the user resets the opportunity view. */
export async function clearAnalysisCache(): Promise<void> {
  await getDB().opportunityCache.clear();
}
