import { NextRequest, NextResponse } from "next/server";
import { fetchFundamentals } from "@/lib/opportunity/screener-client";
import { fetchPriceHistory } from "@/lib/opportunity/history";
import { computeTechnical } from "@/lib/opportunity/technical";
import { computeValuation } from "@/lib/opportunity/valuation";
import { computeSubScores } from "@/lib/opportunity/scoring";
import { computeAdvisorScore } from "@/lib/opportunity/advisor";
import { generateReasons } from "@/lib/opportunity/reasons";
import { computeRisk } from "@/lib/opportunity/risk";
import { lookupStock } from "@/lib/enrichment/nse-static";
import type {
  Fundamentals,
  NewsSummary,
  OpportunityAnalysis,
  OpportunityFetchResult,
  OpportunityTag,
  PriceHistory,
  TechnicalSnapshot,
} from "@/types/opportunity";

/**
 * Card 5 orchestrator. For each symbol we fan out fundamentals + price history in
 * parallel, then run the pure compute pipeline (technical -> valuation -> scoring
 * -> advisor -> reasons -> risk) on the results. Missing symbols and per-stage
 * warnings are surfaced so the UI can show them in the drawer / summary strip.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const MAX_WORKERS = 6;
const MAX_SYMBOLS = 200;

const EMPTY_NEWS: NewsSummary = {
  totalCount: 0,
  positiveCount: 0,
  negativeCount: 0,
  neutralCount: 0,
  averageScore: 50,
  headlines: [],
};

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase();
}

function isFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function lastFinite(values: readonly number[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isFinite(values[i])) return values[i];
  }
  return null;
}

function secondLastFinite(values: readonly number[]): number | null {
  let seen = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (isFinite(values[i])) {
      seen++;
      if (seen === 2) return values[i];
    }
  }
  return null;
}

function deriveTags(
  scores: { value: number; quality: number; growth: number; momentum: number; health: number; news: number },
  valuation: { status: "undervalued" | "fair" | "overvalued" },
  fundamentals: Fundamentals | null,
): OpportunityTag[] {
  const tags: OpportunityTag[] = [];
  if (valuation.status === "undervalued") tags.push("cheap");
  if (scores.growth >= 70) tags.push("growth");
  const divY = fundamentals?.divYield ?? 0;
  if (divY >= 0.02) tags.push("dividend");
  if (scores.quality >= 75) tags.push("high-quality");
  const profitGrowth = fundamentals?.profitGrowth ?? null;
  if (profitGrowth != null && profitGrowth > 0.5 && scores.growth < 60) {
    tags.push("turnaround");
  }
  return tags;
}

interface AnalyzeResult {
  analysis: OpportunityAnalysis | null;
  missing: boolean;
  warnings: string[];
}

async function analyzeSymbol(symbol: string, marketCloses: readonly number[] | null): Promise<AnalyzeResult> {
  const yahooSymbol = `${symbol}.NS`;
  const warnings: string[] = [];

  const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T | null> =>
    Promise.race<T | null>([
      p.catch((err) => {
        console.error(`[opportunities] ${label} error for ${symbol}:`, err);
        warnings.push(`${label}-error: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }),
      new Promise<null>((resolve) => setTimeout(() => {
        console.error(`[opportunities] ${label} timeout for ${symbol} after ${ms}ms`);
        warnings.push(`${label}-timeout: exceeded ${ms}ms`);
        resolve(null);
      }, ms)),
    ]);

  const [fundamentals, history] = await Promise.all([
    withTimeout(fetchFundamentals(symbol), 15000, "fetchFundamentals"),
    withTimeout(fetchPriceHistory(yahooSymbol, "1y"), 15000, "fetchPriceHistory"),
  ]);

  if (!fundamentals && !history) {
    return { analysis: null, missing: true, warnings };
  }

  let technical: TechnicalSnapshot | null = null;
  if (history) {
    try {
      technical = computeTechnical(history, marketCloses);
    } catch (err) {
      warnings.push(`technical-error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const currentPrice = history ? lastFinite(history.closes) : null;
  const previousClose = history ? secondLastFinite(history.closes) : null;
  const dayChange =
    currentPrice != null && previousClose != null ? currentPrice - previousClose : null;
  const dayChangePercent =
    dayChange != null && previousClose != null && previousClose !== 0
      ? dayChange / previousClose
      : null;

  const priceForValuation = currentPrice ?? 0;
  const valuation = computeValuation(priceForValuation, fundamentals);
  const scores = computeSubScores(fundamentals, technical, null);
  const verdict = computeAdvisorScore(scores);
  const reasons = generateReasons(scores, valuation, technical, fundamentals, verdict);

  const staticMeta = lookupStock(symbol, fundamentals?.description ?? "");
  const risk = computeRisk(history, staticMeta, undefined);

  const tags = deriveTags(scores, valuation, fundamentals);

  if (fundamentals?.warnings?.length) {
    warnings.push(...fundamentals.warnings);
  }

  const analysis: OpportunityAnalysis = {
    symbol,
    yahooSymbol,
    name: staticMeta?.name ?? symbol,
    sector: staticMeta?.sector ?? null,
    industry: staticMeta?.industry ?? null,
    marketCap: staticMeta?.marketCap ?? null,
    currentPrice: currentPrice ?? 0,
    previousClose,
    dayChange,
    dayChangePercent,
    fundamentals,
    technical,
    valuation,
    scores,
    advisorScore: verdict.score,
    recommendation: verdict.recommendation,
    confidence: verdict.confidence,
    reasons: reasons.reasons,
    hinglish: reasons.hinglish,
    risk,
    news: EMPTY_NEWS,
    tags,
    analyzedAt: Date.now(),
    warnings,
  };

  return { analysis, missing: false, warnings };
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const rawSymbols = Array.isArray((body as { symbols?: unknown })?.symbols)
    ? ((body as { symbols: unknown[] }).symbols as unknown[])
    : [];
  const symbols = Array.from(
    new Set(
      rawSymbols
        .filter((s): s is string => typeof s === "string")
        .map(normalizeSymbol)
        .filter(Boolean),
    ),
  );

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no-symbols" }, { status: 400 });
  }
  if (symbols.length > MAX_SYMBOLS) {
    return NextResponse.json(
      { error: "too-many-symbols", limit: MAX_SYMBOLS, received: symbols.length },
      { status: 400 },
    );
  }

  const analyses: OpportunityAnalysis[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  let marketCloses: number[] | null = null;
  try {
    const niftyHistory = await Promise.race<PriceHistory | null>([
      fetchPriceHistory("^NSEI", "1y").catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
    ]);
    if (niftyHistory && Array.isArray(niftyHistory.closes) && niftyHistory.closes.length > 0) {
      marketCloses = niftyHistory.closes;
    }
  } catch {
    marketCloses = null;
  }
  if (!marketCloses) {
    warnings.push("market-baseline-unavailable: beta values will be null");
  }

  let cursor = 0;
  const worker = async () => {
    while (cursor < symbols.length) {
      const idx = cursor++;
      const sym = symbols[idx];
      try {
        const res = await analyzeSymbol(sym, marketCloses);
        if (res.missing || !res.analysis) {
          missing.push(sym);
        } else {
          analyses.push(res.analysis);
        }
        if (res.warnings.length) {
          for (const w of res.warnings) warnings.push(`${sym}: ${w}`);
        }
      } catch (err) {
        missing.push(sym);
        warnings.push(`${sym}: pipeline-error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const workerCount = Math.min(MAX_WORKERS, symbols.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const result: OpportunityFetchResult = {
    analyses,
    fetchedAt: Date.now(),
    missing,
    warnings,
  };

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "opportunities",
    maxWorkers: MAX_WORKERS,
    maxSymbols: MAX_SYMBOLS,
    maxDurationSeconds: maxDuration,
  });
}
