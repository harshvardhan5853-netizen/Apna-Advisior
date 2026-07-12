import { describe, it, expect } from "vitest";
import { computeTotals, mergeHoldings } from "../portfolio-store";
import type { Holding } from "@/types/portfolio";

/* ─── Holding factory ─── */
function makeHolding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    stockName: "Reliance Industries",
    symbol: "RELIANCE",
    exchange: "NSE",
    quantity: 10,
    avgBuyPrice: 2500,
    currentPrice: 2600,
    investedAmount: 25000,
    currentValue: 26000,
    pnl: 1000,
    pnlPercent: 4,
    confidence: 0.98,
    needsReview: false,
    source: "groww",
    ...overrides,
  };
}

/* ─── computeTotals ─── */
describe("computeTotals", () => {
  it("computes totals from holdings", () => {
    const h1 = makeHolding({ investedAmount: 1000, currentValue: 1200 });
    const h2 = makeHolding({ id: "h2", investedAmount: 2000, currentValue: 1800 });
    const totals = computeTotals([h1, h2]);
    expect(totals.invested).toBe(3000);
    expect(totals.currentValue).toBe(3000);
    expect(totals.pnl).toBe(0);
  });

  it("handles empty holdings", () => {
    const totals = computeTotals([]);
    expect(totals.invested).toBe(0);
    expect(totals.currentValue).toBe(0);
    expect(totals.holdingCount).toBe(0);
  });

  it("calculates P&L percent correctly", () => {
    const h = makeHolding({ investedAmount: 1000, currentValue: 1500 });
    const totals = computeTotals([h]);
    expect(totals.pnl).toBe(500);
    expect(totals.pnlPercent).toBeCloseTo(0.5, 2);
  });
});

/* ─── mergeKey ─── */
describe("mergeKey", () => {
  it("prefers symbol key over name", () => {
    const h = makeHolding({ symbol: "RELIANCE", stockName: "Reliance Industries" });
    // mergeKey is not exported directly, test via mergeHoldings behavior
  });
});

/* ─── mergeHoldings ─── */
describe("mergeHoldings", () => {
  it("adds new holdings", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE" })];
    const incoming = [makeHolding({ id: "2", symbol: "TCS" })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged).toHaveLength(2);
    expect(result.addedIds).toContain("2");
    expect(result.mergedIntoIds).toHaveLength(0);
  });

  it("merges duplicate holdings via weighted average", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE", quantity: 10, avgBuyPrice: 2500, investedAmount: 25000 })];
    const incoming = [makeHolding({ id: "2", symbol: "RELIANCE", quantity: 5, avgBuyPrice: 3000, investedAmount: 15000 })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged).toHaveLength(1);
    expect(result.addedIds).toHaveLength(0);
    expect(result.mergedIntoIds).toContain("2");

    const merged = result.merged[0];
    expect(merged.quantity).toBe(15);
    expect(merged.avgBuyPrice).toBeCloseTo(2666.67, 0);
    expect(merged.investedAmount).toBe(40000);
  });

  it("marks merged holding as needs review if either needs it", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE", needsReview: false })];
    const incoming = [makeHolding({ id: "2", symbol: "RELIANCE", needsReview: true })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged[0].needsReview).toBe(true);
  });

  it("keeps the higher confidence for merged holdings", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE", confidence: 0.7 })];
    const incoming = [makeHolding({ id: "2", symbol: "RELIANCE", confidence: 0.9 })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged[0].confidence).toBe(0.9);
  });

  it("handles merge by stock name when symbol is missing", () => {
    const existing = [makeHolding({ id: "1", symbol: "", stockName: "Reliance Industries" })];
    const incoming = [makeHolding({ id: "2", symbol: "", stockName: "Reliance Industries" })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged).toHaveLength(1);
  });

  it("does not merge different symbols", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE" })];
    const incoming = [makeHolding({ id: "2", symbol: "TCS" })];
    const result = mergeHoldings(existing, incoming);
    expect(result.merged).toHaveLength(2);
    expect(result.addedIds).toContain("2");
  });

  it("handles empty existing with incoming", () => {
    const incoming = [makeHolding({ id: "1", symbol: "RELIANCE" })];
    const result = mergeHoldings([], incoming);
    expect(result.merged).toHaveLength(1);
    expect(result.addedIds).toContain("1");
  });

  it("handles existing with empty incoming", () => {
    const existing = [makeHolding({ id: "1", symbol: "RELIANCE" })];
    const result = mergeHoldings(existing, []);
    expect(result.merged).toHaveLength(1);
    expect(result.addedIds).toHaveLength(0);
  });
});
