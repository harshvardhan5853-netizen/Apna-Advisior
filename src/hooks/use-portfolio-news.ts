"use client";

import * as React from "react";
import type { Holding } from "@/types/portfolio";
import type {
  AnalyzedNewsArticle,
  NewsFetchResult,
  NewsSummary,
} from "@/types/news";
import type { NewsSettings } from "@/lib/news/settings";
import { summarize } from "@/components/news/summary-header";

export interface UsePortfolioNewsResult {
  articles: AnalyzedNewsArticle[];
  summary: NewsSummary;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  llmEnabled: boolean;
  warnings: string[];
  emptySymbols: string[];
  unresolvedSymbols: string[];
  refresh: () => Promise<void>;
}

function emptySummary(): NewsSummary {
  return {
    totalArticles: 0,
    byStock: {},
    bySentiment: {
      "very-positive": 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      "very-negative": 0,
    },
    byCategory: {},
    mostCoveredStock: null,
    latestAt: null,
    lastUpdated: 0,
  };
}

/**
 * Fetch + poll portfolio-scoped news.  Auto-refreshes on the interval set in
 * NewsSettings (5-120 min).  Manual refresh available via `refresh()`.
 * Stale requests are aborted when holdings/settings change.
 */
export function usePortfolioNews(
  holdings: Holding[] | undefined,
  settings: NewsSettings,
): UsePortfolioNewsResult {
  const [articles, setArticles] = React.useState<AnalyzedNewsArticle[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);
  const [llmEnabled, setLlmEnabled] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [emptySymbols, setEmptySymbols] = React.useState<string[]>([]);
  const [unresolvedSymbols, setUnresolvedSymbols] = React.useState<string[]>([]);
  const inFlightRef = React.useRef<AbortController | null>(null);
  const firstLoadRef = React.useRef(false);

  // Build a stable holdings signature so effect only re-runs on real change.
  const holdingsKey = React.useMemo(() => {
    if (!holdings) return null;
    return holdings
      .map((h) => `${h.id}:${(h.symbol || "").toUpperCase()}:${(h.stockName || "").slice(0, 40)}`)
      .join("|");
  }, [holdings]);

  const doFetch = React.useCallback(
    async (silent: boolean) => {
      if (!holdings || holdings.length === 0) {
        setArticles([]);
        setEmptySymbols([]);
        setUnresolvedSymbols([]);
        setLlmEnabled(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;

      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdings,
            geminiApiKey: settings.geminiApiKey ?? null,
            model: settings.model,
          }),
          signal: controller.signal,
        });

        const parsed: NewsFetchResult | { error?: string; detail?: string } =
          await response.json().catch(() => ({ error: "invalid-response" }));

        if (!response.ok) {
          const detail =
            "error" in parsed && parsed.error
              ? `${parsed.error}${"detail" in parsed && parsed.detail ? `: ${parsed.detail}` : ""}`
              : `HTTP ${response.status}`;
          throw new Error(detail);
        }

        const result = parsed as NewsFetchResult;
        setArticles(result.articles);
        setLastUpdated(result.fetchedAt);
        setLlmEnabled(result.llmEnabled);
        setWarnings(result.warnings);
        setEmptySymbols(result.emptySymbols);
        setUnresolvedSymbols(result.unresolvedSymbols);
        firstLoadRef.current = true;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (inFlightRef.current === controller) inFlightRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [holdings, settings.geminiApiKey, settings.model],
  );

  React.useEffect(() => {
    if (!holdingsKey) return;
    firstLoadRef.current = false;
    doFetch(false);

    if (!settings.autoRefresh) return;
    const minutes = Math.max(5, Math.min(120, settings.autoRefreshMinutes));
    // Tab-visibility gate so we don't waste Gemini quota polling for a tab
    // the user isn't looking at.
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      doFetch(true);
    };
    const id = setInterval(tick, minutes * 60 * 1000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        doFetch(true);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // doFetch depends on holdings + settings which are already captured through holdingsKey/deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey, settings.autoRefresh, settings.autoRefreshMinutes, settings.geminiApiKey, settings.model]);

  React.useEffect(
    () => () => {
      inFlightRef.current?.abort();
    },
    [],
  );

  const summary = React.useMemo(
    () => (articles.length ? summarize(articles, lastUpdated ?? 0) : emptySummary()),
    [articles, lastUpdated],
  );

  const refresh = React.useCallback(async () => {
    await doFetch(true);
  }, [doFetch]);

  return {
    articles,
    summary,
    loading,
    refreshing,
    error,
    lastUpdated,
    llmEnabled,
    warnings,
    emptySymbols,
    unresolvedSymbols,
    refresh,
  };
}
