import type { Holding } from "@/types/portfolio";
import { KNOWN_SYMBOLS } from "./enrichment/nse-static";

const _knownSymbols = KNOWN_SYMBOLS;

// ── Broker naming aliases ──────────────────────────────────────────────────

const BROKER_ALIASES: Record<string, string> = {
  "HDFC": "HDFCBANK",
  "HDFCBANX": "HDFCBANK",
  "SIANPAINT": "ASIANPAINT", // S looks like A
  "ASIANPAlNT": "ASIANPAINT", // l→I
  "INFOSYS": "INFY",
  "LT": "LT",
  "LNT": "LT",
  "TATAMOTOR": "TATAMOTORS",
  "TATA": "TATAMOTORS",
  "M&M": "M&M",
  "MM": "M&M",
  "MARUTISUZUKI": "MARUTI",
  "MARUTI": "MARUTI",
  "INDUSIND": "INDUSINDBK",
  "ICICI": "ICICIBANK",
  "SBI": "SBIN",
  "KOTAK": "KOTAKBANK",
  "PNB": "PNB",
  "CANARA": "CANBK",
  "BANKBARODA": "BANKBARODA",
  "ITC": "ITC",
  "WIPRO": "WIPRO",
  "TCS": "TCS",
  "RELIANCE": "RELIANCE",
  "RIL": "RELIANCE",
  "HCL": "HCLTECH",
  "HCLTECH": "HCLTECH",
  "BLUESTAR": "BLUESTARCO",
  "BPCL": "BPCL",
  "IOCL": "IOC",
  "ONGC": "ONGC",
  "COAL": "COALINDIA",
  "HINDALCO": "HINDALCO",
  "JSW": "JSWSTEEL",
  "TATASTEEL": "TATASTEEL",
  "ADANI": "ADANIENT",
  "ULTRATECH": "ULTRACEMCO",
  "GRASIM": "GRASIM",
  "AMBUJA": "AMBUJACEM",
};

// ── Result types (Phase 8: Validation Engine) ──────────────────────────────

export interface ValidationResult {
  field: string;
  passed: boolean;
  score: number; // 0..1 contribution toward the validation stage
  message?: string;
}

export interface HoldingValidation {
  holdingId: string;
  results: ValidationResult[];
  warnings: string[];
  errors: string[];
  criticalErrors: string[];
  unknownSymbols: string[];
  missingRequiredFields: string[];
  /** Penalty to apply to confidence (0 = no penalty, 1 = full penalty). */
  confidencePenalty: number;
  /** Overall validation score for this holding (average of all field scores). */
  score: number;
}

/** Resolve a broker-style symbol to the canonical NSE symbol. */
export function resolveSymbol(raw: string): { canonical: string; matched: boolean } {
  const cleaned = raw.trim().toUpperCase();
  if (_knownSymbols.has(cleaned)) return { canonical: cleaned, matched: true };
  const aliased = BROKER_ALIASES[cleaned];
  if (aliased && _knownSymbols.has(aliased)) return { canonical: aliased, matched: true };
  // Fuzzy: allow partial prefix match
  for (const sym of _knownSymbols) {
    if (sym.startsWith(cleaned) || cleaned.startsWith(sym)) {
      return { canonical: sym, matched: true };
    }
  }
  return { canonical: cleaned, matched: false };
}

/** Check if a symbol is a known NSE symbol (for auto-import gate). */
export function isKnownSymbol(symbol: string): boolean {
  return resolveSymbol(symbol).matched;
}

/** Check if a symbol is an ETF. */
export function isEtf(symbol: string): boolean {
  const s = symbol.toUpperCase().trim();
  return s.endsWith("BEES") || s.endsWith("ETF");
}

// ── Individual validators ───────────────────────────────────────────────────

function classifyRequired(field: string): boolean {
  return ["quantity", "avgBuyPrice", "currentPrice", "investedAmount", "currentValue"].includes(field);
}

export function validateSymbol(symbol: string): ValidationResult & { unknownSymbols: string[] } {
  const cleaned = symbol.trim().toUpperCase();
  if (!cleaned) {
    return { field: "symbol", passed: false, score: 0, message: "Symbol is empty", unknownSymbols: [symbol] };
  }
  if (!/^[A-Z0-9.\-]{1,20}$/.test(cleaned)) {
    return { field: "symbol", passed: false, score: 0, message: `Symbol "${cleaned}" has invalid format`, unknownSymbols: [cleaned] };
  }
  const resolved = resolveSymbol(cleaned);
  if (!resolved.matched) {
    return { field: "symbol", passed: false, score: 0.4, message: `Unknown symbol "${cleaned}"`, unknownSymbols: [cleaned] };
  }
  return { field: "symbol", passed: true, score: 1, unknownSymbols: [] };
}

export function validateQuantity(quantity: number): ValidationResult {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { field: "quantity", passed: false, score: 0, message: `Missing/invalid quantity (got ${quantity})` };
  }
  if (!Number.isInteger(quantity)) {
    return { field: "quantity", passed: false, score: 0.3, message: `Quantity must be whole number (got ${quantity})` };
  }
  if (quantity > 1_000_000) {
    return { field: "quantity", passed: true, score: 0.5, message: `Unusually large quantity: ${quantity}` };
  }
  return { field: "quantity", passed: true, score: 1 };
}

export function validatePrice(price: number, label = "price"): ValidationResult {
  if (!Number.isFinite(price) || price <= 0) {
    return { field: label, passed: false, score: 0, message: `Missing/invalid ${label} (got ${price})` };
  }
  if (price > 1_000_000) {
    return { field: label, passed: true, score: 0.5, message: `Unusually high ${label}: ${price}` };
  }
  return { field: label, passed: true, score: 1 };
}

export function validateFinancialConsistency(h: Holding, tolerance = 0.02): ValidationResult[] {
  const results: ValidationResult[] = [];

  const expectedInvested = h.quantity * h.avgBuyPrice;
  if (expectedInvested > 0 && h.investedAmount > 0) {
    const diff = Math.abs(h.investedAmount - expectedInvested) / expectedInvested;
    results.push({
      field: "investedAmount",
      passed: diff <= tolerance,
      score: diff <= tolerance ? 1 : Math.max(0, 1 - diff),
      message:
        diff > tolerance
          ? `Invested ${h.investedAmount} ≠ qty×avg (${expectedInvested}) ${(diff * 100).toFixed(1)}% off`
          : undefined,
    });
  }

  const expectedCurrent = h.quantity * h.currentPrice;
  if (expectedCurrent > 0 && h.currentValue > 0) {
    const diff = Math.abs(h.currentValue - expectedCurrent) / expectedCurrent;
    results.push({
      field: "currentValue",
      passed: diff <= tolerance,
      score: diff <= tolerance ? 1 : Math.max(0, 1 - diff),
      message:
        diff > tolerance
          ? `Current ${h.currentValue} ≠ qty×ltp (${expectedCurrent}) ${(diff * 100).toFixed(1)}% off`
          : undefined,
    });
  }

  if (h.investedAmount > 0 || h.currentValue > 0) {
    const expectedPnl = h.currentValue - h.investedAmount;
    const denom = Math.abs(expectedPnl) || 1;
    const diff = Math.abs(h.pnl - expectedPnl) / denom;
    results.push({
      field: "pnl",
      passed: diff <= tolerance,
      score: diff <= tolerance ? 1 : Math.max(0, 1 - diff),
      message: diff > tolerance ? `P/L ${h.pnl} ≠ current - invested (${expectedPnl})` : undefined,
    });
  }

  return results;
}

// ── Full holding validation ─────────────────────────────────────────────────

export function validateHolding(h: Holding): HoldingValidation {
  const results: ValidationResult[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const criticalErrors: string[] = [];
  const unknownSymbols: string[] = [];
  const missingRequiredFields: string[] = [];

  const symResult = validateSymbol(h.symbol);
  results.push(symResult);
  unknownSymbols.push(...symResult.unknownSymbols);

  results.push(validateQuantity(h.quantity));
  results.push(validatePrice(h.avgBuyPrice, "avgBuyPrice"));
  results.push(validatePrice(h.currentPrice, "currentPrice"));
  results.push(...validateFinancialConsistency(h));

  for (const r of results) {
    if (r.message) {
      if (!r.passed && classifyRequired(r.field)) {
        errors.push(r.message);
        criticalErrors.push(r.message);
      } else if (!r.passed) {
        errors.push(r.message);
      } else {
        warnings.push(r.message);
      }
    }
  }

  const requiredFields = ["quantity", "avgBuyPrice", "currentPrice", "investedAmount", "currentValue"];
  for (const f of requiredFields) {
    const vr = results.find((r) => r.field === f);
    if (vr && !vr.passed) missingRequiredFields.push(f);
  }

  const score = results.length > 0
    ? results.reduce((s, r) => s + r.score, 0) / results.length
    : 0;

  const failedRequired = results.filter((r) => !r.passed && classifyRequired(r.field)).length;
  const totalRequired = results.filter((r) => classifyRequired(r.field)).length;
  const confidencePenalty = totalRequired > 0 ? failedRequired / totalRequired : 0;

  return {
    holdingId: h.id,
    results,
    warnings,
    errors,
    criticalErrors,
    unknownSymbols,
    missingRequiredFields,
    confidencePenalty,
    score,
  };
}

export function validateHoldings(holdings: Holding[]): HoldingValidation[] {
  return holdings.map((h) => validateHolding(h));
}

export interface AutoImportGate {
  canAutoImport: boolean;
  reasons: string[];
}

export function checkAutoImportGate(
  holdings: Holding[],
  validationResults: HoldingValidation[],
  finalConfidence: number,
): AutoImportGate {
  const reasons: string[] = [];

  if (finalConfidence < 0.95) {
    reasons.push(`Confidence ${(finalConfidence * 100).toFixed(0)}% < 95%`);
  }

  const allCriticalErrors = validationResults.flatMap((v) => v.criticalErrors);
  if (allCriticalErrors.length > 0) {
    reasons.push(`${allCriticalErrors.length} critical error(s) found`);
  }

  const allUnknownSymbols = [...new Set(validationResults.flatMap((v) => v.unknownSymbols))];
  if (allUnknownSymbols.length > 0) {
    reasons.push(`Unknown symbols: ${allUnknownSymbols.join(", ")}`);
  }

  const allMissing = [...new Set(validationResults.flatMap((v) => v.missingRequiredFields))];
  if (allMissing.length > 0) {
    reasons.push(`Missing fields: ${allMissing.join(", ")}`);
  }

  return {
    canAutoImport: reasons.length === 0,
    reasons,
  };
}

// ── Duplicate detection & merging ──────────────────────────────────────────

export interface DuplicateGroup {
  symbol: string;
  holdings: Holding[];
}

export function detectDuplicates(holdings: Holding[]): DuplicateGroup[] {
  const groups = new Map<string, Holding[]>();
  for (const h of holdings) {
    const key = h.symbol.toUpperCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }
  return Array.from(groups.entries())
    .filter(([, hs]) => hs.length > 1)
    .map(([symbol, hs]) => ({ symbol, holdings: hs }));
}

export function mergeDuplicates(holdings: Holding[]): Holding[] {
  const merged = new Map<string, Holding>();
  for (const h of holdings) {
    const key = h.symbol.toUpperCase().trim();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...h });
    } else {
      const totalQty = existing.quantity + h.quantity;
      const avgPrice = totalQty > 0
        ? (existing.avgBuyPrice * existing.quantity + h.avgBuyPrice * h.quantity) / totalQty
        : existing.avgBuyPrice;
      const currentPrice = totalQty > 0
        ? (existing.currentPrice * existing.quantity + h.currentPrice * h.quantity) / totalQty
        : existing.currentPrice;
      const invested = existing.investedAmount + h.investedAmount;
      const currentValue = existing.currentValue + h.currentValue;
      const pnl = currentValue - invested;
      merged.set(key, {
        ...existing,
        quantity: totalQty,
        avgBuyPrice: avgPrice,
        currentPrice,
        investedAmount: invested,
        currentValue,
        pnl,
        pnlPercent: invested > 0 ? pnl / invested : 0,
        confidence: Math.min(1, (existing.confidence + h.confidence) / 2),
        needsReview: existing.needsReview || h.needsReview,
      });
    }
  }
  return Array.from(merged.values());
}

/** Full validation summary across all holdings for telemetry. */
export interface ValidationSummary {
  holdingsValidated: number;
  totalWarnings: number;
  totalErrors: number;
  totalCriticalErrors: number;
  unknownSymbols: string[];
  holdingsNeedingReview: number;
  avgValidationScore: number;
}

export function summarizeValidation(results: HoldingValidation[]): ValidationSummary {
  return {
    holdingsValidated: results.length,
    totalWarnings: results.reduce((s, v) => s + v.warnings.length, 0),
    totalErrors: results.reduce((s, v) => s + v.errors.length, 0),
    totalCriticalErrors: results.reduce((s, v) => s + v.criticalErrors.length, 0),
    unknownSymbols: [...new Set(results.flatMap((v) => v.unknownSymbols))],
    holdingsNeedingReview: results.filter((v) => v.score < 0.8).length,
    avgValidationScore: results.length > 0
      ? results.reduce((s, v) => s + v.score, 0) / results.length
      : 1,
  };
}
