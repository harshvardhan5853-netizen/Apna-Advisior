import type { Exchange, Holding } from "@/types/portfolio";
import {
  normalizeStockName,
  normalizeSymbol,
  parseNumberLoose,
  uid,
} from "../utils";

/**
 * Column-name synonyms produced by every major broker's CSV/Excel export.
 * These are matched case- and space-insensitively.
 */
const HEADER_SYNONYMS: Record<keyof HeaderMap, string[]> = {
  stockName: [
    "stock name",
    "stock",
    "instrument",
    "company",
    "company name",
    "security",
    "scrip",
    "scrip name",
    "name",
  ],
  symbol: [
    "symbol",
    "ticker",
    "trading symbol",
    "tradingsymbol",
    "nse symbol",
    "bse symbol",
    "isin",
  ],
  exchange: ["exchange", "exch", "segment"],
  quantity: [
    "qty",
    "quantity",
    "qty.",
    "holdings",
    "shares",
    "no. of shares",
    "no of shares",
  ],
  avgBuyPrice: [
    "avg price",
    "average price",
    "avg. price",
    "avg cost",
    "avg buy price",
    "average buy price",
    "buy avg",
    "buy price",
    "cost price",
  ],
  currentPrice: [
    "ltp",
    "last traded price",
    "current price",
    "cmp",
    "market price",
    "close",
    "closing price",
  ],
  investedAmount: [
    "invested",
    "invested amount",
    "investment",
    "cost value",
    "buy value",
    "amount invested",
  ],
  currentValue: [
    "current value",
    "market value",
    "cur. val",
    "cur value",
    "present value",
    "value",
  ],
  pnl: ["p&l", "pnl", "profit/loss", "gain/loss", "unrealized p&l", "net p&l"],
  pnlPercent: [
    "p&l %",
    "pnl %",
    "net chg.",
    "% change",
    "returns %",
    "return %",
    "chg %",
  ],
};

export interface HeaderMap {
  stockName: number;
  symbol: number;
  exchange: number;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Given a header row, return a HeaderMap of column indexes (-1 when absent). */
export function detectHeaderMap(headers: unknown[]): HeaderMap {
  const norm = headers.map(normalizeHeader);
  const idx = (syns: string[]): number => {
    for (let i = 0; i < norm.length; i++) {
      const h = norm[i];
      if (!h) continue;
      if (syns.some((s) => h === s || h.includes(s))) return i;
    }
    return -1;
  };
  return {
    stockName: idx(HEADER_SYNONYMS.stockName),
    symbol: idx(HEADER_SYNONYMS.symbol),
    exchange: idx(HEADER_SYNONYMS.exchange),
    quantity: idx(HEADER_SYNONYMS.quantity),
    avgBuyPrice: idx(HEADER_SYNONYMS.avgBuyPrice),
    currentPrice: idx(HEADER_SYNONYMS.currentPrice),
    investedAmount: idx(HEADER_SYNONYMS.investedAmount),
    currentValue: idx(HEADER_SYNONYMS.currentValue),
    pnl: idx(HEADER_SYNONYMS.pnl),
    pnlPercent: idx(HEADER_SYNONYMS.pnlPercent),
  };
}

function parseExchange(raw: unknown): Exchange {
  const s = String(raw ?? "")
    .toUpperCase()
    .trim();
  if (s.includes("NSE")) return "NSE";
  if (s.includes("BSE")) return "BSE";
  return "UNKNOWN";
}

/**
 * Convert a tabular row (array of cells) into a Holding using a detected map.
 * Missing numeric fields are back-filled from siblings (qty * avg, etc.).
 * Returns null if the row is unusable (no name AND no symbol AND no qty).
 */
export function rowToHolding(
  row: unknown[],
  map: HeaderMap,
  source: Holding["source"],
): Holding | null {
  const get = (i: number): unknown => (i >= 0 ? row[i] : undefined);

  const stockName = normalizeStockName(String(get(map.stockName) ?? ""));
  let symbol = normalizeSymbol(String(get(map.symbol) ?? ""));
  const exchange = parseExchange(get(map.exchange));

  const quantity = parseNumberLoose(get(map.quantity));
  const avgBuyPrice = parseNumberLoose(get(map.avgBuyPrice));
  const currentPrice = parseNumberLoose(get(map.currentPrice));
  let investedAmount = parseNumberLoose(get(map.investedAmount));
  let currentValue = parseNumberLoose(get(map.currentValue));
  let pnl = parseNumberLoose(get(map.pnl));
  let pnlPercent = parseNumberLoose(get(map.pnlPercent));

  if (!stockName && !symbol && !Number.isFinite(quantity)) return null;

  // If we have qty & avg but no invested, compute it. Same for current value.
  if (!Number.isFinite(investedAmount) && Number.isFinite(quantity) && Number.isFinite(avgBuyPrice)) {
    investedAmount = quantity * avgBuyPrice;
  }
  if (!Number.isFinite(currentValue) && Number.isFinite(quantity) && Number.isFinite(currentPrice)) {
    currentValue = quantity * currentPrice;
  }
  if (!Number.isFinite(pnl) && Number.isFinite(currentValue) && Number.isFinite(investedAmount)) {
    pnl = currentValue - investedAmount;
  }
  if (
    !Number.isFinite(pnlPercent) &&
    Number.isFinite(pnl) &&
    Number.isFinite(investedAmount) &&
    investedAmount > 0
  ) {
    pnlPercent = pnl / investedAmount;
  }

  // If we have a stock name but no symbol, take the first token as a best guess.
  if (!symbol && stockName) {
    symbol = normalizeSymbol(stockName.split(/\s+/)[0]);
  }

  // Confidence: high when every essential numeric was actually present.
  const essentials = [quantity, avgBuyPrice, currentPrice];
  const presentCount = essentials.filter((n) => Number.isFinite(n)).length;
  const confidence = presentCount === 3 ? 1 : presentCount === 2 ? 0.8 : 0.5;

  const holding: Holding = {
    id: uid("h"),
    stockName: stockName || symbol || "Unknown",
    symbol,
    exchange,
    quantity: safeNum(quantity),
    avgBuyPrice: safeNum(avgBuyPrice),
    currentPrice: safeNum(currentPrice),
    investedAmount: safeNum(investedAmount),
    currentValue: safeNum(currentValue),
    pnl: safeNum(pnl),
    pnlPercent: Number.isFinite(pnlPercent) ? pnlPercent : 0,
    confidence,
    needsReview: confidence < 0.8,
    source,
  };
  return holding;
}

function safeNum(n: number): number {
  return Number.isFinite(n) ? n : 0;
}
