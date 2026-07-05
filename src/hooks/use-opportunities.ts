"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCachedAnalysis,
  setCachedAnalysis,
} from "@/lib/opportunity/cache";
import type {
  OpportunityAnalysis,
  OpportunityFetchResult,
} from "@/types/opportunity";

interface UseOpportunitiesOptions {
  /** Bare NSE symbols (e.g. ["BEL", "TCS"]). */
  symbols: string[];
  /** Auto-load on mount / symbols change. Defaults to true. */
  autoLoad?: boolean;
}

export interface UseOpportunitiesResult {
  analyses: OpportunityAnalysis[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  missing: string[];
  warnings: string[];
  refresh: () => Promise<void>;
}

const OPPORTUNITIES_ENDPOINT = "/api/opportunities";

function normalizeSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of symbols) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().toUpperCase();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen).sort();
}

async function readCache(
  symbols: string[],
): Promise<{ hits: Map<string, OpportunityAnalysis>; missing: string[] }> {
  const hits = new Map<string, OpportunityAnalysis>();
  const missing: string[] = [];
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const cached = await getCachedAnalysis(sym);
        if (cached) hits.set(sym, cached);
        else missing.push(sym);
      } catch {
        missing.push(sym);
      }
    }),
  );
  return { hits, missing };
}

async function fetchOpportunities(
  symbols: string[],
  signal: AbortSignal,
): Promise<OpportunityFetchResult> {
  const res = await fetch(OPPORTUNITIES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      detail = body.error ?? body.detail ?? "";
    } catch {
      // ignore
    }
    throw new Error(
      detail ? `Opportunities fetch failed: ${detail}` : `HTTP ${res.status}`,
    );
  }
  return (await res.json()) as OpportunityFetchResult;
}

function persistAnalyses(analyses: OpportunityAnalysis[]): void {
  for (const analysis of analyses) {
    // Fire-and-forget; a single stale write should not block the UI.
    setCachedAnalysis(analysis).catch(() => {
      /* swallow individual cache write errors */
    });
  }
}

export function useOpportunities({
  symbols,
  autoLoad = true,
}: UseOpportunitiesOptions): UseOpportunitiesResult {
  const normalized = normalizeSymbols(symbols);
  const symbolsKey = normalized.join(",");

  const [analyses, setAnalyses] = useState<OpportunityAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const inFlightRef = useRef<AbortController | null>(null);
  const currentSymbolsRef = useRef<string[]>(normalized);
  currentSymbolsRef.current = normalized;
  // Ref-based cold-vs-refresh flag avoids re-creating runLoad every time
  // `analyses` changes, which used to cascade re-runs and duplicate fetches.
  const hasDataRef = useRef<boolean>(false);

  const runLoad = useCallback(
    async (options: { bypassCache: boolean }): Promise<void> => {
      const targets = currentSymbolsRef.current;
      if (targets.length === 0) {
        // Cancel any in-flight and reset state.
        inFlightRef.current?.abort();
        inFlightRef.current = null;
        setAnalyses([]);
        setMissing([]);
        setWarnings([]);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        hasDataRef.current = false;
        return;
      }

      // Cancel previous.
      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;

      const isCold = !hasDataRef.current;
      if (isCold) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        let cachedList: OpportunityAnalysis[] = [];
        let toFetch: string[] = targets;

        if (!options.bypassCache) {
          const { hits, missing: cacheMiss } = await readCache(targets);
          cachedList = Array.from(hits.values());
          toFetch = cacheMiss;
          if (cachedList.length > 0) {
            // Show cached rows immediately so the UI can render even before
            // the server round-trip resolves.
            setAnalyses(cachedList);
            hasDataRef.current = true;
          }
        } else {
          setAnalyses([]);
          hasDataRef.current = false;
        }

        if (toFetch.length === 0 && cachedList.length > 0) {
          setMissing([]);
          setWarnings([]);
          setLastUpdated(Date.now());
          return;
        }

        if (toFetch.length === 0) {
          setMissing([]);
          setWarnings([]);
          return;
        }

        const result = await fetchOpportunities(toFetch, controller.signal);
        if (controller.signal.aborted) return;

        persistAnalyses(result.analyses);

        // Merge cached + freshly fetched, keyed by symbol (fresh wins).
        const merged = new Map<string, OpportunityAnalysis>();
        for (const cached of cachedList) merged.set(cached.symbol, cached);
        for (const fresh of result.analyses) merged.set(fresh.symbol, fresh);

        setAnalyses(Array.from(merged.values()));
        setMissing(result.missing ?? []);
        setWarnings(result.warnings ?? []);
        setLastUpdated(result.fetchedAt ?? Date.now());
        hasDataRef.current = true;
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (inFlightRef.current === controller) inFlightRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!autoLoad) return;
    hasDataRef.current = false;
    void runLoad({ bypassCache: false });
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, autoLoad]);

  const refresh = useCallback(async () => {
    await runLoad({ bypassCache: true });
  }, [runLoad]);

  return {
    analyses,
    loading,
    refreshing,
    error,
    lastUpdated,
    missing,
    warnings,
    refresh,
  };
}
