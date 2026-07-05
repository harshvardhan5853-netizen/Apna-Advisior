import { NextResponse } from "next/server";
import { fetchPriceHistory } from "@/lib/opportunity/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Portfolio-value time series: fetch 1y daily bars for every holding and
// aggregate into a single "sum of qty × close" curve. Also pulls ^NSEI so
// downstream analytics (Sharpe/Sortino/alpha/beta) can consume market
// returns without a second round-trip.

const CACHE_TTL_MS = 5 * 60_000;
const MAX_SYMBOLS = 60;

interface HoldingInput {
  symbol: string;
  quantity: number;
}

interface HistoryPoint {
  t: number; // ms epoch (start of day)
  value: number;
  invested: number; // constant total-invested baseline for the row
}

interface PortfolioHistoryResponse {
  series: HistoryPoint[];
  marketReturns: number[]; // daily fractional returns for ^NSEI aligned to series
  resolvedCount: number;
  missing: string[];
  fetchedAt: number;
}

type CacheEntry = { at: number; body: PortfolioHistoryResponse };
const cache = new Map<string, CacheEntry>();

interface RequestBody {
  holdings?: unknown;
  invested?: unknown;
}

function parseHoldings(input: unknown): HoldingInput[] {
  if (!Array.isArray(input)) return [];
  const out: HoldingInput[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as { symbol?: unknown; quantity?: unknown };
    const symbol = typeof obj.symbol === "string" ? obj.symbol.trim().toUpperCase() : "";
    const qty = typeof obj.quantity === "number" && Number.isFinite(obj.quantity) ? obj.quantity : 0;
    if (!symbol || qty <= 0 || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({ symbol, quantity: qty });
    if (out.length >= MAX_SYMBOLS) break;
  }
  return out;
}

function yahooSymbol(bare: string): string {
  return bare.includes(".") ? bare : `${bare}.NS`;
}

/** Group timestamps into day-of-year bucket key for alignment across symbols. */
function dayKey(msEpoch: number): number {
  return Math.floor(msEpoch / 86_400_000);
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const holdings = parseHoldings(body.holdings);
  const invested = typeof body.invested === "number" && Number.isFinite(body.invested) ? body.invested : 0;

  if (holdings.length === 0) {
    const empty: PortfolioHistoryResponse = {
      series: [],
      marketReturns: [],
      resolvedCount: 0,
      missing: [],
      fetchedAt: Date.now(),
    };
    return NextResponse.json(empty);
  }

  const cacheKey = `${invested}::${holdings
    .map((h) => `${h.symbol}:${h.quantity}`)
    .sort()
    .join(",")}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.body);
  }

  const symbols = holdings.map((h) => yahooSymbol(h.symbol));

  // Fetch all price histories + NIFTY in parallel.
  const [priceHistories, niftyHistory] = await Promise.all([
    Promise.all(symbols.map((s) => fetchPriceHistory(s, "1y"))),
    fetchPriceHistory("^NSEI", "1y"),
  ]);

  const missing: string[] = [];
  const resolvedByDay = new Map<number, { value: number; contributors: number }>();

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const hist = priceHistories[i];
    if (!hist) {
      missing.push(h.symbol);
      continue;
    }
    const len = Math.min(hist.timestamps.length, hist.closes.length);
    for (let j = 0; j < len; j++) {
      const key = dayKey(hist.timestamps[j]);
      const contribution = hist.closes[j] * h.quantity;
      const bucket = resolvedByDay.get(key);
      if (bucket) {
        bucket.value += contribution;
        bucket.contributors += 1;
      } else {
        resolvedByDay.set(key, { value: contribution, contributors: 1 });
      }
    }
  }

  const resolvedCount = holdings.length - missing.length;

  // Keep only days where every resolved symbol contributed — avoids the
  // step-function artifacts you get when Yahoo returns a different trading
  // day list for one stock.
  const alignedKeys = Array.from(resolvedByDay.entries())
    .filter(([, v]) => v.contributors === resolvedCount)
    .map(([k]) => k)
    .sort((a, b) => a - b);

  const series: HistoryPoint[] = alignedKeys.map((k) => {
    const bucket = resolvedByDay.get(k);
    return {
      t: k * 86_400_000,
      value: bucket ? bucket.value : 0,
      invested,
    };
  });

  // Align market returns to the same trading days when possible.
  let marketReturns: number[] = [];
  if (niftyHistory && alignedKeys.length >= 2) {
    const niftyByDay = new Map<number, number>();
    const nlen = Math.min(niftyHistory.timestamps.length, niftyHistory.closes.length);
    for (let i = 0; i < nlen; i++) {
      niftyByDay.set(dayKey(niftyHistory.timestamps[i]), niftyHistory.closes[i]);
    }
    let prev: number | null = null;
    for (const k of alignedKeys) {
      const close = niftyByDay.get(k);
      if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) {
        prev = null;
        continue;
      }
      if (prev != null && prev > 0) {
        marketReturns.push(close / prev - 1);
      }
      prev = close;
    }
  }

  const response: PortfolioHistoryResponse = {
    series,
    marketReturns,
    resolvedCount,
    missing,
    fetchedAt: now,
  };

  if (series.length > 0) cache.set(cacheKey, { at: now, body: response });
  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    cacheTtlMs: CACHE_TTL_MS,
    cachedKeys: cache.size,
  });
}
