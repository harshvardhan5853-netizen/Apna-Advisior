import { normalizeMarketState } from "@/lib/live-quotes/market-hours";
import type { LiveQuote, QuotesResponse } from "@/lib/live-quotes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REFRESH_MS = 10_000;
const MAX_SYMBOLS = 60;
const FETCH_TIMEOUT_MS = 8_000;

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_CHART_FALLBACK = "https://query2.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

interface YahooChartMeta { symbol?: string; shortName?: string; longName?: string; regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketDayHigh?: number; regularMarketDayLow?: number; regularMarketVolume?: number; regularMarketTime?: number; marketState?: string; currency?: string }
interface YahooChartResult { meta?: YahooChartMeta; indicators?: { quote?: Array<{ open?: (number | null)[]; close?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[] }> } }
interface YahooChartEnvelope { chart?: { result?: YahooChartResult[] | null; error?: { code?: string; description?: string } | null } }

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "GET", headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "en-US,en;q=0.9" }, cache: "no-store", signal: controller.signal });
  } finally { clearTimeout(timer); }
}

function firstNumber(arr: (number | null)[] | undefined): number | null {
  if (!arr) return null;
  for (const v of arr) { if (typeof v === "number" && Number.isFinite(v)) return v; }
  return null;
}

function normalize(yahooSymbol: string, result: YahooChartResult): LiveQuote {
  const meta = result.meta ?? {};
  const dot = yahooSymbol.indexOf(".");
  const bare = dot === -1 ? yahooSymbol : yahooSymbol.slice(0, dot);
  const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
  const previousClose = typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : typeof meta.previousClose === "number" ? meta.previousClose : null;
  const open = firstNumber(result.indicators?.quote?.[0]?.open);
  const dayChange = price != null && previousClose != null ? price - previousClose : null;
  const dayChangePercent = price != null && previousClose && previousClose > 0 ? (price - previousClose) / previousClose : null;
  return { yahooSymbol, symbol: bare.toUpperCase(), displayName: meta.shortName ?? meta.longName ?? null, price, open, previousClose, dayChange, dayChangePercent, currency: meta.currency ?? null, marketState: meta.marketState ?? null, quoteTime: meta.regularMarketTime ?? null };
}

async function fetchOneSymbol(symbol: string): Promise<LiveQuote | null> {
  const path = `${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  let res: Response;
  try { res = await fetchWithTimeout(`${YAHOO_CHART_BASE}/${path}`, FETCH_TIMEOUT_MS); if (!res.ok) res = await fetchWithTimeout(`${YAHOO_CHART_FALLBACK}/${path}`, FETCH_TIMEOUT_MS); }
  catch { try { res = await fetchWithTimeout(`${YAHOO_CHART_FALLBACK}/${path}`, FETCH_TIMEOUT_MS); } catch { return null; } }
  if (!res.ok) return null;
  let json: YahooChartEnvelope;
  try { json = (await res.json()) as YahooChartEnvelope; } catch { return null; }
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

function parseSymbols(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw.split(",")) {
    const trimmed = s.trim().toUpperCase();
    if (!trimmed) continue;
    const withSuffix = trimmed.includes(".") ? trimmed : `${trimmed}.NS`;
    if (seen.has(withSuffix)) continue;
    seen.add(withSuffix);
    out.push(withSuffix);
    if (out.length >= MAX_SYMBOLS) break;
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get("symbols") || "";
  const symbols = parseSymbols(rawSymbols);

  if (symbols.length === 0) {
    return new Response("Missing or invalid symbols parameter", { status: 400 });
  }

  let closed = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const { quotes, upstreamMarketState } = await fetchYahoo(symbols);
          const found = new Set(quotes.map((q) => q.yahooSymbol.toUpperCase()));
          const missing = symbols.filter((s) => !found.has(s.toUpperCase()));
          const payload: QuotesResponse = { quotes, marketState: normalizeMarketState(upstreamMarketState), fetchedAt: Date.now(), missing };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // keep-alive — send empty event to prevent timeout
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        }
      };

      // Push initial data immediately
      send();

      interval = setInterval(send, REFRESH_MS);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
