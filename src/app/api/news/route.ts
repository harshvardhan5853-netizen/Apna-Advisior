import { NextResponse } from "next/server";
import type {
  AnalyzedNewsArticle,
  NewsFetchResult,
  RawNewsArticle,
} from "@/types/news";
import type { Holding } from "@/types/portfolio";
import {
  buildPortfolioQuerySets,
  attributeArticleToStocks,
} from "@/lib/news/query-builder";
import { fetchQueriesInParallel } from "@/lib/news/rss-parser";
import { dedupeArticles } from "@/lib/news/dedupe";
import { analyzeBatch, pingGemini } from "@/lib/news/gemini";
import { getCachedRss, setCachedRss, inspectCacheStats } from "@/lib/news/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ARTICLES_TO_ANALYZE = 40; // keep total Gemini spend bounded per request
const DEFAULT_TIMEFRAME_DAYS = 30;

interface PostBody {
  holdings?: Holding[];
  geminiApiKey?: string | null;
  model?: string;
  timeframeDays?: number;
  ping?: boolean;
}

function bad(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/news",
    ...inspectCacheStats(),
  });
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return bad(400, { error: "invalid-json" });
  }

  // Diagnostic ping: validate a Gemini key without touching news pipeline.
  if (body.ping) {
    if (!body.geminiApiKey || typeof body.geminiApiKey !== "string") {
      return bad(400, { error: "missing-key" });
    }
    try {
      await pingGemini(body.geminiApiKey, body.model);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return bad(400, { error: "key-invalid", detail: message });
    }
  }

  const holdings = Array.isArray(body.holdings) ? body.holdings : [];
  if (holdings.length === 0) {
    const empty: NewsFetchResult = {
      articles: [],
      fetchedAt: Date.now(),
      emptySymbols: [],
      unresolvedSymbols: [],
      llmEnabled: false,
      warnings: ["No holdings supplied."],
    };
    return NextResponse.json(empty);
  }

  const { sets, unresolved } = buildPortfolioQuerySets(holdings);
  if (sets.length === 0) {
    const empty: NewsFetchResult = {
      articles: [],
      fetchedAt: Date.now(),
      emptySymbols: unresolved,
      unresolvedSymbols: unresolved,
      llmEnabled: false,
      warnings: ["Could not resolve any of your holdings to news queries."],
    };
    return NextResponse.json(empty);
  }

  // Build the flat query list: each stock contributes 1-3 queries.
  const flatQueries = sets.flatMap((set) =>
    set.queries.map((query) => ({ symbolKey: set.key, query })),
  );

  const timeframeDays = clampTimeframe(body.timeframeDays);
  const warnings: string[] = [];

  const cacheKey = `${timeframeDays}:${flatQueries.map((fq) => fq.query).sort().join("|")}`;
  const cached = getCachedRss(cacheKey);
  if (cached) {
    return NextResponse.json(await buildResponse(cached, sets, unresolved, body, warnings, timeframeDays));
  }

  let raw: RawNewsArticle[] = [];
  try {
    const result = await fetchQueriesInParallel(flatQueries, 4);
    raw = result.articles;
    warnings.push(...result.warnings);
    setCachedRss(cacheKey, raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return bad(502, { error: "news-fetch-failed", detail: message });
  }

  return NextResponse.json(await buildResponse(raw, sets, unresolved, body, warnings, timeframeDays));
}

async function buildResponse(
  raw: RawNewsArticle[],
  sets: ReturnType<typeof buildPortfolioQuerySets>["sets"],
  unresolved: string[],
  body: PostBody,
  warnings: string[],
  timeframeDays: number,
): Promise<NewsFetchResult> {
  const cutoff = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
  const withinWindow = raw.filter((a) => a.publishedAt >= cutoff);
  const attributed = withinWindow.map((article) => {
    const derived = attributeArticleToStocks(article.title, article.snippet, sets);
    const merged = Array.from(new Set([...article.matchedSymbols, ...derived].map((s) => s.toUpperCase())));
    return { ...article, matchedSymbols: merged };
  });
  const relevant = attributed.filter((a) => a.matchedSymbols.length > 0);
  const deduped = dedupeArticles(relevant);
  const emptySymbols = sets.map((s) => s.key).filter((key) => !deduped.some((a) => a.matchedSymbols.includes(key)));
  const analyzedArticles: AnalyzedNewsArticle[] = deduped.map((a) => ({ ...a, analysis: null }));
  const apiKey = typeof body.geminiApiKey === "string" ? body.geminiApiKey.trim() : "";
  const llmEnabled = apiKey.length >= 20;
  if (llmEnabled && analyzedArticles.length > 0) {
    const portfolioSymbols = sets.map((s) => s.key);
    const toAnalyze = analyzedArticles.slice(0, MAX_ARTICLES_TO_ANALYZE);
    if (analyzedArticles.length > MAX_ARTICLES_TO_ANALYZE) {
      warnings.push(`Only the ${MAX_ARTICLES_TO_ANALYZE} most recent articles were analyzed to stay within Gemini quota.`);
    }
    const batchInput = toAnalyze.map((article) => ({
      article,
      assign(analysis: typeof article.analysis, error?: string) { article.analysis = analysis; if (analysis === null) { article.analysisFailed = true; article.analysisError = error; } },
    }));
    try {
      const result = await analyzeBatch(batchInput, { apiKey, model: body.model, portfolioSymbols, concurrency: 4 });
      if (result.failed > 0) warnings.push(`Gemini analysis failed for ${result.failed} article(s): ${result.errors.join("; ")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`Gemini batch aborted: ${message}`);
    }
  }
  return { articles: analyzedArticles, fetchedAt: Date.now(), emptySymbols, unresolvedSymbols: unresolved, llmEnabled, warnings };
}

function clampTimeframe(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEFRAME_DAYS;
  if (n > 365) return 365;
  return Math.round(n);
}
