/**
 * Domain types for Apna Advisor portfolios.
 *
 * A Holding is a single line item (one stock). A Portfolio is a named
 * collection of Holdings. The system is source-agnostic — the same shape
 * comes out of CSV, Excel, PDF, or OCR pipelines.
 */

export type Exchange = "NSE" | "BSE" | "UNKNOWN";

export type BrokerSource =
  | "groww"
  | "zerodha"
  | "angelone"
  | "upstox"
  | "dhan"
  | "generic"
  | "manual";

export type PortfolioStatus = "active" | "archived";

export type MarketCapCategory = "Large" | "Mid" | "Small" | "Unknown";

export interface FundamentalData {
  pe: number | null;
  pb: number | null;
  peg: number | null;
  divYield: number | null;
  roe: number | null;
  roce: number | null;
  eps: number | null;
  revGrowth: number | null;
  profitGrowth: number | null;
  debtEquity: number | null;
  promoterHolding: number | null;
  promoterPledge: number | null;
}

export interface TechnicalData {
  rsi: number | null;
  macd: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  volume: number | null;
  avgVolume: number | null;
  supportLevel: number | null;
  resistanceLevel: number | null;
  high52w: number | null;
  low52w: number | null;
}

export interface RiskData {
  beta: number | null;
  volatility: number | null;
  drawdownFromHigh: number | null;
}

export interface Holding {
  id: string;
  stockName: string;
  symbol: string; // NSE/BSE ticker (best-effort)
  exchange: Exchange;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number; // quantity * avgBuyPrice (kept explicit for OCR inputs)
  currentValue: number; // quantity * currentPrice
  pnl: number; // currentValue - investedAmount
  pnlPercent: number;
  /** 0–1 confidence from OCR / heuristic extraction. 1 for CSV/Excel. */
  confidence: number;
  /** true if user needs to eyeball this row before saving. */
  needsReview: boolean;
  source: BrokerSource;
  notes?: string;

  importedAt?: number;
  dayPnl?: number | null;
  dayPnlPercent?: number | null;
  sector?: string | null;
  industry?: string | null;
  marketCap?: MarketCapCategory | null;
  fundamentals?: FundamentalData;
  technical?: TechnicalData;
  risk?: RiskData;
  transactionsImported?: number;
}

export interface Portfolio {
  id: string;
  name: string;
  status: PortfolioStatus;
  createdAt: number;
  updatedAt: number;
  holdings: Holding[];
  /** Snapshot totals cached for list views. Recomputed on write. */
  totals: PortfolioTotals;
  /** Provenance for the audit trail. */
  origin: {
    source: BrokerSource;
    fileNames: string[];
  };
}

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  holdingCount: number;
}

export interface ImportStats {
  totalDetected: number;
  successfullyImported: number;
  requiresReview: number;
  totalInvested: number;
  estimatedCurrentValue: number;
}

export type MergeAction =
  | {
      type: "create";
      portfolioId: string;
      previousActiveId?: string;
    }
  | {
      type: "merge";
      targetPortfolioId: string;
      /** Snapshot of the target portfolio BEFORE the merge, for undo. */
      previousSnapshot: Portfolio;
      addedHoldingIds: string[];
      mergedHoldingIds: string[];
    };

export interface MergeHistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  action: MergeAction;
}

/** A parser produces this. `warnings` bubble up into the review screen. */
export interface ParseResult {
  holdings: Holding[];
  source: BrokerSource;
  warnings: string[];
}

export interface HoldingSource {
  portfolioId: string;
  portfolioName: string;
  dateImported: number;
  quantity: number;
  avgBuyPrice: number;
  investedAmount: number;
}

export interface CombinedHolding extends Holding {
  sources: HoldingSource[];
  allocationPercent: number;
}

export interface PortfolioSummary {
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  stockCount: number;
  /** Money-weighted annualized return (fraction). Null when insufficient data. */
  xirr: number | null;
  /** Time-weighted annualized return based on earliest cost-basis (fraction). */
  cagr: number | null;
  /** Herfindahl-Hirschman concentration index (0..10000). */
  concentrationHHI: number | null;
}

export interface SectorAllocation {
  sector: string;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  count: number;
}

export interface StockAllocation {
  holdingId: string;
  stockName: string;
  symbol: string;
  currentValue: number;
  allocationPercent: number;
  color: string;
}

export interface MoverResult {
  holding: CombinedHolding;
  value: number;
}

export interface WinLossBreakdown {
  winners: number;
  losers: number;
  flat: number;
  winnersValue: number;
  losersValue: number;
}

export interface Highlights {
  bestPerformer: MoverResult | null;
  worstPerformer: MoverResult | null;
  highestAllocation: MoverResult | null;
  biggestGainer: MoverResult | null;
  biggestLoser: MoverResult | null;
  mostProfitableSector: SectorAllocation | null;
  mostLossMakingSector: SectorAllocation | null;
  winLoss: WinLossBreakdown;
}
