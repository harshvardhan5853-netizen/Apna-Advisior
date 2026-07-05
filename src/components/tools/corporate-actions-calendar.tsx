"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Coins,
  ExternalLink,
  Gavel,
  LineChart as LineChartIcon,
  Megaphone,
  RefreshCw,
  Sparkles,
  Split,
} from "lucide-react";

import { usePortfolios, useActivePortfolioId } from "@/hooks/use-portfolios";
import { usePortfolioNews } from "@/hooks/use-portfolio-news";
import { DEFAULT_NEWS_SETTINGS, readNewsSettings } from "@/lib/news/settings";
import type { NewsSettings } from "@/lib/news/settings";
import type { AnalyzedNewsArticle, NewsCategory } from "@/types/news";
import type { Holding } from "@/types/portfolio";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

type CategoryKey = "split" | "bonus-issue" | "dividend" | "buyback" | "merger-acquisition";

interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  ringTone: string;
}

const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  split: {
    label: "Splits",
    icon: Split,
    tone: "text-sky-200 border-sky-400/25 bg-sky-500/[0.08]",
    ringTone: "text-sky-100 border-sky-400/40 bg-sky-500/[0.14]",
  },
  "bonus-issue": {
    label: "Bonus issues",
    icon: Sparkles,
    tone: "text-fuchsia-200 border-fuchsia-400/25 bg-fuchsia-500/[0.08]",
    ringTone: "text-fuchsia-100 border-fuchsia-400/40 bg-fuchsia-500/[0.14]",
  },
  dividend: {
    label: "Dividends",
    icon: Coins,
    tone: "text-amber-200 border-amber-400/25 bg-amber-500/[0.08]",
    ringTone: "text-amber-100 border-amber-400/40 bg-amber-500/[0.14]",
  },
  buyback: {
    label: "Buybacks",
    icon: LineChartIcon,
    tone: "text-cyan-200 border-cyan-400/25 bg-cyan-500/[0.08]",
    ringTone: "text-cyan-100 border-cyan-400/40 bg-cyan-500/[0.14]",
  },
  "merger-acquisition": {
    label: "M&A",
    icon: Megaphone,
    tone: "text-violet-200 border-violet-400/25 bg-violet-500/[0.08]",
    ringTone: "text-violet-100 border-violet-400/40 bg-violet-500/[0.14]",
  },
};

const ALL_CATEGORIES: readonly CategoryKey[] = ["split", "bonus-issue", "dividend", "buyback", "merger-acquisition"];

function isCorporateAction(category: NewsCategory | undefined): category is CategoryKey {
  if (!category) return false;
  return (ALL_CATEGORIES as readonly string[]).includes(category);
}

function displayNameFor(symbol: string, holdings: Holding[]): string {
  const found = holdings.find((h) => (h.symbol || "").toUpperCase() === symbol.toUpperCase());
  return found?.stockName?.trim() || symbol;
}

function primarySymbolFor(article: AnalyzedNewsArticle): string | null {
  const first = article.analysis?.affectedSymbols?.[0] ?? article.matchedSymbols?.[0];
  return first ? first.trim().toUpperCase() : null;
}

export function CorporateActionsCalendar() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();

  const [settings, setSettings] = React.useState<NewsSettings>(DEFAULT_NEWS_SETTINGS);
  React.useEffect(() => {
    setSettings(readNewsSettings());
  }, []);

  const [selectedCategories, setSelectedCategories] = React.useState<Set<CategoryKey>>(new Set(ALL_CATEGORIES));

  const visiblePortfolios = React.useMemo(() => {
    if (!portfolios) return [];
    if (activeId) return portfolios.filter((p) => p.id === activeId && p.status === "active");
    return portfolios.filter((p) => p.status === "active");
  }, [portfolios, activeId]);

  const holdings: Holding[] = React.useMemo(
    () => visiblePortfolios.flatMap((p) => p.holdings ?? []),
    [visiblePortfolios],
  );

  const news = usePortfolioNews(holdings, settings);

  const corporateArticles = React.useMemo(() => {
    return news.articles
      .filter((a) => isCorporateAction(a.analysis?.category) && !a.analysisFailed)
      .sort((a, b) => b.publishedAt - a.publishedAt);
  }, [news.articles]);

  const filteredArticles = React.useMemo(() => {
    return corporateArticles.filter((a) => {
      const cat = a.analysis?.category;
      if (!isCorporateAction(cat)) return false;
      return selectedCategories.has(cat);
    });
  }, [corporateArticles, selectedCategories]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      split: 0,
      "bonus-issue": 0,
      dividend: 0,
      buyback: 0,
      "merger-acquisition": 0,
    };
    corporateArticles.forEach((a) => {
      const cat = a.analysis?.category;
      if (isCorporateAction(cat)) counts[cat] += 1;
    });
    return counts;
  }, [corporateArticles]);

  const toggleCategory = React.useCallback((key: CategoryKey) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Do not allow zero-selected: fall back to all when user tries to clear the last chip.
      if (next.size === 0) return new Set(ALL_CATEGORIES);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] p-2.5 text-violet-200">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Corporate actions from your portfolio news</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Splits, bonuses, dividends, buybacks and M&amp;A picked up by the news pipeline. Update auto-refresh in News Settings.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void news.refresh();
            }}
            disabled={news.refreshing || holdings.length === 0}
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", news.refreshing && "animate-spin")} />
            Refresh
          </Button>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {ALL_CATEGORIES.map((key) => {
            const meta = CATEGORY_META[key];
            const Icon = meta.icon;
            const active = selectedCategories.has(key);
            const count = categoryCounts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition",
                  active ? meta.ringTone : meta.tone,
                  active ? "opacity-100" : "opacity-70 hover:opacity-100",
                )}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </div>
                <div className="text-2xl font-semibold text-foreground">{count}</div>
              </button>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="mb-4">
          <h3 className="text-base font-semibold">Timeline</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filteredArticles.length} event(s) matched · sorted newest first
          </p>
        </header>

        {holdings.length === 0 ? (
          <EmptyState message="Add a portfolio first — this tool watches news for your holdings only." />
        ) : news.loading ? (
          <EmptyState message="Fetching latest news…" />
        ) : filteredArticles.length === 0 ? (
          <EmptyState message="No corporate action news detected yet for the selected categories." />
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredArticles.map((article) => {
              const cat = article.analysis?.category as CategoryKey;
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const symbol = primarySymbolFor(article);
              const stockName = symbol ? displayNameFor(symbol, holdings) : article.publisher || "Portfolio";
              return (
                <li key={article.id}>
                  <Link
                    href={article.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border p-4 transition",
                      "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
                    )}
                  >
                    <div className={cn("mt-0.5 rounded-xl border p-2", meta.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            meta.tone,
                          )}
                        >
                          {meta.label}
                        </span>
                        {symbol ? (
                          <span className="text-muted-foreground">
                            <span className="text-foreground/90">{stockName}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-mono">{symbol}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{stockName}</span>
                        )}
                        <span className="ml-auto text-muted-foreground">{formatDate(article.publishedAt)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground/95 group-hover:text-foreground">
                        {article.title}
                      </p>
                      {article.analysis?.whyItMatters ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {article.analysis.whyItMatters}
                        </p>
                      ) : null}
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-muted-foreground">
      <Gavel className="mx-auto mb-2 h-5 w-5 opacity-60" />
      {message}
    </div>
  );
}
