"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownAZ, CalendarClock, Sparkles, TrendingUp, Newspaper } from "lucide-react";
import type { AnalyzedNewsArticle, NewsSentiment } from "@/types/news";
import { NewsCard } from "@/components/news/news-card";
import { cn } from "@/lib/utils";

export type NewsSortKey = "date-desc" | "sentiment-strength" | "confidence-desc" | "stock";

const SORT_OPTIONS: Array<{ key: NewsSortKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "date-desc", label: "Newest first", icon: CalendarClock },
  { key: "sentiment-strength", label: "Strongest sentiment", icon: TrendingUp },
  { key: "confidence-desc", label: "Highest confidence", icon: Sparkles },
  { key: "stock", label: "By stock", icon: ArrowDownAZ },
];

const SENTIMENT_STRENGTH: Record<NewsSentiment, number> = {
  "very-positive": 4,
  positive: 3,
  neutral: 2,
  negative: 3,
  "very-negative": 4,
};

// Hoisted to module scope so framer-motion sees the SAME object reference
// across renders for every card and skips re-evaluating enter/exit props.
const FEED_INITIAL = { opacity: 0, y: 12 };
const FEED_ANIMATE = { opacity: 1, y: 0 };
const FEED_EXIT = { opacity: 0, y: -8 };

interface NewsFeedProps {
  articles: AnalyzedNewsArticle[];
  sortKey: NewsSortKey;
  onSortChange: (key: NewsSortKey) => void;
  loading?: boolean;
  className?: string;
}

export function NewsFeed({
  articles,
  sortKey,
  onSortChange,
  loading = false,
  className,
}: NewsFeedProps) {
  const sorted = React.useMemo(() => sortArticles(articles, sortKey), [articles, sortKey]);

  return (
    <section className={cn("flex flex-col gap-4", className)} aria-label="News feed">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <Newspaper className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">Latest headlines</h3>
            <p className="text-xs text-muted-foreground">
              {articles.length} article{articles.length === 1 ? "" : "s"} · sorted by{" "}
              <span className="text-emerald-300">
                {SORT_OPTIONS.find((s) => s.key === sortKey)?.label}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = sortKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSortChange(opt.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/[0.10] text-emerald-200 shadow-glow-emerald"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading && articles.length === 0 ? (
        <LoadingGrid />
      ) : sorted.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {sorted.map((article, index) => (
              <motion.div
                key={article.id}
                initial={FEED_INITIAL}
                animate={FEED_ANIMATE}
                exit={FEED_EXIT}
                transition={{ duration: 0.25, delay: Math.min(0.2, index * 0.015) }}
              >
                <NewsCard article={article} index={index} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function sortArticles(articles: AnalyzedNewsArticle[], key: NewsSortKey): AnalyzedNewsArticle[] {
  const arr = [...articles];
  switch (key) {
    case "date-desc":
      return arr.sort((a, b) => b.publishedAt - a.publishedAt);
    case "sentiment-strength":
      return arr.sort((a, b) => {
        const sa = a.analysis ? SENTIMENT_STRENGTH[a.analysis.sentiment] * (a.analysis.confidence || 0.5) : 0;
        const sb = b.analysis ? SENTIMENT_STRENGTH[b.analysis.sentiment] * (b.analysis.confidence || 0.5) : 0;
        if (sb !== sa) return sb - sa;
        return b.publishedAt - a.publishedAt;
      });
    case "confidence-desc":
      return arr.sort((a, b) => {
        const ca = a.analysis?.confidence ?? 0;
        const cb = b.analysis?.confidence ?? 0;
        if (cb !== ca) return cb - ca;
        return b.publishedAt - a.publishedAt;
      });
    case "stock":
      return arr.sort((a, b) => {
        const sa = a.matchedSymbols[0] ?? "ZZZZ";
        const sb = b.matchedSymbols[0] ?? "ZZZZ";
        const cmp = sa.localeCompare(sb);
        if (cmp !== 0) return cmp;
        return b.publishedAt - a.publishedAt;
      });
    default:
      return arr;
  }
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-56 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer"
          aria-hidden
        />
      ))}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Newspaper className="h-5 w-5 text-emerald-300/70" />
      </div>
      <div className="max-w-sm">
        <p className="font-display text-sm font-semibold">No matching articles</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try clearing filters or expanding the timeframe. New headlines usually appear within the auto-refresh window.
        </p>
      </div>
    </div>
  );
}
