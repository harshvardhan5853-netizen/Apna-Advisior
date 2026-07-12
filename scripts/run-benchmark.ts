/**
 * Benchmark framework for Apna Advisor extraction pipeline.
 *
 * Usage:
 *   npx tsx scripts/run-benchmark.ts                       # unit tests only
 *   npx tsx scripts/run-benchmark.ts --api http://localhost:3000  # + API tests
 *   npx tsx scripts/run-benchmark.ts --verbose             # detailed output
 *   npx tsx scripts/run-benchmark.ts --report              # write JSON reports
 *
 * Reports:
 *   benchmark-report.json   — all test results
 *   failure-report.json     — categorized failures (only if failures exist)
 *   performance-report.json — per-file-type performance metrics
 */
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

// ---- CLI args ----------------------------------------------------------------
const args = process.argv.slice(2);
const API_BASE = (() => {
  const i = args.indexOf("--api");
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
})();
const VERBOSE = args.includes("--verbose");
const WRITE_REPORT = args.includes("--report");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEST_DATA_DIR = path.join(ROOT, "test-data");

// ---- Types -------------------------------------------------------------------
interface TestResult {
  name: string;
  category: "unit" | "api";
  passed: boolean;
  details: string;
  durationMs: number;
  fileType?: string;       // csv, xlsx, pdf, broker (for API tests)
  failureCategory?: string; // categorized failure type
}

interface PerformanceMetrics {
  fileType: string;
  count: number;
  passed: number;
  failed: number;
  passRate: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
}

// ---- Results accumulator -----------------------------------------------------
const results: TestResult[] = [];
const startAll = Date.now();

function record(
  category: TestResult["category"],
  name: string,
  passed: boolean,
  details: string,
  startMs: number,
  fileType?: string,
  failureCategory?: string,
) {
  results.push({
    category, name, passed, details, fileType, failureCategory,
    durationMs: Date.now() - startMs,
  });
  const icon = passed ? "  PASS" : "  FAIL";
  console.log(`${icon}  ${name}  (${Date.now() - startMs}ms)`);
  if (!passed && VERBOSE) {
    console.log(`       -> ${details}`);
  }
}

// ---- Helpers -----------------------------------------------------------------
function approxEq(a: number, b: number, tol = 0.01): boolean {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) < tol;
}

function partialMatch(actual: Record<string, unknown>, expected: Record<string, unknown>, ignore: string[]): boolean {
  for (const [k, v] of Object.entries(expected)) {
    if (ignore.includes(k)) continue;
    const a = actual[k];
    if (typeof v === "number" && typeof a === "number") {
      if (!approxEq(a, v)) return false;
    } else if (v !== a) {
      return false;
    }
  }
  return true;
}

function detectFileType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".csv") return "csv";
  if (e === ".xlsx" || e === ".xls") return "xlsx";
  if (e === ".pdf" || e === ".txt") return "pdf";
  if (e === ".json") return "broker";
  return "other";
}

// ---- Failure categorization --------------------------------------------------
function categorizeFailure(data: any, detail: string): string {
  if (detail.includes("timeout") || detail.includes("TIMEOUT")) return "Timeout";
  if (detail.includes("Unknown symbol") || detail.includes("unknown")) return "Unknown Symbol";
  if (detail.includes("Missing") || detail.includes("missing")) return "Missing Field";
  if (detail.includes("password") || detail.includes("Password")) return "Password Protected";
  if (detail.includes("corrupt") || detail.includes("Corrupt")) return "Corrupted File";
  if (detail.includes("empty") || detail.includes("Empty")) return "Empty File";
  if (data?.error === "unsupported-type") return "Unsupported Format";
  if (data?.error) return `API Error: ${data.error}`;
  if (detail.includes("HTTP 400")) return "Bad Request";
  if (detail.includes("HTTP 413")) return "File Too Large";
  if (detail.includes("HTTP 500") || detail.includes("500")) return "Server Error";
  if (detail.includes("fetch failed") || detail.includes("connect")) return "Connection Error";
  return "Unknown";
}

// ---- Report writers ----------------------------------------------------------

function computePerformanceMetrics(): PerformanceMetrics[] {
  const byType = new Map<string, TestResult[]>();
  for (const r of results.filter((r) => r.category === "api" && r.fileType)) {
    const ft = r.fileType!;
    if (!byType.has(ft)) byType.set(ft, []);
    byType.get(ft)!.push(r);
  }

  const metrics: PerformanceMetrics[] = [];
  for (const [fileType, typeResults] of byType) {
    const passed = typeResults.filter((r) => r.passed).length;
    const durations = typeResults.map((r) => r.durationMs);
    metrics.push({
      fileType,
      count: typeResults.length,
      passed,
      failed: typeResults.length - passed,
      passRate: typeResults.length > 0 ? Math.round((passed / typeResults.length) * 10000) / 100 : 0,
      avgDurationMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDurationMs: Math.min(...durations),
      maxDurationMs: Math.max(...durations),
    });
  }
  return metrics.sort((a, b) => a.fileType.localeCompare(b.fileType));
}

function writeReports() {
  const totalMs = Date.now() - startAll;
  const startTime = new Date().toISOString();
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const metrics = computePerformanceMetrics();

  // benchmark-report.json
  const summary = {
    startTime,
    durationMs: totalMs,
    total: results.length,
    passed,
    failed: failed.length,
    passRate: results.length > 0 ? Math.round((passed / results.length) * 10000) / 100 : 0,
    unitTests: {
      passed: results.filter((r) => r.category === "unit" && r.passed).length,
      total: results.filter((r) => r.category === "unit").length,
    },
    apiTests: {
      passed: results.filter((r) => r.category === "api" && r.passed).length,
      total: results.filter((r) => r.category === "api").length,
      byType: metrics,
    },
    tests: results.map((r) => ({
      name: r.name,
      category: r.category,
      fileType: r.fileType,
      passed: r.passed,
      durationMs: r.durationMs,
      failureCategory: r.failureCategory,
      details: r.passed ? undefined : r.details,
    })),
  };

  fs.writeFileSync(
    path.join(ROOT, "benchmark-report.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`  Report: benchmark-report.json`);

  // failure-report.json
  if (failed.length > 0) {
    const failures = {
      startTime,
      total: failed.length,
      failures: failed.map((r) => ({
        name: r.name,
        category: r.category,
        fileType: r.fileType,
        failureCategory: r.failureCategory || "Unknown",
        durationMs: r.durationMs,
        details: r.details,
      })),
    };
    fs.writeFileSync(
      path.join(ROOT, "failure-report.json"),
      JSON.stringify(failures, null, 2),
    );
    console.log(`  Report: failure-report.json`);
  } else {
    const failPath = path.join(ROOT, "failure-report.json");
    if (fs.existsSync(failPath)) fs.unlinkSync(failPath);
  }

  // performance-report.json
  const perf = {
    startTime,
    totalDurationMs: totalMs,
    metrics,
    fieldAccuracy: estimateFieldAccuracy(results),
  };
  fs.writeFileSync(
    path.join(ROOT, "performance-report.json"),
    JSON.stringify(perf, null, 2),
  );
  console.log(`  Report: performance-report.json`);
}

function estimateFieldAccuracy(rs: TestResult[]): Record<string, number | string> {
  const apiTests = rs.filter((r) => r.category === "api");
  return {
    overallApiPassRate: apiTests.length > 0
      ? Math.round((apiTests.filter((r) => r.passed).length / apiTests.length) * 10000) / 100
      : "N/A (no API tests run)",
  };
}

// ---- Phase 1: Unit tests -----------------------------------------------------
async function runUnitTests() {
  console.log("\n================================================================================");
  console.log("  UNIT TESTS -- Validation Engine & Confidence Scorer");
  console.log("================================================================================\n");

  const { resolveSymbol, isKnownSymbol, isEtf, validateSymbol, validateQuantity, validatePrice, validateFinancialConsistency, validateHolding, detectDuplicates, mergeDuplicates, summarizeValidation, checkAutoImportGate } = await import("../src/lib/validation-engine");
  const { computeConfidence, deriveStageScores, shouldAutoImport, needsReview } = await import("../src/lib/confidence-scorer");

  // resolveSymbol
  {
    const s = Date.now();
    const r1 = resolveSymbol("INFY");
    record("unit", "resolveSymbol(INFY) -> canonical=INFY matched=true", r1.canonical === "INFY" && r1.matched, JSON.stringify(r1), s);
  }
  {
    const s = Date.now();
    const r2 = resolveSymbol("SIANPAINT");
    record("unit", "resolveSymbol(SIANPAINT) -> alias->ASIANPAINT matched=true", r2.canonical === "ASIANPAINT" && r2.matched, JSON.stringify(r2), s);
  }
  {
    const s = Date.now();
    const r3 = resolveSymbol("HDFCBANX");
    record("unit", "resolveSymbol(HDFCBANX) -> prefix-fallback->HDFCBANK matched=true", r3.canonical === "HDFCBANK" && r3.matched, JSON.stringify(r3), s);
  }
  {
    const s = Date.now();
    const r4 = resolveSymbol("NONEXISTENT123");
    record("unit", "resolveSymbol(NONEXISTENT123) -> canonical=NONEXISTENT123 matched=false", r4.canonical === "NONEXISTENT123" && !r4.matched, JSON.stringify(r4), s);
  }

  // isKnownSymbol / isEtf
  {
    const s = Date.now();
    const k = isKnownSymbol("RELIANCE");
    record("unit", "isKnownSymbol(RELIANCE)=true", k === true, String(k), s);
  }
  {
    const s = Date.now();
    const k = isKnownSymbol("FAKE123");
    record("unit", "isKnownSymbol(FAKE123)=false", k === false, String(k), s);
  }
  {
    const s = Date.now();
    const e = isEtf("NIFTYBEES");
    record("unit", "isEtf(NIFTYBEES)=true", e === true, String(e), s);
  }
  {
    const s = Date.now();
    const e = isEtf("RELIANCE");
    record("unit", "isEtf(RELIANCE)=false", e === false, String(e), s);
  }

  // validateSymbol
  {
    const s = Date.now();
    const v = validateSymbol("INFY");
    record("unit", "validateSymbol(INFY) -> passed=true", v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validateSymbol("ZOMATO");
    record("unit", "validateSymbol(ZOMATO) -> passed=true (known NSE)", v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validateSymbol("UNKNOWN123");
    record("unit", "validateSymbol(UNKNOWN123) -> passed=false", !v.passed, JSON.stringify(v), s);
  }

  // validateQuantity
  {
    const s = Date.now();
    const v = validateQuantity(15);
    record("unit", "validateQuantity(15) -> passed=true", v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validateQuantity(0);
    record("unit", "validateQuantity(0) -> passed=false", !v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validateQuantity(-5);
    record("unit", "validateQuantity(-5) -> passed=false", !v.passed, JSON.stringify(v), s);
  }

  // validatePrice
  {
    const s = Date.now();
    const v = validatePrice(1450);
    record("unit", "validatePrice(1450) -> passed=true", v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validatePrice(0);
    record("unit", "validatePrice(0) -> passed=false", !v.passed, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const v = validatePrice(9999999);
    record("unit", "validatePrice(9999999) -> passed=true score=0.5", v.passed && v.score === 0.5, JSON.stringify(v), s);
  }

  // validateFinancialConsistency
  {
    const s = Date.now();
    const h = {
      id: "h-1", stockName: "INFY", symbol: "INFY", exchange: "NSE" as const,
      quantity: 15, avgBuyPrice: 1450, currentPrice: 1500,
      investedAmount: 21750, currentValue: 22500,
      pnl: 750, pnlPercent: 3.45, confidence: 1, needsReview: false, source: "generic" as const,
    };
    const vals = validateFinancialConsistency(h);
    const allOk = vals.every((v: any) => v.passed);
    record("unit", "validateFinancialConsistency(valid holding) -> all ok", allOk, JSON.stringify(vals), s);
  }
  {
    const s = Date.now();
    const h = {
      id: "h-2", stockName: "INFY", symbol: "INFY", exchange: "NSE" as const,
      quantity: 15, avgBuyPrice: 1450, currentPrice: 1500,
      investedAmount: 100, currentValue: 500,
      pnl: 400, pnlPercent: 10, confidence: 1, needsReview: false, source: "generic" as const,
    };
    const vals = validateFinancialConsistency(h);
    const anyFail = vals.some((v: any) => !v.passed);
    record("unit", "validateFinancialConsistency(bad holding) -> flags inconsistencies", anyFail, JSON.stringify(vals), s);
  }

  // validateHolding
  {
    const s = Date.now();
    const good: any = {
      id: "h-3", stockName: "HDFCBANK", symbol: "HDFCBANK", exchange: "NSE",
      quantity: 10, avgBuyPrice: 1600, currentPrice: 1650,
      investedAmount: 16000, currentValue: 16500,
      pnl: 500, pnlPercent: 3.125, confidence: 1, needsReview: false, source: "generic",
    };
    const v = validateHolding(good);
    record("unit", "validateHolding(good holding) -> no critical errors", v.criticalErrors.length === 0, JSON.stringify(v), s);
  }
  {
    const s = Date.now();
    const bad: any = {
      id: "h-4", stockName: "", symbol: "FAKE123", exchange: "UNKNOWN",
      quantity: 0, avgBuyPrice: 0, currentPrice: 0,
      investedAmount: 0, currentValue: 0,
      pnl: 0, pnlPercent: 0, confidence: 0.4, needsReview: true, source: "generic",
    };
    const v = validateHolding(bad);
    const hasCriticals = v.criticalErrors.length >= 2;
    const penalty = v.confidencePenalty > 0;
    record("unit", "validateHolding(bad holding) -> criticals + penalty", hasCriticals && penalty, `criticals=${v.criticalErrors.length} penalty=${v.confidencePenalty}`, s);
  }

  // detectDuplicates
  {
    const s = Date.now();
    const base = {
      exchange: "NSE" as const, stockName: "Infosys", avgBuyPrice: 1450,
      currentPrice: 1500, investedAmount: 21750, currentValue: 22500,
      pnl: 750, pnlPercent: 3.45, confidence: 1, needsReview: false, source: "generic" as const,
    };
    const holdings: any[] = [
      { ...base, id: "h-1", symbol: "INFY", quantity: 10 },
      { ...base, id: "h-2", symbol: "INFY", quantity: 5 },
      { ...base, id: "h-3", symbol: "HDFCBANK", quantity: 20 },
    ];
    const groups = detectDuplicates(holdings);
    record("unit", "detectDuplicates(2xINFY + 1xHDFC) -> 1 duplicate group", groups.length === 1 && groups[0].symbol === "INFY", JSON.stringify(groups.map((g: any) => ({ symbol: g.symbol, count: g.holdings.length }))), s);
  }

  // mergeDuplicates
  {
    const s = Date.now();
    const base = {
      exchange: "NSE" as const, stockName: "Infosys", avgBuyPrice: 1450,
      currentPrice: 1500, pnl: 750, pnlPercent: 3.45, confidence: 1, needsReview: false, source: "generic" as const,
    };
    const holdings: any[] = [
      { ...base, id: "h-1", symbol: "INFY", quantity: 10, investedAmount: 14500, currentValue: 15000 },
      { ...base, id: "h-2", symbol: "INFY", quantity: 5, investedAmount: 7250, currentValue: 7500 },
    ];
    const merged = mergeDuplicates(holdings);
    record("unit", "mergeDuplicates(10+5 INFY) -> 1 holding, qty=15", merged.length === 1 && merged[0].quantity === 15, JSON.stringify(merged.map((h: any) => ({ symbol: h.symbol, qty: h.quantity, invested: h.investedAmount }))), s);
  }

  // checkAutoImportGate
  {
    const s = Date.now();
    const goodVal: any = {
      holdingId: "h-1", warnings: [], errors: [], criticalErrors: [],
      unknownSymbols: [], missingRequiredFields: [], score: 1, confidencePenalty: 0,
    };
    const gate = checkAutoImportGate(
      [{ id: "h-1", symbol: "INFY", stockName: "Infosys", quantity: 15 } as any],
      [goodVal],
      0.97,
    );
    record("unit", "checkAutoImportGate(conf=0.97, no issues) -> canAutoImport=true", gate.canAutoImport && gate.reasons.length === 0, JSON.stringify(gate), s);
  }
  {
    const s = Date.now();
    const badVal: any = {
      holdingId: "h-1", warnings: [], errors: [], criticalErrors: ["Unknown symbol"],
      unknownSymbols: ["FAKE123"], missingRequiredFields: [], score: 0.3, confidencePenalty: 0.5,
    };
    const gate = checkAutoImportGate(
      [{ id: "h-1", symbol: "FAKE123", quantity: 0 } as any],
      [badVal],
      0.4,
    );
    record("unit", "checkAutoImportGate(conf=0.4, unknown symbol) -> canAutoImport=false", !gate.canAutoImport && gate.reasons.length > 0, JSON.stringify(gate), s);
  }

  // computeConfidence
  {
    const s = Date.now();
    const r = computeConfidence({ ocr: 0.95, parser: 0.98, validation: 1.0 });
    const expected = 0.95 * 0.40 + 0.98 * 0.30 + 1.0 * 0.30;
    const ok = approxEq(r.finalScore, expected);
    record("unit", `computeConfidence(0.95/0.98/1.0) = ${r.finalScore.toFixed(4)}`, ok, JSON.stringify(r), s);
  }
  {
    const s = Date.now();
    const r = computeConfidence({ ocr: 0.5, parser: 0.6, validation: 0.7 });
    const expected = 0.5 * 0.40 + 0.6 * 0.30 + 0.7 * 0.30;
    const ok = approxEq(r.finalScore, expected);
    record("unit", `computeConfidence(0.5/0.6/0.7) = ${r.finalScore.toFixed(4)}`, ok, JSON.stringify(r), s);
  }

  // deriveStageScores
  {
    const s = Date.now();
    const holding: any = {
      id: "h-1", stockName: "Infosys", symbol: "INFY", exchange: "NSE",
      quantity: 10, avgBuyPrice: 1450, currentPrice: 1500,
      investedAmount: 14500, currentValue: 15000,
      pnl: 500, pnlPercent: 3.45, confidence: 0.92, needsReview: false, source: "generic",
    };
    const validation = {
      holdingId: "h-1", results: [], warnings: [], errors: [], criticalErrors: [],
      unknownSymbols: [], missingRequiredFields: [], score: 0.8, confidencePenalty: 0.2,
    };
    const stages = deriveStageScores(holding, validation);
    record("unit", "deriveStageScores(conf=0.92, penalty=0.2) -> ocr=0.92 validation=0.8", stages.ocr === 0.92 && approxEq(stages.validation, 0.8), JSON.stringify(stages), s);
  }

  // summarizeValidation
  {
    const s = Date.now();
    const vals: any[] = [
      { holdingId: "h-1", results: [], warnings: ["w1"], errors: ["e1"], criticalErrors: [], unknownSymbols: [], missingRequiredFields: [], score: 0.9, confidencePenalty: 0 },
      { holdingId: "h-2", results: [], warnings: ["w2", "w3"], errors: ["e2"], criticalErrors: ["ce1"], unknownSymbols: ["FAKE"], missingRequiredFields: ["quantity"], score: 0.5, confidencePenalty: 0.5 },
    ];
    const s2 = summarizeValidation(vals);
    record("unit", "summarizeValidation(2 holdings) -> avgValidationScore=0.7", approxEq(s2.avgValidationScore, 0.7) && s2.holdingsValidated === 2, JSON.stringify(s2), s);
  }
}

// ---- Phase 2: API integration tests -----------------------------------------
async function runApiTests() {
  if (!API_BASE) {
    console.log("\n  -- No --api URL provided, skipping API integration tests.");
    console.log("     Pass --api http://localhost:3000 to test the running server.");
    return;
  }

  console.log("\n================================================================================");
  console.log("  API INTEGRATION TESTS");
  console.log("================================================================================\n");

  // Check server health
  const s = Date.now();
  try {
    const resp = await fetch(`${API_BASE}/api/auth/me`, { signal: AbortSignal.timeout(5000) });
    record("api", `Server reachable at ${API_BASE}`, resp.ok, `HTTP ${resp.status}`, s);
  } catch (e: any) {
    record("api", `Server reachable at ${API_BASE}`, false, `Error: ${e.message}`, s);
    console.log("  -- Server not reachable -- skipping remaining API tests.");
    return;
  }

  // Discover test directories
  if (!fs.existsSync(TEST_DATA_DIR)) {
    console.log("  -- No test-data/ directory found.");
    return;
  }

  const dirs = fs.readdirSync(TEST_DATA_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  // Skip known-holdings (internal) and edge (tested separately)
  const testDirs = dirs.filter((d) => d.name !== "known-holdings" && d.name !== "edge-cases");

  for (const dir of testDirs) {
    const caseDir = path.join(TEST_DATA_DIR, dir.name);
    const expectedPath = path.join(caseDir, "expected.json");
    const inputFiles = fs.readdirSync(caseDir).filter(
      (f) => f !== "expected.json" && f !== "expected-holdings.json" && !f.startsWith("."),
    );

    if (inputFiles.length === 0 || !fs.existsSync(expectedPath)) {
      if (VERBOSE) console.log(`  -- ${dir.name}: missing input or expected.json, skipping`);
      continue;
    }

    const inputFile = inputFiles[0];
    const inputPath = path.join(caseDir, inputFile);
    const ext = path.extname(inputFile).toLowerCase();
    const fileType = detectFileType(ext);

    // Skip broker JSON (needs separate API endpoint)
    if (fileType === "broker") {
      if (VERBOSE) console.log(`  -- ${dir.name}: broker JSON test skipped (no broker API endpoint yet)`);
      continue;
    }

    // Skip CSV (client-side parsing) and .txt (not real PDFs) — not server-extractable
    if (fileType === "csv" || ext === ".txt") {
      if (VERBOSE) console.log(`  -- ${dir.name}: ${ext} API test skipped (not server-extractable)`);
      continue;
    }

    const expected = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
    const expectedHoldings: Record<string, unknown>[] = expected.holdings ?? [];
    const ignoreFields: string[] = expected.ignoreFields ?? [];

    const t = Date.now();
    try {
      const form = new FormData();
      const kind = ext === ".csv" ? "csv" : ext === ".xlsx" || ext === ".xls" ? "xlsx" : "pdf";
      form.append("kind", kind);
      form.append("file", new Blob([fs.readFileSync(inputPath)]), inputFile);

      const resp = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(180000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = { error: text }; }
        const category = categorizeFailure(data, text);
        record("api", `${dir.name}: HTTP ${resp.status}`, false, `${data?.error || text}`, t, fileType, category);
        continue;
      }

      const data = await resp.json();
      const actualHoldings: Record<string, unknown>[] = data.holdings ?? [];

      let matchedCount = 0;
      const errors: string[] = [];
      for (const exp of expectedHoldings) {
        const found = actualHoldings.find((a) =>
          partialMatch(a, exp as Record<string, unknown>, ignoreFields),
        );
        if (found) matchedCount++;
        else errors.push(`Missing: ${JSON.stringify(exp)}`);
      }

      const countMatch = actualHoldings.length === expectedHoldings.length;
      const ok = countMatch && matchedCount === expectedHoldings.length;
      if (!ok && !errors.some(e => e.startsWith("Actual:"))) {
        errors.push(`Actual: [${actualHoldings.map((h: any) => `{symbol:${h.symbol},qty:${h.quantity},name:${h.stockName}}`).join("; ")}]`);
      }
      const detail = ok ? "OK" : `${matchedCount}/${expectedHoldings.length} matched, ${actualHoldings.length} extracted`;
      const cat = ok ? undefined : "Holding Mismatch";
      record("api", `${dir.name}: ${matchedCount}/${expectedHoldings.length} holdings matched (${actualHoldings.length} total)`, ok, errors.join("; ") || "OK", t, fileType, cat);
    } catch (e: any) {
      const msg = e.message || String(e);
      const cat = msg.includes("timed out") || msg.includes("abort") ? "Timeout" : "Connection Error";
      record("api", `${dir.name}: error`, false, msg, t, fileType, cat);
    }
  }
}

// ---- Phase 3: Edge case tests ------------------------------------------------
async function runEdgeCaseTests() {
  if (!API_BASE) return; // edge case tests run via API only
  console.log("\n================================================================================");
  console.log("  EDGE CASE TESTS");
  console.log("================================================================================\n");

  const edgeDir = path.join(TEST_DATA_DIR, "edge-cases");
  if (!fs.existsSync(edgeDir)) {
    console.log("  -- No edge-cases/ directory");
    return;
  }

  const dirs = fs.readdirSync(edgeDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dir of dirs) {
    const caseDir = path.join(edgeDir, dir.name);
    const inputPath = path.join(caseDir, "input.csv");
    if (!fs.existsSync(inputPath)) continue;

    const t = Date.now();
    try {
      const form = new FormData();
      form.append("kind", "csv");
      form.append("file", new Blob([fs.readFileSync(inputPath)]), "input.csv");

      const resp = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        record("api", `edge-${dir.name}: OK (graceful handling)`, true, "Server handled gracefully", t, "csv");
      } else {
        const text = await resp.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = {}; }
        const cat = categorizeFailure(data, text);
        record("api", `edge-${dir.name}: HTTP ${resp.status}`, true, `Graceful error: ${data?.error || text}`, t, "csv", cat);
      }
    } catch (e: any) {
      record("api", `edge-${dir.name}: unhandled exception`, false, e.message, t, "csv", "Unhandled Error");
    }
  }
}

// ---- Main runner -------------------------------------------------------------
async function main() {
  console.log("########################################################################");
  console.log("#  Apna Advisor -- Extraction Benchmark Framework                     #");
  console.log("########################################################################");
  console.log(`PID: ${process.pid} | Platform: ${process.platform}`);
  console.log(`Test data dir: ${TEST_DATA_DIR}`);
  console.log(`API: ${API_BASE ?? "(none -- unit tests only)"}`);
  console.log(`Verbose: ${VERBOSE}`);
  console.log(`Report: ${WRITE_REPORT}`);

  await runUnitTests();
  await runApiTests();
  if (API_BASE) await runEdgeCaseTests();

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const unitPassed = results.filter((r) => r.category === "unit" && r.passed).length;
  const unitTotal = results.filter((r) => r.category === "unit").length;
  const apiPassed = results.filter((r) => r.category === "api" && r.passed).length;
  const apiTotal = results.filter((r) => r.category === "api").length;

  console.log("\n================================================================================");
  console.log("  RESULTS");
  console.log("================================================================================\n");
  console.log(`  Unit tests:     ${unitPassed}/${unitTotal} passed`);
  console.log(`  API tests:      ${apiPassed}/${apiTotal} passed`);
  if (apiTotal > 0) {
    const metrics = computePerformanceMetrics();
    for (const m of metrics) {
      console.log(`    ${m.fileType}: ${m.passed}/${m.count} passed (${m.passRate}%) avg ${m.avgDurationMs}ms`);
    }
  }
  console.log(`  ---------------------------------------------`);
  console.log(`  Total:          ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`  Failures:       ${failed}`);
    if (VERBOSE) {
      console.log("\n  Failed tests:");
      for (const r of results.filter((r) => !r.passed)) {
        console.log(`    FAIL  ${r.name}`);
        console.log(`          ${r.details}`);
      }
    }
  }
  console.log(`\n  Duration:       ${((Date.now() - startAll) / 1000).toFixed(1)}s`);
  console.log(`  Accuracy:       ${(passed / total * 100).toFixed(1)}% pass rate`);

  if (WRITE_REPORT) writeReports();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
