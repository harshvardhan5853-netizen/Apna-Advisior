/**
 * Live quote types for the portfolio Live tab (Snapshot/Live toggle).
 * All prices are in INR. Missing values are `null` (not 0) so charts + math can distinguish
 * "unknown" from "zero".
 */

export type MarketStatus = "open" | "pre-open" | "post-close" | "closed";

/** Normalized quote returned by /api/quotes for one symbol. */
export interface LiveQuote {
  /** Yahoo symbol, e.g. "RELIANCE.NS" */
  yahooSymbol: string;
  /** Bare NSE symbol we use to key the map, e.g. "RELIANCE" */
  symbol: string;
  /** Human name from Yahoo (shortName/longName) — used for tooltips */
  displayName: string | null;
  /** Live/last traded price */
  price: number | null;
  /** Today's opening price */
  open: number | null;
  /** Yesterday's close */
  previousClose: number | null;
  /** Absolute day change (price - previousClose) */
  dayChange: number | null;
  /** Fractional day change (0.0234 = +2.34%) */
  dayChangePercent: number | null;
  /** Currency code (e.g. INR) */
  currency: string | null;
  /** Yahoo marketState string upstream */
  marketState: string | null;
  /** Unix seconds when Yahoo last updated this quote */
  quoteTime: number | null;
}

/** Map keyed by bare NSE symbol -> LiveQuote */
export type QuoteMap = Record<string, LiveQuote>;

export interface QuotesResponse {
  quotes: LiveQuote[];
  marketState: MarketStatus;
  fetchedAt: number;
  /** Symbols we requested but Yahoo didn't return (unknown/wrong ticker) */
  missing: string[];
  error?: string;
}
