"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Coins, Gavel, LineChart, Megaphone, Settings2, Sparkles, TriangleAlert, WifiOff } from "lucide-react";
import type { AnalyzedNewsArticle, NewsCategory, NewsFilterState, NewsSource } from "@/types/news";
import type { Holding } from "@/types/portfolio";
import { usePortfolios, useActivePortfolioId } from "@/hooks/use-portfolios";
import { usePortfolioNews } from "@/hooks/use-portfolio-news";
import {
  DEFAULT_NEWS_SETTINGS,
  readNewsSettings,
  type NewsSettings,
} from "@/lib/news/settings";
import { PortfolioSelector } from "@/components/portfolio-view/portfolio-selector";
import { SummaryHeader } from "@/components/news/summary-header";
import { NewsFilterBar, DEFAULT_NEWS_FILTER, applyNewsFilters } from "@/components/news/filter-bar";
import { NewsFeed, type NewsSortKey } from "@/components/news/news-feed";
import { NewsEmptyState } from "@/components/news/empty-state";
import { SettingsDialog } from "@/components/news/settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewsView() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();

  const [selectedId, setSelectedId] = React.useState<string | "all">("all");
  const [filter, setFilter] = React.useState<NewsFilterState>(DEFAULT_NEWS_FILTER);
  const [sortKey, setSortKey] = React.useState<NewsSortKey>("date-desc");
  const [settings, setSettings] = React.useState<NewsSettings>(DEFAULT_NEWS_SETTINGS);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setSettings(readNewsSettings());
    setHydrated(true);
  }, []);

  const visiblePortfolios = React.useMemo(() => {
    if (!portfolios) return undefined;
    if (selectedId === "all") return portfolios;
    return portfolios.filter((p) => p.id === selectedId);
  }, [portfolios, selectedId]);

  const holdings: Holding[] = React.useMemo(() => {
    if (!visiblePortfolios) return [];
    return visiblePortfolios.flatMap((p) => p.holdings ?? []);
  }, [visiblePortfolios]);

  const enabled = hydrated && holdings.length > 0;
  const news = usePortfolioNews(enabled ? holdings : [], settings);

  const filteredArticles = React.useMemo(() => {
    return applyNewsFilters(news.articles, filter);
  }, [news.articles, filter]);

  const availableStocks = React.useMemo(() => {
    const set = new Set<string>();
    news.articles.forEach((a) => {
      a.matchedSymbols.forEach((s) => set.add(s.toUpperCase()));
      a.analysis?.affectedSymbols.forEach((s) => set.add(s.toUpperCase()));
    });
    return Array.from(set).sort();
  }, [news.articles]);

  const availableCategories = React.useMemo(() => {
    const set = new Set<NewsCategory>();
    news.articles.forEach((a) => {
      if (a.analysis?.category) set.add(a.analysis.category);
    });
    return Array.from(set);
  }, [news.articles]);

  const availableSources = React.useMemo(() => {
    const set = new Set<NewsSource>();
    news.articles.forEach((a) => set.add(a.source));
    return Array.from(set).sort();
  }, [news.articles]);

  // Loading state
  if (!hydrated || portfolios === undefined || activeId === undefined) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  // Empty states
  if (portfolios.length === 0) {
    return <NewsEmptyState variant="no-portfolio" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: selector + settings gear */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <PortfolioSelector
            portfolios={portfolios}
            activeId={activeId ?? null}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="md:mt-1 shrink-0"
        >
          <Settings2 className="h-4 w-4" />
          News settings
        </Button>
      </div>

      {/* No holdings after filter */}
      {holdings.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <TriangleAlert className="h-5 w-5 text-amber-300/80" />
          </div>
          <p className="font-display text-base font-semibold">No holdings in this portfolio</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Add stocks to this portfolio (or pick another portfolio above) to fetch relevant news.
          </p>
        </div>
      )}

      {/* LLM status banner */}
      {holdings.length > 0 && !settings.geminiApiKey && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-amber-100">
                Running in <strong>headlines-only mode</strong>. Add your free Gemini key to unlock Hinglish explanations, sentiment and why-it-matters.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-7 text-[11px]"
            >
              Add Gemini key
            </Button>
          </div>
        </div>
      )}

      {/* Errors */}
      {news.error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-3 text-xs text-red-200">
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-red-300 mt-0.5" />
          <span>{news.error}</span>
        </div>
      )}

      {/* Warnings */}
      {news.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-3 text-[11px] text-amber-100/80">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-300 mt-0.5" />
          <span className="line-clamp-3">
            {news.warnings.slice(0, 2).join(" · ")}
            {news.warnings.length > 2 ? ` · +${news.warnings.length - 2} more` : ""}
          </span>
        </div>
      )}

      {holdings.length > 0 && (
        <>
          <SummaryHeader
            summary={news.summary}
            onRefresh={news.refresh}
            refreshing={news.refreshing}
          />

          <UpcomingEventsStrip articles={news.articles} />

          <NewsFilterBar
            state={filter}
            onChange={setFilter}
            availableStocks={availableStocks}
            availableCategories={availableCategories}
            availableSources={availableSources}
            matched={filteredArticles.length}
            total={news.articles.length}
          />

          {news.loading && news.articles.length === 0 ? (
            <LoadingCards />
          ) : news.articles.length === 0 ? (
            <NewsEmptyState variant="no-news" />
          ) : (
            <NewsFeed
              articles={filteredArticles}
              sortKey={sortKey}
              onSortChange={setSortKey}
              loading={news.refreshing}
            />
          )}

          <FooterInfo articles={news.articles} resolvedCount={availableStocks.length} />
        </>
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={(next) => setSettings(next)}
      />
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-56 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

const EVENT_CATEGORY_META: Partial<Record<NewsCategory, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }>> = {
  earnings: { label: "Earnings", icon: LineChart, tone: "text-emerald-300 border-emerald-400/25 bg-emerald-500/[0.06]" },
  dividend: { label: "Dividend", icon: Coins, tone: "text-amber-200 border-amber-400/25 bg-amber-500/[0.06]" },
  buyback: { label: "Buyback", icon: Coins, tone: "text-cyan-200 border-cyan-400/25 bg-cyan-500/[0.06]" },
  split: { label: "Split", icon: Coins, tone: "text-sky-200 border-sky-400/25 bg-sky-500/[0.06]" },
  "bonus-issue": { label: "Bonus", icon: Coins, tone: "text-fuchsia-200 border-fuchsia-400/25 bg-fuchsia-500/[0.06]" },
  "merger-acquisition": { label: "M&A", icon: Megaphone, tone: "text-violet-200 border-violet-400/25 bg-violet-500/[0.06]" },
  regulatory: { label: "Regulatory", icon: Gavel, tone: "text-rose-200 border-rose-400/25 bg-rose-500/[0.06]" },
};

const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_META) as NewsCategory[];

// Memoized: news-view re-renders on filter/sort/settings changes and this strip
// only cares about `articles`. Without memo it re-filters + re-sorts the whole
// feed on every unrelated parent update.
const UpcomingEventsStrip = React.memo(UpcomingEventsStripBase);

function UpcomingEventsStripBase({ articles }: { articles: AnalyzedNewsArticle[] }) {
  const events = React.useMemo(() => {
    const cutoff = Date.now() - 14 * 86_400_000;
    return articles
      .filter((a) => {
        const cat = a.analysis?.category;
        if (!cat) return false;
        if (!EVENT_CATEGORIES.includes(cat)) return false;
        return a.publishedAt >= cutoff;
      })
      .sort((a, b) => (b.analysis?.importance ?? 0) - (a.analysis?.importance ?? 0))
      .slice(0, 6);
  }, [articles]);

  if (events.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
          <CalendarClock className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold">Corporate actions &amp; events</div>
          <div className="text-[11px] text-muted-foreground">Earnings, dividends, buybacks, M&amp;A &amp; regulatory hits from your portfolio (last 14 days)</div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((a) => {
          const meta = EVENT_CATEGORY_META[a.analysis!.category]!;
          const Icon = meta.icon;
          const stock = a.analysis?.affectedSymbols[0] ?? a.matchedSymbols[0] ?? "";
          const when = new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          return (
            <Link
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("group flex items-start gap-2 rounded-xl border p-2.5 transition-colors hover:brightness-110", meta.tone)}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <span>{meta.label}</span>
                  {stock && <span className="text-white/60">&middot; {stock}</span>}
                  <span className="ml-auto text-white/50">{when}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/85">{a.title}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.section>
  );
}

function FooterInfo({ articles, resolvedCount }: { articles: AnalyzedNewsArticle[]; resolvedCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[11px] text-muted-foreground"
    >
      <span>
        Powered by Google News + Gemini · {articles.length} article
        {articles.length === 1 ? "" : "s"} across {resolvedCount} stock
        {resolvedCount === 1 ? "" : "s"}
      </span>
      <span>Local-only · Nothing leaves your device except the LLM call.</span>
    </motion.div>
  );
}
