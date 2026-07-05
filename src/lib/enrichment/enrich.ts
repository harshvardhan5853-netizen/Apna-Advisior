import type { Holding } from "@/types/portfolio";
import { lookupStock } from "./nse-static";

export function enrichHolding(h: Holding): Holding {
  const meta = lookupStock(h.symbol, h.stockName);
  const enriched: Holding = { ...h };
  if (h.importedAt === undefined) enriched.importedAt = Date.now();
  if (h.transactionsImported === undefined) enriched.transactionsImported = 1;
  if (meta) {
    if (!enriched.sector) enriched.sector = meta.sector;
    if (!enriched.industry) enriched.industry = meta.industry;
    if (!enriched.marketCap) enriched.marketCap = meta.marketCap;
    if (!enriched.symbol || enriched.symbol.length < 2) enriched.symbol = meta.symbol;
  } else {
    if (enriched.sector === undefined) enriched.sector = null;
    if (enriched.industry === undefined) enriched.industry = null;
    if (enriched.marketCap === undefined) enriched.marketCap = "Unknown";
  }
  return enriched;
}

export function enrichHoldings(hs: Holding[]): Holding[] {
  return hs.map(enrichHolding);
}
