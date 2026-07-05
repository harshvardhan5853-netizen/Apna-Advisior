import { NextRequest, NextResponse } from "next/server";
import { fetchFundamentals } from "@/lib/opportunity/screener-client";
import type { Fundamentals } from "@/types/opportunity";

/**
 * POST /api/fundamentals — batch-fetches Screener.in fundamentals for a list of
 * NSE symbols. Rate-limited worker pool (concurrency = 5); screener-client
 * itself enforces a 200 ms min interval per request, so this stays polite.
 *
 * Body: { symbols: string[] }  (max 200; deduped + uppercased on the way in)
 *
 * Response:
 *   {
 *     fundamentals: Record<symbolUpper, Fundamentals>,
 *     missing: string[],                          // symbols that returned null
 *     errors:  Array<{ symbol, message }>,        // symbols that threw
 *     fetchedAt: number,
 *   }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_WORKERS = 5;
const MAX_SYMBOLS = 200;

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const raw = (body as { symbols?: unknown })?.symbols;
  const symbols = Array.isArray(raw) ? raw.map((s) => String(s)) : [];
  if (symbols.length === 0) {
    return NextResponse.json({ error: "no-symbols" }, { status: 400 });
  }
  if (symbols.length > MAX_SYMBOLS) {
    return NextResponse.json(
      { error: "too-many-symbols", limit: MAX_SYMBOLS },
      { status: 400 },
    );
  }

  const deduped = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
  );

  const fundamentals: Record<string, Fundamentals> = {};
  const missing: string[] = [];
  const errors: Array<{ symbol: string; message: string }> = [];

  // Worker pool. Cursor-based dispatch keeps concurrency at MAX_WORKERS
  // without needing a queue library. Order of completion doesn't matter —
  // results are keyed by symbol.
  const FETCH_TIMEOUT_MS = 15000;
  const withTimeout = <T>(p: Promise<T>, ms: number, sym: string): Promise<T | null> =>
    Promise.race<T | null>([
      p.catch((err) => {
        console.error(`[fundamentals] fetchFundamentals error for ${sym}:`, err);
        errors.push({
          symbol: sym,
          message: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.error(`[fundamentals] fetchFundamentals timeout for ${sym} after ${ms}ms`);
          errors.push({ symbol: sym, message: `timeout: exceeded ${ms}ms` });
          resolve(null);
        }, ms),
      ),
    ]);

  let cursor = 0;
  async function worker() {
    while (cursor < deduped.length) {
      const sym = deduped[cursor++];
      const result = await withTimeout(fetchFundamentals(sym), FETCH_TIMEOUT_MS, sym);
      if (result) {
        fundamentals[sym] = result;
      } else {
        missing.push(sym);
      }
    }
  }

  const workerCount = Math.min(MAX_WORKERS, deduped.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return NextResponse.json({
    fundamentals,
    missing,
    errors,
    fetchedAt: Date.now(),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "fundamentals",
    maxWorkers: MAX_WORKERS,
    maxSymbols: MAX_SYMBOLS,
  });
}
