"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, X, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import type {
  AnalyzedNewsArticle,
  NewsCategory,
  NewsFilterState,
  NewsSentiment,
  NewsSource,
} from "@/types/news";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_NEWS_FILTER: NewsFilterState = {
  stockSymbols: [],
  sentiments: [],
  categories: [],
  sources: [],
  timeframeDays: 30,
  query: "",
};

type QuickTone = "all" | "positive" | "negative" | "neutral" | "high-impact";

const QUICK_FILTERS: Array<{
  key: QuickTone;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "muted" | "gain" | "loss" | "neutral" | "accent";
}> = [
  { key: "all", label: "All news", icon: Sparkles, tone: "accent" },
  { key: "positive", label: "Positive only", icon: TrendingUp, tone: "gain" },
  { key: "negative", label: "Negative only", icon: TrendingDown, tone: "loss" },
  { key: "neutral", label: "Neutral", icon: Minus, tone: "neutral" },
  { key: "high-impact", label: "High confidence", icon: Sparkles, tone: "accent" },
];

const TIMEFRAMES: Array<{ key: NewsFilterState["timeframeDays"]; label: string }> = [
  { key: 1, label: "Last 24h" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
];

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  earnings: "Earnings",
  "order-win": "Order wins",
  "management-change": "Mgmt change",
  regulatory: "Regulatory",
  dividend: "Dividend",
  buyback: "Buyback",
  split: "Split",
  "bonus-issue": "Bonus issue",
  "merger-acquisition": "M&A",
  "product-launch": "Product",
  expansion: "Expansion",
  guidance: "Guidance",
  legal: "Legal",
  "credit-rating": "Credit rating",
  "analyst-action": "Analyst",
  "insider-activity": "Insider",
  "macro-impact": "Macro",
  other: "Other",
};



const SOURCE_LABELS: Record<NewsSource, string> = {
  "google-news": "Google News",
  "nse-filing": "NSE filing",
  "bse-filing": "BSE filing",
  "business-standard": "Business Standard",
  "economic-times": "Economic Times",
  moneycontrol: "Moneycontrol",
  livemint: "Livemint",
  reuters: "Reuters",
  yahoo: "Yahoo",
  other: "Other",
};

interface FilterBarProps {
  state: NewsFilterState;
  onChange: (state: NewsFilterState) => void;
  availableStocks: string[];
  availableCategories: NewsCategory[];
  availableSources: NewsSource[];
  matched: number;
  total: number;
  className?: string;
}

// Local search state is debounced into the parent via startTransition so typing
// stays snappy even when 100+ articles have to be re-filtered on every keystroke.
function NewsFilterBarBase({
  state,
  onChange,
  availableStocks,
  availableCategories,
  availableSources,
  matched,
  total,
  className,
}: FilterBarProps) {
  const quickKey = deriveQuick(state);
  const hasNonDefault = !isDefault(state);

  const [localQuery, setLocalQuery] = React.useState(state.query);
  const [, startTransition] = React.useTransition();

  // Keep local input in sync when parent resets filters externally (e.g. Clear).
  React.useEffect(() => { setLocalQuery(state.query); }, [state.query]);

  const handleQueryChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalQuery(value);
      startTransition(() => {
        onChange({ ...state, query: value });
      });
    },
    [state, onChange],
  );

  const clearQuery = React.useCallback(() => {
    setLocalQuery("");
    startTransition(() => {
      onChange({ ...state, query: "" });
    });
  }, [state, onChange]);

  const setQuick = React.useCallback(
    (key: QuickTone) => {
      const next: NewsFilterState = {
        ...state,
        sentiments: quickToSentiments(key),
      };
      onChange(next);
    },
    [state, onChange],
  );

  const toggleCategory = React.useCallback(
    (cat: NewsCategory) => {
      const set = new Set(state.categories);
      if (set.has(cat)) set.delete(cat);
      else set.add(cat);
      onChange({ ...state, categories: Array.from(set) });
    },
    [state, onChange],
  );

  const toggleStock = React.useCallback(
    (sym: string) => {
      const set = new Set(state.stockSymbols);
      if (set.has(sym)) set.delete(sym);
      else set.add(sym);
      onChange({ ...state, stockSymbols: Array.from(set) });
    },
    [state, onChange],
  );

  const toggleSource = React.useCallback(
    (src: NewsSource) => {
      const set = new Set(state.sources);
      if (set.has(src)) set.delete(src);
      else set.add(src);
      onChange({ ...state, sources: Array.from(set) });
    },
    [state, onChange],
  );

  const setTimeframe = React.useCallback(
    (t: NewsFilterState["timeframeDays"]) => {
      onChange({ ...state, timeframeDays: t });
    },
    [state, onChange],
  );

  const clearAll = React.useCallback(() => {
    setLocalQuery("");
    onChange(DEFAULT_NEWS_FILTER);
  }, [onChange]);

  return (
    <section
      className={cn(
        "glass flex flex-col gap-3 p-4",
        className,
      )}
      aria-label="News filters"
    >
      {/* Row 1: search + quick tone pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={handleQueryChange}
            placeholder="Search headlines\u2026"
            className="h-9 pl-9"
          />
          {localQuery && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_FILTERS.map((q) => {
            const Icon = q.icon;
            const active = quickKey === q.key;
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => setQuick(q.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200 shadow-glow-emerald"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: timeframe + counter + clear */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Timeframe</span>
        </div>
        {TIMEFRAMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTimeframe(t.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              state.timeframeDays === t.key
                ? "border-emerald-400/50 bg-emerald-500/[0.10] text-emerald-200"
                : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            <span className="text-foreground font-semibold">{matched}</span> of {total} articles
          </span>
          <AnimatePresence>
            {hasNonDefault && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={clearAll}
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Row 3: category chips */}
      {availableCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Categories
          </span>
          {availableCategories.map((cat) => {
            const active = state.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                  active
                    ? "border-cyan-400/40 bg-cyan-400/[0.10] text-cyan-200"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      )}

      {/* Row 4: stock chips (limit to 12 to prevent overflow) */}
      {availableStocks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stocks</span>
          {availableStocks.slice(0, 20).map((sym) => {
            const active = state.stockSymbols.includes(sym);
            return (
              <button
                key={sym}
                type="button"
                onClick={() => toggleStock(sym)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/[0.10] text-emerald-200"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
                )}
              >
                {sym}
              </button>
            );
          })}
          {availableStocks.length > 20 && (
            <span className="text-[10px] text-muted-foreground">
              +{availableStocks.length - 20} more
            </span>
          )}
        </div>
      )}

      {/* Row 5: source chips */}
      {availableSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</span>
          {availableSources.map((src) => {
            const active = state.sources.includes(src);
            return (
              <button
                key={src}
                type="button"
                onClick={() => toggleSource(src)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                  active
                    ? "border-violet-400/40 bg-violet-400/[0.10] text-violet-200"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground",
                )}
              >
                {SOURCE_LABELS[src]}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Necessary: NewsFilterBar sits above the article grid. Without React.memo the
// filter bar re-renders whenever `filteredArticles` changes (which happens on
// every keystroke via the transition above) and that cascades to all the child
// buttons. The parent already stabilizes props via useState/useMemo.
export const NewsFilterBar = React.memo(NewsFilterBarBase);

function isDefault(s: NewsFilterState): boolean {
  return (
    s.stockSymbols.length === 0 &&
    s.sentiments.length === 0 &&
    s.categories.length === 0 &&
    s.sources.length === 0 &&
    s.timeframeDays === 30 &&
    s.query.trim() === ""
  );
}

function deriveQuick(s: NewsFilterState): QuickTone {
  const set = new Set(s.sentiments);
  if (set.size === 0) return "all";
  if (set.size === 2 && set.has("very-positive") && set.has("positive")) return "positive";
  if (set.size === 2 && set.has("very-negative") && set.has("negative")) return "negative";
  if (set.size === 1 && set.has("neutral")) return "neutral";
  return "all";
}

function quickToSentiments(key: QuickTone): NewsSentiment[] {
  switch (key) {
    case "positive":
      return ["very-positive", "positive"];
    case "negative":
      return ["very-negative", "negative"];
    case "neutral":
      return ["neutral"];
    case "high-impact":
    case "all":
    default:
      return [];
  }
}

/**
 * Apply active filters to a list of articles.
 * `state.sentiments` filters by article.analysis.sentiment.
 * `state.categories` filters by article.analysis.category.
 * `state.stockSymbols` filters by matchedSymbols OR analysis.affectedSymbols.
 * `state.query` is a substring search on title + snippet + hinglish.
 * `state.timeframeDays` filters by publishedAt.
 */
export function applyNewsFilters(
  articles: AnalyzedNewsArticle[],
  state: NewsFilterState,
  highConfidenceOnly?: boolean,
): AnalyzedNewsArticle[] {
  const now = Date.now();
  const cutoff = now - state.timeframeDays * 24 * 60 * 60 * 1000;
  const q = state.query.trim().toLowerCase();
  const stockSet = new Set(state.stockSymbols);
  const sentSet = new Set(state.sentiments);
  const catSet = new Set(state.categories);
  const srcSet = new Set(state.sources);

  return articles.filter((a) => {
    if (a.publishedAt < cutoff) return false;

    if (srcSet.size > 0 && !srcSet.has(a.source)) return false;

    if (sentSet.size > 0) {
      if (!a.analysis || !sentSet.has(a.analysis.sentiment)) return false;
    }

    if (catSet.size > 0) {
      if (!a.analysis || !catSet.has(a.analysis.category)) return false;
    }

    if (stockSet.size > 0) {
      const stocks = new Set<string>();
      a.matchedSymbols.forEach((s) => stocks.add(s.toUpperCase()));
      a.analysis?.affectedSymbols.forEach((s) => stocks.add(s.toUpperCase()));
      let intersects = false;
      for (const s of stockSet) {
        if (stocks.has(s.toUpperCase())) {
          intersects = true;
          break;
        }
      }
      if (!intersects) return false;
    }

    if (highConfidenceOnly && (!a.analysis || a.analysis.confidence < 0.7)) return false;

    // Necessary: guarding the blob build inside the `if (q)` block below cuts
    // per-article string allocations to zero when the search box is empty,
    // which is >95% of the time. Do NOT hoist it outside.
    if (q) {
      const parts = [a.title, a.snippet ?? "", a.analysis?.hinglishExplanation ?? "", a.analysis?.whyItMatters ?? ""];
      let hit = false;
      for (const p of parts) {
        if (p && p.toLowerCase().includes(q)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }

    return true;
  });
}
