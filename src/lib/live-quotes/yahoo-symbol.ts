import type { Holding } from "@/types/portfolio";
import { lookupStock } from "@/lib/enrichment/nse-static";

/**
 * Resolve a holding to a canonical Yahoo Finance NSE symbol like "RELIANCE.NS".
 *
 * Priority:
 *   1. holding.symbol if present + at least 2 chars + looks like a real ticker
 *   2. nse-static lookupStock() (symbol OR name alias) — returns clean NSE symbol
 *   3. null if nothing matches (holding is unresolvable — skip in the live view)
 */
export function resolveYahooSymbol(holding: Pick<Holding, "symbol" | "stockName" | "exchange">): string | null {
  const bare = resolveBareSymbol(holding);
  if (!bare) return null;
  // BSE holdings still trade on NSE for the same company in most cases; Yahoo `.NS` covers 99% of retail.
  // If the user's exchange is explicitly BSE and the stock is BSE-only, we'd want `.BO`. Keep it simple: prefer .NS.
  return `${bare}.NS`;
}

/** Just the bare NSE ticker (no suffix). Returns null if unresolvable. */
export function resolveBareSymbol(holding: Pick<Holding, "symbol" | "stockName">): string | null {
  // Tier 1: reuse the static NSE lookup — it already handles aliases + name matching.
  const meta = lookupStock(holding.symbol, holding.stockName);
  if (meta?.symbol) return meta.symbol.toUpperCase();
  // Tier 2: if user has a clean symbol we didn't recognize in the static list, still try it.
  const raw = (holding.symbol ?? "").trim().toUpperCase();
  if (raw.length >= 2 && /^[A-Z0-9&-]+$/.test(raw)) return raw;
  return null;
}

/** Turn "RELIANCE.NS" -> "RELIANCE" (strip Yahoo suffix). */
export function bareFromYahoo(yahooSymbol: string): string {
  const idx = yahooSymbol.indexOf(".");
  return idx === -1 ? yahooSymbol : yahooSymbol.slice(0, idx);
}

/** Build the map of `holding.id -> yahoo symbol` for a list of holdings. */
export function buildYahooSymbolMap(
  holdings: Array<Pick<Holding, "id" | "symbol" | "stockName" | "exchange">>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of holdings) {
    const sym = resolveYahooSymbol(h);
    if (sym) out[h.id] = sym;
  }
  return out;
}
