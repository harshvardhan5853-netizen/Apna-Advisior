export type TargetPortfolioStatus = "active" | "archived";

export type RebalanceStatus = "on-target" | "under-allocated" | "over-allocated";

/**
 * One row in a target portfolio: the user's desired weight for a single stock.
 * `symbol` is the canonical uppercase NSE symbol (via nse-static lookup).
 * `stockName` is human-friendly (may be inferred from lookup).
 */
export interface TargetAllocation {
  id: string;
  symbol: string;
  stockName: string;
  sector: string | null;
  targetPercent: number; // 0..100
  notes: string;
  order: number;
}

export interface TargetPortfolio {
  id: string;
  name: string;
  status: TargetPortfolioStatus;
  createdAt: number;
  updatedAt: number;
  totalCapitalOverride: number | null; // if set, used for rebalance math instead of current holdings value
  allocations: TargetAllocation[];
  origin: { preset: string | null };
}

/**
 * One computed gap row combining a TargetAllocation with the user's current holding.
 * All amounts are INR. Percents are stored as 0..100.
 */
export interface TargetGapRow {
  allocationId: string;
  symbol: string;
  stockName: string;
  sector: string | null;
  targetPercent: number;
  currentPercent: number; // 0..100 of *total capital used for rebalance*
  diffPercent: number; // current - target
  targetValue: number; // targetPercent% of total capital
  currentValue: number;
  requiredInvestment: number; // > 0 when under-allocated
  requiredReduction: number; // > 0 when over-allocated
  status: RebalanceStatus;
  suggestion: string;
  priorityScore: number;
  matched: boolean; // did we find this symbol in combined holdings?
  notes: string;
  currentQuantity: number;
  currentPrice: number | null;
  sharesToBuy: number | null;
  sharesToSell: number | null;
}

export interface RebalanceSummary {
  totalCapital: number;
  totalCurrentValue: number;
  totalTargetPercent: number; // sum of targetPercent, should be 100
  totalCurrentPercent: number; // sum of currentPercent (capped at 100 conceptually)
  underweightSum: number; // sum of requiredInvestment across rows
  overweightSum: number; // sum of requiredReduction across rows
  netCashRequired: number; // underweightSum - overweightSum
  onTargetCount: number;
  underAllocatedCount: number;
  overAllocatedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  alignmentScore: number; // 0..100 how closely current matches target
}

export interface TargetGapResult {
  rows: TargetGapRow[];
  summary: RebalanceSummary;
}

/**
 * One entry in the rebalance history log (Card 4 #6). We snapshot the summary
 * numbers at the moment the user marks a rebalance as applied so they can look
 * back and see how their alignment evolved over time.
 */
export interface RebalanceHistoryEntry {
  id: string;
  targetPortfolioId: string;
  targetName: string;
  timestamp: number;
  alignmentScore: number;
  totalCapital: number;
  underweightSum: number;
  overweightSum: number;
  netCashRequired: number;
  matchedCount: number;
  rowCount: number;
  note: string;
}

export type TargetPresetKey = "balanced" | "long-term" | "dividend" | "aggressive" | "blank";

export interface TargetPresetOption {
  key: TargetPresetKey;
  label: string;
  description: string;
  allocations: Omit<TargetAllocation, "id" | "order" | "notes">[]; // ordered
}
