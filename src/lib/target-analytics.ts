import type {
  RebalanceStatus,
  TargetGapResult,
  TargetGapRow,
  TargetPortfolio,
} from "@/types/target-portfolio";
import type { CombinedHolding } from "@/types/portfolio";
import { lookupStock } from "@/lib/enrichment/nse-static";
import { formatCompactINR } from "@/lib/utils";

/** Under/over allocation threshold (percentage-point band). */
export const ON_TARGET_TOLERANCE = 1.5;

function normKey(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

function firstWord(s: string | null | undefined): string {
  return (s ?? "").trim().split(/\s+/)[0]?.toUpperCase() ?? "";
}

/**
 * Look up a holding for a target row.
 * (1) Exact symbol match against combined holdings.
 * (2) Canonicalized symbol via nse-static, then match.
 * (3) First-word stockName match.
 */
export function matchHoldingForAllocation(
  symbol: string,
  stockName: string,
  combined: CombinedHolding[],
  bySymbol: Map<string, CombinedHolding>,
  byName: Map<string, CombinedHolding>,
): CombinedHolding | null {
  const sym = normKey(symbol);
  if (sym && bySymbol.has(sym)) return bySymbol.get(sym)!;
  const canonical = normKey(lookupStock(sym, stockName)?.symbol ?? null);
  if (canonical && bySymbol.has(canonical)) return bySymbol.get(canonical)!;
  const nameKey = firstWord(stockName);
  if (nameKey && byName.has(nameKey)) return byName.get(nameKey)!;
  return null;
  void combined;
}

function classify(diffPercent: number): RebalanceStatus {
  if (Math.abs(diffPercent) <= ON_TARGET_TOLERANCE) return "on-target";
  return diffPercent < 0 ? "under-allocated" : "over-allocated";
}

function suggestionFor(
  status: RebalanceStatus,
  stockName: string,
  requiredInvestment: number,
  requiredReduction: number,
): string {
  if (status === "on-target") return `${stockName} is on target — hold as-is.`;
  if (status === "under-allocated") {
    return `Invest ${formatCompactINR(requiredInvestment)} more in ${stockName} to reach target allocation.`;
  }
  return `Avoid further purchases in ${stockName} — trim by ${formatCompactINR(requiredReduction)} when suitable.`;
}

/**
 * Priority score for the AI advisor engine.
 * Larger gaps on larger target weights matter more.
 * Range roughly 0..~10 for typical portfolios.
 */
function priorityScore(diffPercent: number, targetPercent: number): number {
  return (Math.abs(diffPercent) * targetPercent) / 10;
}

/**
 * Core rebalancing computation. Given the target and current holdings, returns:
 *  - one row per target allocation (matched or not)
 *  - additional rows for holdings the user owns but that are NOT in the target
 *    (these show as `over-allocated` because they should be 0% per the target).
 *  - a summary with under/overweight sums and net cash required.
 */
export function computeTargetGap(
  target: TargetPortfolio,
  combined: CombinedHolding[],
  totalCapitalOverride?: number | null,
): TargetGapResult {
  const bySymbol = new Map<string, CombinedHolding>();
  const byName = new Map<string, CombinedHolding>();
  for (const h of combined) {
    const s = normKey(h.symbol);
    if (s) bySymbol.set(s, h);
    const n = firstWord(h.stockName);
    if (n && !byName.has(n)) byName.set(n, h);
  }

  const totalCurrentValue = combined.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const override =
    totalCapitalOverride !== undefined
      ? totalCapitalOverride
      : target.totalCapitalOverride;
  const totalCapital = override && override > 0 ? override : totalCurrentValue;

  const usedHoldingIds = new Set<string>();
  const rows: TargetGapRow[] = [];

  // 1) Per-allocation rows.
  for (const alloc of [...target.allocations].sort((a, b) => a.order - b.order)) {
    const holding = matchHoldingForAllocation(alloc.symbol, alloc.stockName, combined, bySymbol, byName);
    if (holding) usedHoldingIds.add(holding.id);

    const currentValue = holding?.currentValue ?? 0;
    const currentPercent = totalCapital > 0 ? (currentValue / totalCapital) * 100 : 0;
    const targetValue = (alloc.targetPercent / 100) * totalCapital;
    const diffPercent = currentPercent - alloc.targetPercent;
    const gapValue = targetValue - currentValue;
    const requiredInvestment = gapValue > 0 ? gapValue : 0;
    const requiredReduction = gapValue < 0 ? -gapValue : 0;
    const status = classify(diffPercent);
    const suggestion = suggestionFor(status, alloc.stockName, requiredInvestment, requiredReduction);
    const currentQuantity = holding?.quantity ?? 0;
    const currentPrice = holding?.currentPrice && holding.currentPrice > 0 ? holding.currentPrice : null;
    const sharesToBuy = currentPrice && requiredInvestment > 0 ? Math.floor(requiredInvestment / currentPrice) : null;
    const sharesToSell = currentPrice && requiredReduction > 0 ? Math.floor(requiredReduction / currentPrice) : null;

    rows.push({
      allocationId: alloc.id,
      symbol: alloc.symbol,
      stockName: alloc.stockName,
      sector: alloc.sector ?? holding?.sector ?? null,
      targetPercent: alloc.targetPercent,
      currentPercent,
      diffPercent,
      targetValue,
      currentValue,
      requiredInvestment,
      requiredReduction,
      status,
      suggestion,
      priorityScore: priorityScore(diffPercent, alloc.targetPercent),
      matched: Boolean(holding),
      notes: alloc.notes ?? "",
      currentQuantity,
      currentPrice,
      sharesToBuy,
      sharesToSell,
    });
  }

  // 2) Extra rows for holdings the user owns that are NOT in the target.
  //    These are effectively over-allocated (target = 0%).
  for (const h of combined) {
    if (usedHoldingIds.has(h.id)) continue;
    const currentValue = h.currentValue || 0;
    if (currentValue <= 0) continue;
    const currentPercent = totalCapital > 0 ? (currentValue / totalCapital) * 100 : 0;
    const diffPercent = currentPercent - 0;
    const requiredReduction = currentValue;
    const currentPrice = h.currentPrice && h.currentPrice > 0 ? h.currentPrice : null;
    const sharesToSell = currentPrice ? Math.floor(requiredReduction / currentPrice) : h.quantity;
    rows.push({
      allocationId: `extra-${h.id}`,
      symbol: h.symbol,
      stockName: h.stockName,
      sector: h.sector ?? null,
      targetPercent: 0,
      currentPercent,
      diffPercent,
      targetValue: 0,
      currentValue,
      requiredInvestment: 0,
      requiredReduction,
      status: "over-allocated",
      suggestion: `${h.stockName} is not in your target portfolio — consider trimming ${formatCompactINR(requiredReduction)}.`,
      priorityScore: priorityScore(diffPercent, 0) || Math.abs(diffPercent) / 4,
      matched: true,
      notes: "Not in target",
      currentQuantity: h.quantity ?? 0,
      currentPrice,
      sharesToBuy: null,
      sharesToSell,
    });
  }

  const totalTargetPercent = rows.reduce((s, r) => s + r.targetPercent, 0);
  const totalCurrentPercent = rows.reduce((s, r) => s + r.currentPercent, 0);
  const underweightSum = rows.reduce((s, r) => s + r.requiredInvestment, 0);
  const overweightSum = rows.reduce((s, r) => s + r.requiredReduction, 0);
  const netCashRequired = underweightSum - overweightSum;
  const onTargetCount = rows.filter((r) => r.status === "on-target").length;
  const underAllocatedCount = rows.filter((r) => r.status === "under-allocated").length;
  const overAllocatedCount = rows.filter((r) => r.status === "over-allocated").length;
  const matchedCount = rows.filter((r) => r.matched).length;
  const unmatchedCount = rows.length - matchedCount;
  const totalAbsDiff = rows.reduce((s, r) => s + Math.abs(r.diffPercent), 0);
  const alignmentScore = rows.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - totalAbsDiff / 2));

  return {
    rows,
    summary: {
      totalCapital,
      totalCurrentValue,
      totalTargetPercent,
      totalCurrentPercent,
      underweightSum,
      overweightSum,
      netCashRequired,
      onTargetCount,
      underAllocatedCount,
      overAllocatedCount,
      matchedCount,
      unmatchedCount,
      alignmentScore,
    },
  };
}

export function sumTargetPercent(allocations: { targetPercent: number }[]): number {
  return allocations.reduce((s, a) => s + (a.targetPercent || 0), 0);
}
