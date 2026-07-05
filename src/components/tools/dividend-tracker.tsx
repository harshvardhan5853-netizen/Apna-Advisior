"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Coins, ExternalLink, RefreshCcw, TrendingUp, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePortfolios, useActivePortfolioId } from "@/hooks/use-portfolios";
import { usePortfolioNews } from "@/hooks/use-portfolio-news";
import { DEFAULT_NEWS_SETTINGS, readNewsSettings } from "@/lib/news/settings";
import type { NewsSettings } from "@/lib/news/settings";
import type { AnalyzedNewsArticle } from "@/types/news";
import type { Holding } from "@/types/portfolio";
import { cn, formatDate, formatNumber } from "@/lib/utils";

interface StockGroup {
  symbol: string;
  displayName: string;
  count: number;
  latest: AnalyzedNewsArticle;
  articles: AnalyzedNewsArticle[];
}

function primarySymbolOf(article: AnalyzedNewsArticle): string | null {
  const affected = article.analysis?.affectedSymbols?.[0];
  if (affected && affected.trim().length > 0) return affected.trim().toUpperCase();
  const matched = article.matchedSymbols?.[0];
  if (matched && matched.trim().length > 0) return matched.trim().toUpperCase();
  return null;
}

function displayNameFor(symbol: string, holdings: Holding[]): string {
  const match = holdings.find((h) => h.symbol?.toUpperCase() === symbol);
  return match?.stockName ?? symbol;
}

export function DividendTracker() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();
  const [settings, setSettings] = React.useState<NewsSettings>(DEFAULT_NEWS_SETTINGS);

  React.useEffect(() => {
    setSettings(readNewsSettings());
  }, []);

  const visiblePortfolios = React.useMemo(() => {
    if (!portfolios) return [];
    if (!activeId) return portfolios.filter((p) => p.status === "active");
    return portfolios.filter((p) => p.id === activeId && p.status === "active");
  }, [portfolios, activeId]);

  const holdings = React.useMemo<Holding[]>(
    () => visiblePortfolios.flatMap((p) => p.holdings ?? []),
    [visiblePortfolios],
  );

  const news = usePortfolioNews(holdings, settings);

  const dividendArticles = React.useMemo(
    () =>
      news.articles.filter(
        (a) => a.analysis?.category === "dividend" && !a.analysisFailed,
      ),
    [news.articles],
  );

  const groups = React.useMemo<StockGroup[]>(() => {
    const map = new Map<string, StockGroup>();
    for (const article of dividendArticles) {
      const symbol = primarySymbolOf(article);
      if (!symbol) continue;
      const existing = map.get(symbol);
      if (existing) {
        existing.articles.push(article);
        existing.count += 1;
        if (article.publishedAt > existing.latest.publishedAt) {
          existing.latest = article;
        }
      } else {
        map.set(symbol, {
          symbol,
          displayName: displayNameFor(symbol, holdings),
          count: 1,
          latest: article,
          articles: [article],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.latest.publishedAt - a.latest.publishedAt,
    );
  }, [dividendArticles, holdings]);

  const uniqueStocks = groups.length;
  const totalArticles = dividendArticles.length;
  const mostRecent = groups[0]?.latest ?? null;

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.10] p-2 text-amber-200">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Portfolio dividend feed</h2>
              <p className="text-xs text-muted-foreground">
                Auto-detected dividend announcements from your portfolio&apos;s news stream.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => news.refresh()}
            disabled={news.refreshing || holdings.length === 0}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", news.refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile
            label="Dividend articles"
            value={formatNumber(totalArticles)}
            sub={`${news.articles.length} total news items`}
            icon={<Coins className="h-4 w-4 text-amber-200" />}
          />
          <Tile
            label="Stocks with dividend news"
            value={formatNumber(uniqueStocks)}
            sub={holdings.length > 0 ? `Out of ${holdings.length} holdings` : "Add holdings first"}
            icon={<Wallet className="h-4 w-4 text-emerald-200" />}
          />
          <Tile
            label="Most recent"
            value={mostRecent ? formatDate(mostRecent.publishedAt) : "—"}
            sub={mostRecent?.title?.slice(0, 40) ?? "Nothing detected yet"}
            icon={<TrendingUp className="h-4 w-4 text-cyan-200" />}
          />
          <Tile
            label="Auto-refresh"
            value={`${settings.autoRefreshMinutes} min`}
            sub={settings.autoRefresh ? "Enabled" : "Disabled"}
            icon={<RefreshCcw className="h-4 w-4 text-fuchsia-200" />}
          />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl md:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dividend announcements by stock</h2>
            <p className="text-xs text-muted-foreground">
              Grouped by primary symbol. Click a headline to read the full article.
            </p>
          </div>
        </div>

        {holdings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
            Add a portfolio first to track dividend announcements for your holdings.
          </div>
        ) : news.loading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
            Fetching portfolio news…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
            No dividend articles detected in the current window. Try refreshing or wait for Gemini
            analysis to catch up.
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li
                key={group.symbol}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{group.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.symbol} · {group.count} article(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-400/25 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-200">
                      Dividend
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(group.latest.publishedAt)}
                    </span>
                  </div>
                </div>
                <a
                  href={group.latest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-start gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs text-muted-foreground transition hover:border-amber-400/25 hover:text-amber-100"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{group.latest.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}

function Tile({ label, value, sub, icon }: TileProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
