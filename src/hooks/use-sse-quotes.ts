"use client";

import * as React from "react";
import type { Holding } from "@/types/portfolio";
import type { LiveQuote, MarketStatus, QuoteMap, QuotesResponse } from "@/lib/live-quotes/types";
import { buildYahooSymbolMap, bareFromYahoo } from "@/lib/live-quotes/yahoo-symbol";
import { getMarketStatus } from "@/lib/live-quotes/market-hours";

export interface UseSseQuotesResult {
  quotes: QuoteMap;
  history: Record<string, number[]>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  marketStatus: MarketStatus;
  missing: string[];
  resolvedCount: number;
  refresh: () => void;
}

const HISTORY_MAX = 40;
const RECONNECT_DELAY_MS = 3_000;

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

/**
 * Subscribe to real-time quote updates via SSE (Server-Sent Events).
 * Connects to /api/quotes/stream?symbols=... with automatic reconnection
 * and falls back to the values last pushed by the server.
 */
export function useSseQuotes(
  holdings: Array<Pick<Holding, "id" | "symbol" | "stockName" | "exchange">>,
): UseSseQuotesResult {
  const [quotes, setQuotes] = React.useState<QuoteMap>({});
  const [history, setHistory] = React.useState<Record<string, number[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [marketStatus, setMarketStatus] = React.useState<MarketStatus>(() => getMarketStatus());
  const [missing, setMissing] = React.useState<string[]>([]);

  const symbolMap = React.useMemo(() => buildYahooSymbolMap(holdings), [holdings]);
  const yahooSymbols = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of Object.values(symbolMap)) set.add(s);
    return Array.from(set);
  }, [symbolMap]);
  const resolvedCount = yahooSymbols.length;
  const symbolsKey = React.useMemo(() => yahooSymbols.slice().sort().join(","), [yahooSymbols]);

  const reconnectRef = React.useRef<() => void>(() => {});
  const cancelledRef = React.useRef(false);

  React.useEffect(() => {
    if (yahooSymbols.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      cancelledRef.current = false;
      const url = `/api/quotes/stream?symbols=${encodeURIComponent(symbolsKey)}`;
      const source = new EventSource(url);

      source.onopen = () => {
        if (cancelledRef.current) { source.close(); return; }
        setLoading(false);
      };

      source.onmessage = (event: MessageEvent) => {
        if (cancelledRef.current) return;
        try {
          const body = JSON.parse(event.data) as QuotesResponse;
          if (body.error && !body.quotes?.length) {
            setError(body.error);
            return;
          }

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
            const nextKeys = new Set(incoming.map((q) => q.symbol));
            for (const key of Object.keys(prev)) {
              if (!nextKeys.has(key)) { delete next[key]; changed = true; }
            }
            return changed ? next : prev;
          });

          setMissing((prev) => {
            const nextMissing = (body.missing ?? []).map((s) => bareFromYahoo(s));
            if (prev.length === nextMissing.length && prev.every((v, i) => v === nextMissing[i])) return prev;
            return nextMissing;
          });

          const nextStatus = body.marketState ?? getMarketStatus();
          setMarketStatus((prev) => (prev === nextStatus ? prev : nextStatus));
          setLastUpdated(body.fetchedAt ?? Date.now());

          setHistory((prev) => {
            const next: Record<string, number[]> = { ...prev };
            let changed = false;
            for (const q of body.quotes ?? []) {
              if (typeof q.price !== "number" || !Number.isFinite(q.price)) continue;
              const existing = next[q.symbol] ?? [];
              const last = existing[existing.length - 1];
              if (last === q.price) continue;
              const trimmed = existing.length >= HISTORY_MAX ? existing.slice(existing.length - HISTORY_MAX + 1) : existing;
              next[q.symbol] = [...trimmed, q.price];
              changed = true;
            }
            return changed ? next : prev;
          });
        } catch {
          // JSON parse error — ignore malformed events
        }
      };

      source.onerror = () => {
        source.close();
        if (!cancelledRef.current) {
          setError("Connection lost, reconnecting…");
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    reconnectRef.current = () => {
      cancelledRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      cancelledRef.current = false;
      connect();
    };

    connect();

    // Also refresh market status pill every 30s
    const marketTimer = window.setInterval(() => {
      const next = getMarketStatus();
      setMarketStatus((prev) => (prev === next ? prev : next));
    }, 30_000);

    return () => {
      cancelledRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(marketTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const refresh = React.useCallback(() => {
    reconnectRef.current();
  }, []);

  return {
    quotes,
    history,
    loading: loading && yahooSymbols.length > 0,
    refreshing: false,
    error,
    lastUpdated,
    marketStatus,
    missing,
    resolvedCount,
    refresh,
  };
}
