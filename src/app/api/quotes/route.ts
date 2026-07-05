import { NextResponse } from "next/server";
import type { LiveQuote, QuotesResponse } from "@/lib/live-quotes/types";
import { normalizeMarketState } from "@/lib/live-quotes/market-hours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Yahoo Finance v7/quote requires a crumb/cookie since May 2024 (returns 401 without it).
// The v8/chart endpoint remains free and stable — we hit it per-symbol in parallel.
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_CHART_FALLBACK = "https://query2.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CACHE_TTL_MS = 15_000;
const MAX_SYMBOLS = 60;
const FETCH_TIMEOUT_MS = 8_000;

/** In-memory cache keyed by sorted-symbols string. */
type CacheEntry = { at: number; body: QuotesResponse };
const cache = new Map<string, CacheEntry>();

interface YahooChartMeta {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
  marketState?: string;
  currency?: string;
}

interface YahooChartResult {
  meta?: YahooChartMeta;
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      close?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
    }>;
  };
}

interface YahooChartEnvelope {
  chart?: {
    result?: YahooChartResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function firstNumber(arr: (number | null)[] | undefined): number | null {
  if (!arr) return null;
  for (const v of arr) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function normalize(yahooSymbol: string, result: YahooChartResult): LiveQuote {
  const meta = result.meta ?? {};
  const dot = yahooSymbol.indexOf(".");
  const bare = dot === -1 ? yahooSymbol : yahooSymbol.slice(0, dot);
  const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
  const previousClose =
    typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
        ? meta.previousClose
        : null;
  const open = firstNumber(result.indicators?.quote?.[0]?.open);
  const dayChange = price != null && previousClose != null ? price - previousClose : null;
  const dayChangePercent =
    price != null && previousClose && previousClose > 0 ? (price - previousClose) / previousClose : null;
  return {
    yahooSymbol,
    symbol: bare.toUpperCase(),
    displayName: meta.shortName ?? meta.longName ?? null,
    price,
    open,
    previousClose,
    dayChange,
    dayChangePercent,
    currency: meta.currency ?? null,
    marketState: meta.marketState ?? null,
    quoteTime: meta.regularMarketTime ?? null,
  };
}

async function fetchOneSymbol(symbol: string): Promise<LiveQuote | null> {
  const path = `${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  let res: Response;
  try {
    res = await fetchWithTimeout(`${YAHOO_CHART_BASE}/${path}`, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      // Try the fallback host once.
      res = await fetchWithTimeout(`${YAHOO_CHART_FALLBACK}/${path}`, FETCH_TIMEOUT_MS);
    }
  } catch {
    try {
      res = await fetchWithTimeout(`${YAHOO_CHART_FALLBACK}/${path}`, FETCH_TIMEOUT_MS);
    } catch {
      return null;
    }
  }
  if (!res.ok) return null;
  let json: YahooChartEnvelope;
  try {
    json = (await res.json()) as YahooChartEnvelope;
  } catch {
    return null;
  }
  const result = json.chart?.result?.[0];
  if (!result || !result.meta) return null;
  return normalize(symbol, result);
}

async function fetchYahoo(symbols: string[]): Promise<{ quotes: LiveQuote[]; upstreamMarketState: string | null }> {
  const settled = await Promise.all(symbols.map((s) => fetchOneSymbol(s)));
  const quotes = settled.filter((q): q is LiveQuote => q !== null);
  const upstreamMarketState = quotes.find((q) => q.marketState)?.marketState ?? null;
  return { quotes, upstreamMarketState };
}

interface RequestBody {
  symbols?: unknown;
}

function parseSymbols(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const withSuffix = trimmed.includes(".") ? trimmed.toUpperCase() : `${trimmed.toUpperCase()}.NS`;
    if (seen.has(withSuffix)) continue;
    seen.add(withSuffix);
    out.push(withSuffix);
    if (out.length >= MAX_SYMBOLS) break;
  }
  return out;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const symbols = parseSymbols(body.symbols);
  if (symbols.length === 0) {
    const empty: QuotesResponse = {
      quotes: [],
      marketState: normalizeMarketState(null),
      fetchedAt: Date.now(),
      missing: [],
    };
    return NextResponse.json(empty);
  }

  const cacheKey = symbols.slice().sort().join(",");
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.body);
  }

  try {
    const { quotes, upstreamMarketState } = await fetchYahoo(symbols);
    const found = new Set(quotes.map((q) => q.yahooSymbol.toUpperCase()));
    const missing = symbols.filter((s) => !found.has(s.toUpperCase()));
    const response: QuotesResponse = {
      quotes,
      marketState: normalizeMarketState(upstreamMarketState),
      fetchedAt: now,
      missing,
    };
    // Only cache when we got at least one quote — otherwise let the client retry.
    if (quotes.length > 0) cache.set(cacheKey, { at: now, body: response });
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (hit) {
      return NextResponse.json({ ...hit.body, error: `stale: ${message}` });
    }
    return NextResponse.json({ error: `upstream-failed: ${message}` }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    upstream: YAHOO_CHART_BASE,
    cacheTtlMs: CACHE_TTL_MS,
    cachedKeys: cache.size,
  });
}
