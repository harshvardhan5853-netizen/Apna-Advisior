import type {
  CombinedHolding,
  Highlights,
  Holding,
  HoldingSource,
  MoverResult,
  Portfolio,
  PortfolioSummary,
  SectorAllocation,
  StockAllocation,
} from "@/types/portfolio";
import { enrichHolding } from "./enrichment/enrich";
import { computePortfolioAnalytics } from "./portfolio-analytics";

const PIE_COLORS = [
  "#10b981",
  "#14b8a6",
  "#22d3ee",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f43f5e",
  "#a855f7",
  "#6366f1",
  "#0ea5e9",
  "#94a3b8",
];

function safeKey(h: Holding): string {
  const symbol = (h.symbol || "").trim().toUpperCase();
  if (symbol.length >= 2) return `S:${symbol}`;
  return `N:${(h.stockName || "").trim().toUpperCase()}`;
}

export function combineHoldings(portfolios: Portfolio[]): CombinedHolding[] {
  const map = new Map<string, { holding: Holding; sources: HoldingSource[] }>();
  for (const p of portfolios) {
    for (const raw of p.holdings) {
      const h = enrichHolding(raw);
      const key = safeKey(h);
      const existing = map.get(key);
      const source: HoldingSource = {
        portfolioId: p.id,
        portfolioName: p.name,
        dateImported: h.importedAt ?? p.updatedAt ?? p.createdAt,
        quantity: h.quantity,
        avgBuyPrice: h.avgBuyPrice,
        investedAmount: h.investedAmount,
      };
      if (!existing) {
        map.set(key, { holding: { ...h }, sources: [source] });
        continue;
      }
      const totalQty = existing.holding.quantity + h.quantity;
      const totalInvested = existing.holding.investedAmount + h.investedAmount;
      const newAvg = totalQty > 0 ? totalInvested / totalQty : existing.holding.avgBuyPrice;
      const preferredPrice = h.currentPrice > 0 ? h.currentPrice : existing.holding.currentPrice;
      const merged: Holding = {
        ...existing.holding,
        quantity: totalQty,
        avgBuyPrice: newAvg,
        currentPrice: preferredPrice,
        investedAmount: totalInvested,
        currentValue: totalQty * preferredPrice,
        pnl: totalQty * preferredPrice - totalInvested,
        pnlPercent: totalInvested > 0 ? (totalQty * preferredPrice - totalInvested) / totalInvested : 0,
        confidence: Math.max(existing.holding.confidence, h.confidence),
        needsReview: existing.holding.needsReview || h.needsReview,
        transactionsImported: (existing.holding.transactionsImported ?? 1) + (h.transactionsImported ?? 1),
      };
      if (!merged.exchange || merged.exchange === "UNKNOWN") merged.exchange = h.exchange;
      map.set(key, { holding: merged, sources: [...existing.sources, source] });
    }
  }

  const totalCurrentValue = Array.from(map.values()).reduce((sum, { holding }) => sum + holding.currentValue, 0);
  const combined: CombinedHolding[] = Array.from(map.values()).map(({ holding, sources }) => ({
    ...holding,
    sources,
    allocationPercent: totalCurrentValue > 0 ? (holding.currentValue / totalCurrentValue) * 100 : 0,
  }));
  combined.sort((a, b) => b.currentValue - a.currentValue);
  return combined;
}

export function computeSummary(holdings: CombinedHolding[]): PortfolioSummary {
  let invested = 0;
  let currentValue = 0;
  let todayPnl = 0;
  for (const h of holdings) {
    invested += h.investedAmount;
    currentValue += h.currentValue;
    if (typeof h.dayPnl === "number") todayPnl += h.dayPnl;
  }
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? pnl / invested : 0;
  const prevCurrentValue = currentValue - todayPnl;
  const todayPnlPercent = prevCurrentValue > 0 ? todayPnl / prevCurrentValue : 0;
  const analytics = computePortfolioAnalytics(holdings);
  return {
    invested,
    currentValue,
    pnl,
    pnlPercent,
    todayPnl,
    todayPnlPercent,
    stockCount: holdings.length,
    xirr: analytics.xirr,
    cagr: analytics.cagr,
    concentrationHHI: analytics.concentrationHHI,
  };
}

export function computeSectorAllocation(holdings: CombinedHolding[]): SectorAllocation[] {
  const map = new Map<string, SectorAllocation>();
  for (const h of holdings) {
    const sector = h.sector || "Unknown";
    const existing = map.get(sector);
    if (!existing) {
      map.set(sector, {
        sector,
        invested: h.investedAmount,
        currentValue: h.currentValue,
        pnl: h.pnl,
        pnlPercent: h.investedAmount > 0 ? h.pnl / h.investedAmount : 0,
        count: 1,
      });
    } else {
      existing.invested += h.investedAmount;
      existing.currentValue += h.currentValue;
      existing.pnl += h.pnl;
      existing.pnlPercent = existing.invested > 0 ? existing.pnl / existing.invested : 0;
      existing.count += 1;
    }
  }
  const list = Array.from(map.values()).sort((a, b) => b.currentValue - a.currentValue);
  return list;
}

export function computeStockAllocation(holdings: CombinedHolding[], maxSlices = 8): StockAllocation[] {
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalCurrentValue <= 0) return [];
  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const primary = sorted.slice(0, maxSlices);
  const others = sorted.slice(maxSlices);
  const slices: StockAllocation[] = primary.map((h, idx) => ({
    holdingId: h.id,
    stockName: h.stockName,
    symbol: h.symbol,
    currentValue: h.currentValue,
    allocationPercent: (h.currentValue / totalCurrentValue) * 100,
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));
  if (others.length > 0) {
    const otherValue = others.reduce((sum, h) => sum + h.currentValue, 0);
    slices.push({
      holdingId: "__others__",
      stockName: `Others (${others.length})`,
      symbol: "OTHERS",
      currentValue: otherValue,
      allocationPercent: (otherValue / totalCurrentValue) * 100,
      color: "#475569",
    });
  }
  return slices;
}

export function computeHighlights(holdings: CombinedHolding[], sectors: SectorAllocation[]): Highlights {
  const emptyWinLoss = { winners: 0, losers: 0, flat: 0, winnersValue: 0, losersValue: 0 };
  if (holdings.length === 0) {
    return {
      bestPerformer: null,
      worstPerformer: null,
      highestAllocation: null,
      biggestGainer: null,
      biggestLoser: null,
      mostProfitableSector: null,
      mostLossMakingSector: null,
      winLoss: emptyWinLoss,
    };
  }
  const byPnlPercent = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const byPnlAbs = [...holdings].sort((a, b) => b.pnl - a.pnl);
  const byValue = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const withGains = byPnlAbs.filter((h) => h.pnl > 0);
  const withLosses = byPnlAbs.filter((h) => h.pnl < 0);
  const bestPerformer: MoverResult = { holding: byPnlPercent[0], value: byPnlPercent[0].pnlPercent };
  const worstPerformer: MoverResult = {
    holding: byPnlPercent[byPnlPercent.length - 1],
    value: byPnlPercent[byPnlPercent.length - 1].pnlPercent,
  };
  const highestAllocation: MoverResult = { holding: byValue[0], value: byValue[0].allocationPercent };
  const biggestGainer: MoverResult | null = withGains.length > 0 ? { holding: withGains[0], value: withGains[0].pnl } : null;
  const biggestLoser: MoverResult | null = withLosses.length > 0 ? { holding: withLosses[withLosses.length - 1], value: withLosses[withLosses.length - 1].pnl } : null;
  const sectorsByPnl = [...sectors].sort((a, b) => b.pnl - a.pnl);
  const gainingSectors = sectorsByPnl.filter((s) => s.pnl > 0);
  const losingSectors = sectorsByPnl.filter((s) => s.pnl < 0);
  const winLoss = {
    winners: withGains.length,
    losers: withLosses.length,
    flat: holdings.length - withGains.length - withLosses.length,
    winnersValue: withGains.reduce((s, h) => s + h.pnl, 0),
    losersValue: withLosses.reduce((s, h) => s + h.pnl, 0),
  };
  return {
    bestPerformer,
    worstPerformer,
    highestAllocation,
    biggestGainer,
    biggestLoser,
    mostProfitableSector: gainingSectors[0] ?? null,
    mostLossMakingSector: losingSectors.length > 0 ? losingSectors[losingSectors.length - 1] : null,
    winLoss,
  };
}

export function computePnlTrend(holdings: CombinedHolding[], top = 15): CombinedHolding[] {
  return [...holdings].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, top);
}

export function computeGrowthSeries(holdings: CombinedHolding[]): Array<{ label: string; invested: number; currentValue: number }> {
  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  let invested = 0;
  let current = 0;
  const points: Array<{ label: string; invested: number; currentValue: number }> = [];
  for (const h of sorted) {
    invested += h.investedAmount;
    current += h.currentValue;
    points.push({
      label: h.symbol || h.stockName.slice(0, 8),
      invested,
      currentValue: current,
    });
  }
  return points;
}

export { PIE_COLORS };
