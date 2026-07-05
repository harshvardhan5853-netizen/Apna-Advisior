import type { PriceHistory } from "@/types/opportunity";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_CHART_FALLBACK = "https://query2.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 10000;

type HistoryRange = "1y" | "6mo" | "3mo" | "1mo";

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      close?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
  meta?: {
    symbol?: string;
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

async function fetchOneHost(base: string, symbol: string, range: HistoryRange): Promise<YahooChartResult | null> {
  const url = `${base}/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChartEnvelope;
    const result = json.chart?.result?.[0];
    if (!result) return null;
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch daily OHLCV bars for a Yahoo-formatted symbol (e.g. RELIANCE.NS).
 * Returns null when both query1 and query2 fail or no usable data.
 */
export async function fetchPriceHistory(
  yahooSymbol: string,
  range: HistoryRange = "1y",
): Promise<PriceHistory | null> {
  const symbol = yahooSymbol.trim();
  if (!symbol) return null;

  let result = await fetchOneHost(YAHOO_CHART_BASE, symbol, range);
  if (!result) result = await fetchOneHost(YAHOO_CHART_FALLBACK, symbol, range);
  if (!result) return null;

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return null;

  const closes = quote.close ?? [];
  const highs = quote.high ?? [];
  const lows = quote.low ?? [];
  const volumes = quote.volume ?? [];

  const outT: number[] = [];
  const outC: number[] = [];
  const outH: number[] = [];
  const outL: number[] = [];
  const outV: number[] = [];

  const len = Math.min(timestamps.length, closes.length, highs.length, lows.length);
  for (let i = 0; i < len; i++) {
    const t = timestamps[i];
    const c = closes[i];
    const h = highs[i];
    const l = lows[i];
    if (!Number.isFinite(t) || !Number.isFinite(c ?? NaN) || !Number.isFinite(h ?? NaN) || !Number.isFinite(l ?? NaN)) {
      continue;
    }
    const v = volumes[i];
    outT.push(t * 1000); // seconds -> ms
    outC.push(c as number);
    outH.push(h as number);
    outL.push(l as number);
    outV.push(Number.isFinite(v ?? NaN) ? (v as number) : 0);
  }

  if (outC.length === 0) return null;

  return {
    timestamps: outT,
    closes: outC,
    highs: outH,
    lows: outL,
    volumes: outV,
  };
}
