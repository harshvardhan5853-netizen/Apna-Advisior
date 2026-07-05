"use client";

import * as React from "react";
import type { Holding } from "@/types/portfolio";
import type { LiveQuote, MarketStatus, QuoteMap, QuotesResponse } from "@/lib/live-quotes/types";
import { buildYahooSymbolMap, bareFromYahoo } from "@/lib/live-quotes/yahoo-symbol";
import { getMarketStatus } from "@/lib/live-quotes/market-hours";

export interface UseLiveQuotesOptions {
  /** Enable auto-polling. When false, only the first fetch runs (manual refresh still works). */
  autoRefresh?: boolean;
  /** Poll interval in ms. Default 20000. */
  intervalMs?: number;
  /** Skip the initial fetch entirely (e.g. no holdings yet). */
  enabled?: boolean;
}

export interface UseLiveQuotesResult {
  quotes: QuoteMap;
  /** History of prices per bare symbol for sparklines. Bounded to 40 samples. */
  history: Record<string, number[]>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  marketStatus: MarketStatus;
  missing: string[];
  /** How many holdings we tried to resolve to a Yahoo symbol. */
  resolvedCount: number;
  refresh: () => Promise<void>;
}

const HISTORY_MAX = 40;

// Shallow equality on the fields that actually drive UI. Skipping identity
// change here is what keeps holdings-table rows from re-rendering every 20s
// when Yahoo returns the same numbers between polls (very common outside market hours).
function sameQuote(a: LiveQuote, b: LiveQuote): boolean {
  return (
    a.price === b.price &&
    a.previousClose === b.previousClose &&
    a.open === b.open &&
    a.dayChange === b.dayChange &&
    a.dayChangePercent === b.dayChangePercent &&
    a.marketState === b.marketState &&
    a.quoteTime === b.quoteTime
  );
}

function sameStringList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Poll /api/quotes for the given holdings.
 * Auto-refresh is gated by market status: outside market hours we still fetch once per interval * 6
 * so users see the last close but we don't hammer Yahoo.
 */
export function useLiveQuotes(
  holdings: Array<Pick<Holding, "id" | "symbol" | "stockName" | "exchange">>,
  options: UseLiveQuotesOptions = {},
): UseLiveQuotesResult {
  const { autoRefresh = true, intervalMs = 20_000, enabled = true } = options;

  const [quotes, setQuotes] = React.useState<QuoteMap>({});
  const [history, setHistory] = React.useState<Record<string, number[]>>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [marketStatus, setMarketStatus] = React.useState<MarketStatus>(() => getMarketStatus());
  const [missing, setMissing] = React.useState<string[]>([]);

  // Build the Yahoo symbol map. Memoize on holdings identity + relevant fields.
  const symbolMap = React.useMemo(() => buildYahooSymbolMap(holdings), [holdings]);
  const yahooSymbols = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of Object.values(symbolMap)) set.add(s);
    return Array.from(set);
  }, [symbolMap]);
  const resolvedCount = yahooSymbols.length;

  // Stable request key so we only refetch when the actual set of symbols changes.
  const symbolsKey = React.useMemo(() => yahooSymbols.slice().sort().join(","), [yahooSymbols]);

  const inFlightRef = React.useRef<AbortController | null>(null);
  const hasFetchedRef = React.useRef<boolean>(false);

  const doFetch = React.useCallback(
    async (opts: { silent: boolean }) => {
      if (!enabled || yahooSymbols.length === 0) {
        setQuotes({});
        setLoading(false);
        setRefreshing(false);
        return;
      }
      // Cancel any inflight request
      inFlightRef.current?.abort();
      const ctrl = new AbortController();
      inFlightRef.current = ctrl;

      if (!hasFetchedRef.current) setLoading(true);
      if (opts.silent && hasFetchedRef.current) setRefreshing(true);
      setError(null);

      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: yahooSymbols }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${detail.slice(0, 120)}`);
        }
        const body = (await res.json()) as QuotesResponse;
        if (body.error && !body.quotes?.length) {
          throw new Error(body.error);
        }

        // Merge only changed quotes into the map so consumers that use
        // React.memo or shallow equality don't re-render every 20s when
        // the payload is identical to the last poll.
        setQuotes((prev) => {
          const incoming = body.quotes ?? [];
          const next: QuoteMap = { ...prev };
          let changed = false;
          for (const q of incoming) {
            const existing = prev[q.symbol];
            if (!existing || !sameQuote(existing, q)) {
              next[q.symbol] = q;
              changed = true;
            }
          }
          // Drop symbols the server no longer returned.
          const nextKeys = new Set(incoming.map((q) => q.symbol));
          for (const key of Object.keys(prev)) {
            if (!nextKeys.has(key)) {
              delete next[key];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setMissing((prev) => {
          const nextMissing = (body.missing ?? []).map((s) => bareFromYahoo(s));
          return sameStringList(prev, nextMissing) ? prev : nextMissing;
        });
        const nextStatus = body.marketState ?? getMarketStatus();
        setMarketStatus((prev) => (prev === nextStatus ? prev : nextStatus));
        setLastUpdated(body.fetchedAt ?? Date.now());

        // Update sparkline history — only append when price actually changed and is a number.
        setHistory((prev) => {
          const next: Record<string, number[]> = { ...prev };
          for (const q of body.quotes ?? []) {
            if (typeof q.price !== "number" || !Number.isFinite(q.price)) continue;
            const existing = next[q.symbol] ?? [];
            const last = existing[existing.length - 1];
            if (last === q.price) {
              next[q.symbol] = existing; // no-op sample
              continue;
            }
            const trimmed = existing.length >= HISTORY_MAX ? existing.slice(existing.length - HISTORY_MAX + 1) : existing;
            next[q.symbol] = [...trimmed, q.price];
          }
          return next;
        });

        hasFetchedRef.current = true;
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, yahooSymbols],
  );

  // Kick off the first fetch + set up polling
  React.useEffect(() => {
    // Reset when symbols change identity
    hasFetchedRef.current = false;
    setHistory({});
    if (!enabled || yahooSymbols.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }

    void doFetch({ silent: false });

    if (!autoRefresh) return;

    // Slow down polling outside market hours: 6x interval when closed, keep tight during open.
    const status = getMarketStatus();
    const effectiveInterval = status === "open" || status === "pre-open" ? intervalMs : Math.max(intervalMs * 6, 60_000);

    // Tab-visibility gate: don't poll when the tab is hidden. Resume immediately
    // on focus so the user sees fresh data when they come back.
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void doFetch({ silent: true });
    };
    const timer = window.setInterval(tick, effectiveInterval);
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void doFetch({ silent: true });
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      inFlightRef.current?.abort();
    };
    // We intentionally depend on the stable symbolsKey and options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, enabled, autoRefresh, intervalMs]);

  // Refresh market status every 30s so the pill updates around session boundaries.
  React.useEffect(() => {
    const t = window.setInterval(() => {
      const next = getMarketStatus();
      setMarketStatus((prev) => (prev === next ? prev : next));
    }, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const refresh = React.useCallback(async () => {
    await doFetch({ silent: true });
  }, [doFetch]);

  return {
    quotes,
    history,
    loading,
    refreshing,
    error,
    lastUpdated,
    marketStatus,
    missing,
    resolvedCount,
    refresh,
  };
}

/** Utility: given a holding, look up its live quote (or null). */
export function getQuoteForHolding(
  quotes: QuoteMap,
  holding: Pick<Holding, "symbol" | "stockName">,
  symbolMap: Record<string, string> | null = null,
): LiveQuote | null {
  // If the caller passes a symbol map keyed by holding.id we could use it, but the simpler path:
  // resolve on the fly from holding.symbol / stockName via the same logic used when we built the request.
  const sym = holding.symbol?.toUpperCase();
  if (sym && quotes[sym]) return quotes[sym];
  // Fallback: try a scan by displayName match — cheap because quote count is small.
  const name = (holding.stockName ?? "").toLowerCase();
  if (!name) return null;
  for (const q of Object.values(quotes)) {
    const display = (q.displayName ?? "").toLowerCase();
    if (display && name.includes(display.split(" ")[0])) return q;
  }
  void symbolMap;
  return null;
}
