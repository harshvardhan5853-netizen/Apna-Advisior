// Build per-stock search queries from Holding[].
// Each stock generates 1..N queries; caller dedupes and fans out.

import type { Holding } from "@/types/portfolio";
import { lookupStock } from "@/lib/enrichment/nse-static";

export interface StockQuerySet {
  /** Stable key — uppercase symbol (or normalized name if no symbol). */
  key: string;
  /** Human-facing label — used in UI. */
  label: string;
  /** Every query string to run. First one is preferred/canonical. */
  queries: string[];
  /** All symbols/name variants that this article can be attributed to. */
  aliases: string[];
}

/** Strip trailing marketing suffixes and normalize casing. */
function cleanStockName(name: string): string {
  return name
    .replace(/\s*\((?:0|-)\)\s*$/g, "") // Groww's "Data Patterns (0)" noise
    .replace(/\b(ltd\.?|limited|corporation|corp\.?|company|inc\.?|plc)\b/gi, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape Google-News-safe search text (only strips characters that break URLs). */
function safeQuery(s: string): string {
  return s.replace(/["'\u201c\u201d\u2018\u2019]/g, "").trim();
}

/**
 * Given a Holding, produce up to 3 queries:
 *   1. "{Name} share price" - highest specificity for headlines
 *   2. "{Symbol} NSE"        - covers filing/technical coverage
 *   3. "{Name}"              - catch-all fallback
 * plus aliases used for attribution.
 */
export function buildStockQuerySet(h: Holding): StockQuerySet | null {
  const rawSymbol = (h.symbol || "").trim().toUpperCase();
  const rawName = cleanStockName(h.stockName || "");
  const lookup = lookupStock(rawSymbol, rawName);

  const canonicalSymbol = lookup?.symbol || (rawSymbol.length >= 2 ? rawSymbol : null);
  const canonicalName = lookup?.name || rawName || null;

  if (!canonicalSymbol && !canonicalName) return null;

  const aliases = new Set<string>();
  if (canonicalSymbol) aliases.add(canonicalSymbol);
  if (rawSymbol) aliases.add(rawSymbol);
  if (canonicalName) aliases.add(canonicalName);
  if (rawName) aliases.add(rawName);

  const queries: string[] = [];
  if (canonicalName) queries.push(safeQuery(`${canonicalName} share price`));
  if (canonicalSymbol) queries.push(safeQuery(`${canonicalSymbol} NSE`));
  if (canonicalName && queries.length < 3) queries.push(safeQuery(canonicalName));

  // Dedupe while preserving order.
  const seen = new Set<string>();
  const uniqueQueries = queries.filter((q) => {
    const k = q.toLowerCase();
    if (!q || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (uniqueQueries.length === 0) return null;

  const key = canonicalSymbol || (canonicalName ?? rawName).toUpperCase().slice(0, 24);
  const label = canonicalName ?? rawName ?? canonicalSymbol ?? key;

  return {
    key,
    label,
    queries: uniqueQueries,
    aliases: Array.from(aliases).filter(Boolean),
  };
}

/** Build a dedupe-safe set of query sets for the whole portfolio. */
export function buildPortfolioQuerySets(holdings: Holding[]): {
  sets: StockQuerySet[];
  unresolved: string[];
} {
  const sets: StockQuerySet[] = [];
  const seen = new Set<string>();
  const unresolved: string[] = [];

  for (const h of holdings) {
    const qs = buildStockQuerySet(h);
    if (!qs) {
      unresolved.push(h.stockName || h.symbol || h.id);
      continue;
    }
    if (seen.has(qs.key)) continue;
    seen.add(qs.key);
    sets.push(qs);
  }

  return { sets, unresolved };
}

/**
 * Given an article title/snippet and a list of query sets, return the aliases
 * of the sets that mentioned any recognizable form of the stock.
 * Used to attribute Google-News aggregated articles to portfolio stocks post-fetch.
 */
export function attributeArticleToStocks(
  title: string,
  snippet: string | null,
  sets: StockQuerySet[]
): string[] {
  const blob = `${title} ${snippet || ""}`.toLowerCase();
  const hits: string[] = [];
  for (const set of sets) {
    for (const alias of set.aliases) {
      if (alias.length < 2) continue;
      const needle = alias.toLowerCase();
      // Word-boundary-ish check to avoid "TCS" matching inside "match" etc.
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(needle)}([^a-z0-9]|$)`, "i");
      if (re.test(blob)) {
        hits.push(set.key);
        break;
      }
    }
  }
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
