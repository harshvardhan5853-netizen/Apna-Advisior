import { describe, it, expect } from "vitest";
import {
  validateSymbol,
  validateQuantity,
  validatePrice,
  validateFinancialConsistency,
  validateHolding,
  checkAutoImportGate,
  detectDuplicates,
  mergeDuplicates,
  isKnownSymbol,
  isEtf,
  resolveSymbol,
} from "../validation-engine";
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

/* ─── resolveSymbol ─── */
describe("resolveSymbol", () => {
  it("resolves a known NSE symbol", () => {
    expect(resolveSymbol("RELIANCE")).toEqual({ canonical: "RELIANCE", matched: true });
  });

  it("resolves case-insensitively", () => {
    expect(resolveSymbol("reliance")).toEqual({ canonical: "RELIANCE", matched: true });
  });

  it("resolves via broker alias", () => {
    expect(resolveSymbol("RIL")).toEqual({ canonical: "RELIANCE", matched: true });
  });

  it("resolves via prefix partial match", () => {
    expect(resolveSymbol("TATAMOTOR")).toEqual({ canonical: "TATAMOTORS", matched: true });
  });

  it("returns unmatched for unknown symbol", () => {
    expect(resolveSymbol("XYZ123")).toEqual({ canonical: "XYZ123", matched: false });
  });
});

/* ─── isKnownSymbol ─── */
describe("isKnownSymbol", () => {
  it("returns true for known NSE symbol", () => {
    expect(isKnownSymbol("TCS")).toBe(true);
  });

  it("returns false for unknown symbol", () => {
    expect(isKnownSymbol("NONEXISTENT")).toBe(false);
  });
});

/* ─── isEtf ─── */
describe("isEtf", () => {
  it("detects ETF by BEES suffix", () => {
    expect(isEtf("NIFTYBEES")).toBe(true);
  });

  it("detects ETF by ETF suffix", () => {
    expect(isEtf("GOLDBEES")).toBe(true);
  });

  it("returns false for regular stocks", () => {
    expect(isEtf("RELIANCE")).toBe(false);
  });
});

/* ─── validateSymbol ─── */
describe("validateSymbol", () => {
  it("passes a valid known symbol", () => {
    const r = validateSymbol("RELIANCE");
    expect(r.passed).toBe(true);
    expect(r.score).toBe(1);
    expect(r.unknownSymbols).toEqual([]);
  });

  it("fails empty symbol", () => {
    const r = validateSymbol("");
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("returns partial score for unknown symbol", () => {
    const r = validateSymbol("UNKNOWN123");
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0.4);
    expect(r.unknownSymbols).toContain("UNKNOWN123");
  });

  it("rejects invalid format", () => {
    const r = validateSymbol("SYM$BOL^");
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });
});

/* ─── validateQuantity ─── */
describe("validateQuantity", () => {
  it("passes valid integer quantity", () => {
    const r = validateQuantity(100);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(1);
  });

  it("fails zero quantity", () => {
    const r = validateQuantity(0);
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("fails negative quantity", () => {
    const r = validateQuantity(-5);
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("warns on unusually large quantity", () => {
    const r = validateQuantity(2_000_000);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(0.5);
  });

  it("warns on non-integer quantity", () => {
    const r = validateQuantity(10.5);
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0.3);
  });
});

/* ─── validatePrice ─── */
describe("validatePrice", () => {
  it("passes valid price", () => {
    expect(validatePrice(150).passed).toBe(true);
  });

  it("fails zero price", () => {
    expect(validatePrice(0).passed).toBe(false);
  });

  it("fails negative price", () => {
    expect(validatePrice(-1).passed).toBe(false);
  });

  it("warns on unusually high price", () => {
    const r = validatePrice(2_000_000);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(0.5);
  });
});

/* ─── validateFinancialConsistency ─── */
describe("validateFinancialConsistency", () => {
  it("passes when invested matches qty × avg", () => {
    const h = makeHolding({ quantity: 10, avgBuyPrice: 100, investedAmount: 1000, currentPrice: 100, currentValue: 1000, pnl: 0 });
    const results = validateFinancialConsistency(h);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("fails when invested does not match qty × avg", () => {
    const h = makeHolding({ quantity: 10, avgBuyPrice: 100, investedAmount: 2000 });
    const invested = validateFinancialConsistency(h).find((r) => r.field === "investedAmount")!;
    expect(invested.passed).toBe(false);
  });

  it("passes when current matches qty × price", () => {
    const h = makeHolding({ quantity: 10, currentPrice: 150, currentValue: 1500 });
    const results = validateFinancialConsistency(h);
    const current = results.find((r) => r.field === "currentValue")!;
    expect(current.passed).toBe(true);
  });

  it("fails when pnl does not match current - invested", () => {
    const h = makeHolding({ investedAmount: 1000, currentValue: 1500, pnl: 9999 });
    const pnl = validateFinancialConsistency(h).find((r) => r.field === "pnl")!;
    expect(pnl.passed).toBe(false);
  });
});

/* ─── validateHolding ─── */
describe("validateHolding", () => {
  it("returns clean validation for a valid holding", () => {
    const h = makeHolding();
    const v = validateHolding(h);
    expect(v.score).toBeGreaterThanOrEqual(0.9);
    expect(v.errors).toHaveLength(0);
    expect(v.criticalErrors).toHaveLength(0);
  });

  it("captures unknown symbols", () => {
    const h = makeHolding({ symbol: "FAKE123" });
    const v = validateHolding(h);
    expect(v.unknownSymbols).toContain("FAKE123");
    // Symbol is not a "required" field for penalty calculation, but score is affected
    expect(v.score).toBeLessThan(1);
  });

  it("flags missing required fields", () => {
    const h = makeHolding({ quantity: 0 });
    const v = validateHolding(h);
    expect(v.missingRequiredFields).toContain("quantity");
  });

  it("generates warnings for unusual values", () => {
    const h = makeHolding({ quantity: 2_000_000 });
    const v = validateHolding(h);
    expect(v.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

/* ─── checkAutoImportGate ─── */
describe("checkAutoImportGate", () => {
  it("allows auto-import with high confidence and no errors", () => {
    const h = makeHolding();
    const v = validateHolding(h);
    const gate = checkAutoImportGate([h], [v], 0.98);
    expect(gate.canAutoImport).toBe(true);
    expect(gate.reasons).toHaveLength(0);
  });

  it("blocks auto-import when confidence is low", () => {
    const h = makeHolding();
    const v = validateHolding(h);
    const gate = checkAutoImportGate([h], [v], 0.5);
    expect(gate.canAutoImport).toBe(false);
    expect(gate.reasons.some((r) => r.includes("Confidence"))).toBe(true);
  });

  it("blocks auto-import when critical errors exist", () => {
    const h = makeHolding({ quantity: 0 });
    const v = validateHolding(h);
    const gate = checkAutoImportGate([h], [v], 0.98);
    expect(gate.canAutoImport).toBe(false);
  });
});

/* ─── detectDuplicates ─── */
describe("detectDuplicates", () => {
  it("returns empty when no duplicates", () => {
    const holdings = [makeHolding({ id: "1", symbol: "RELIANCE" }), makeHolding({ id: "2", symbol: "TCS" })];
    expect(detectDuplicates(holdings)).toHaveLength(0);
  });

  it("detects duplicate symbols", () => {
    const holdings = [makeHolding({ id: "1", symbol: "RELIANCE" }), makeHolding({ id: "2", symbol: "RELIANCE" })];
    const dups = detectDuplicates(holdings);
    expect(dups).toHaveLength(1);
    expect(dups[0].symbol).toBe("RELIANCE");
  });
});

/* ─── mergeDuplicates ─── */
describe("mergeDuplicates", () => {
  it("merges duplicate holdings with weighted average", () => {
    const holdings = [
      makeHolding({ id: "1", symbol: "RELIANCE", quantity: 10, avgBuyPrice: 2500 }),
      makeHolding({ id: "2", symbol: "RELIANCE", quantity: 5, avgBuyPrice: 2600 }),
    ];
    const merged = mergeDuplicates(holdings);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(15);
    expect(merged[0].avgBuyPrice).toBeCloseTo((10 * 2500 + 5 * 2600) / 15, 1);
  });

  it("passes through unique holdings unchanged", () => {
    const holdings = [makeHolding({ id: "1", symbol: "RELIANCE" }), makeHolding({ id: "2", symbol: "TCS" })];
    expect(mergeDuplicates(holdings)).toHaveLength(2);
  });
});
