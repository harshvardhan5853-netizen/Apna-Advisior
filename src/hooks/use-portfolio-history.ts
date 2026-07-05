"use client";

import * as React from "react";
import type { CombinedHolding } from "@/types/portfolio";

// Portfolio-value time series pulled from Yahoo (1y daily bars per holding,
// aggregated as sum of qty × close). Cached client-side for the session so
// switching between Snapshot/Live/analytics tabs doesn't re-fetch.

export interface PortfolioHistoryPoint {
  t: number;
  value: number;
  invested: number;
}

export interface UsePortfolioHistoryResult {
  series: PortfolioHistoryPoint[];
  marketReturns: number[];
  loading: boolean;
  error: string | null;
  resolvedCount: number;
  missing: string[];
  lastFetchedAt: number | null;
  refresh: () => Promise<void>;
}

interface RawResponse {
  series?: Array<{ t?: number; value?: number; invested?: number }>;
  marketReturns?: number[];
  resolvedCount?: number;
  missing?: string[];
  fetchedAt?: number;
  error?: string;
}

function buildKey(holdings: readonly CombinedHolding[], invested: number): string {
  const parts: string[] = [];
  for (const h of holdings) {
    const sym = (h.symbol ?? h.stockName ?? "").trim().toUpperCase();
    const qty = typeof h.quantity === "number" ? h.quantity : 0;
    if (!sym || qty <= 0) continue;
    parts.push(`${sym}:${qty}`);
  }
  parts.sort();
  return `${invested.toFixed(2)}::${parts.join(",")}`;
}

export function usePortfolioHistory(
  holdings: readonly CombinedHolding[],
  invested: number,
  enabled = true,
): UsePortfolioHistoryResult {
  const [series, setSeries] = React.useState<PortfolioHistoryPoint[]>([]);
  const [marketReturns, setMarketReturns] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedCount, setResolvedCount] = React.useState<number>(0);
  const [missing, setMissing] = React.useState<string[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<number | null>(null);

  const key = React.useMemo(() => buildKey(holdings, invested), [holdings, invested]);
  const inFlight = React.useRef<AbortController | null>(null);

  const doFetch = React.useCallback(async () => {
    const payloadHoldings = holdings
      .map((h) => ({
        symbol: (h.symbol ?? h.stockName ?? "").trim().toUpperCase(),
        quantity: typeof h.quantity === "number" ? h.quantity : 0,
      }))
      .filter((h) => h.symbol && h.quantity > 0);

    if (payloadHoldings.length === 0) {
      setSeries([]);
      setMarketReturns([]);
      setResolvedCount(0);
      setMissing([]);
      setLastFetchedAt(Date.now());
      return;
    }

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: payloadHoldings, invested }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`portfolio-history HTTP ${res.status}`);
      }
      const raw = (await res.json()) as RawResponse;
      if (raw.error) {
        throw new Error(raw.error);
      }
      const normSeries: PortfolioHistoryPoint[] = (raw.series ?? [])
        .map((p) => ({
          t: typeof p.t === "number" ? p.t : 0,
          value: typeof p.value === "number" ? p.value : 0,
          invested: typeof p.invested === "number" ? p.invested : invested,
        }))
        .filter((p) => p.t > 0 && Number.isFinite(p.value));
      setSeries(normSeries);
      setMarketReturns(Array.isArray(raw.marketReturns) ? raw.marketReturns : []);
      setResolvedCount(typeof raw.resolvedCount === "number" ? raw.resolvedCount : 0);
      setMissing(Array.isArray(raw.missing) ? raw.missing : []);
      setLastFetchedAt(typeof raw.fetchedAt === "number" ? raw.fetchedAt : Date.now());
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [holdings, invested]);

  React.useEffect(() => {
    if (!enabled) return;
    void doFetch();
    return () => {
      inFlight.current?.abort();
    };
    // Re-fetch whenever the holdings signature changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return {
    series,
    marketReturns,
    loading,
    error,
    resolvedCount,
    missing,
    lastFetchedAt,
    refresh: doFetch,
  };
}
