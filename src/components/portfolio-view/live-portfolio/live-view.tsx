"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Flame, Radio, TrendingDown, TrendingUp, WifiOff } from "lucide-react";
import { usePortfolios, useActivePortfolioId } from "@/hooks/use-portfolios";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import type { Holding, Portfolio } from "@/types/portfolio";
import type { LiveQuote, QuoteMap } from "@/lib/live-quotes/types";
import { cn, formatCompactINR, formatPct } from "@/lib/utils";
import { PortfolioSelector } from "@/components/portfolio-view/portfolio-selector";
import { LiveSummaryCards, type LiveSummary } from "./live-summary-cards";
import { LiveHoldingsTable, type LiveSortKey } from "./live-holdings-table";
import { resolveBareSymbol } from "@/lib/live-quotes/yahoo-symbol";

function flattenHoldings(portfolios: Portfolio[]): Holding[] {
  // The live view treats each holding row on its own — no cross-portfolio dedupe. If the same
  // stock exists in multiple portfolios, you'll see two rows so the source stays obvious.
  const out: Holding[] = [];
  for (const p of portfolios) for (const h of p.holdings) out.push(h);
  return out;
}

export function LiveView() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();
  const [selectedId, setSelectedId] = React.useState<string | "all">("all");
  const [sortKey, setSortKey] = React.useState<LiveSortKey>("highest-profit");

  const loading = portfolios === undefined || activeId === undefined;
  const visiblePortfolios = React.useMemo<Portfolio[]>(() => {
    if (!portfolios) return [];
    if (selectedId === "all") return portfolios;
    return portfolios.filter((p) => p.id === selectedId);
  }, [portfolios, selectedId]);

  const holdings = React.useMemo(() => flattenHoldings(visiblePortfolios), [visiblePortfolios]);

  const { quotes, history, loading: quotesLoading, refreshing, error, lastUpdated, marketStatus, missing, resolvedCount, refresh } = useLiveQuotes(holdings, {
    autoRefresh: true,
    intervalMs: 20_000,
    enabled: holdings.length > 0,
  });

  // Compute live summary + total current value in one pass.
  const summary = React.useMemo<LiveSummary>(() => {
    let invested = 0;
    let currentValue = 0;
    let todayChange = 0;
    let prevCurrentValue = 0;
    let liveCount = 0;
    for (const h of holdings) {
      const qty = h.quantity ?? 0;
      const inv = h.investedAmount ?? qty * (h.avgBuyPrice ?? 0);
      const bare = resolveBareSymbol(h);
      const quote = bare ? quotes[bare] : null;
      const livePrice = quote?.price ?? null;
      const effective = livePrice ?? h.currentPrice ?? h.avgBuyPrice ?? 0;
      const cur = qty * effective;
      invested += inv;
      currentValue += cur;
      if (quote?.dayChange != null && Number.isFinite(quote.dayChange)) {
        todayChange += quote.dayChange * qty;
        const prevPrice = quote.previousClose ?? effective;
        prevCurrentValue += qty * prevPrice;
        liveCount += 1;
      } else {
        prevCurrentValue += cur;
      }
    }
    const totalPnl = currentValue - invested;
    const totalPnlPercent = invested > 0 ? totalPnl / invested : 0;
    const todayChangePercent = prevCurrentValue > 0 ? todayChange / prevCurrentValue : 0;
    return {
      invested,
      currentValue,
      totalPnl,
      totalPnlPercent,
      todayChange,
      todayChangePercent,
      stockCount: holdings.length,
      liveCount,
    };
  }, [holdings, quotes]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer" />
        ))}
      </div>
    );
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <section className="glass flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08]">
          <Radio className="h-6 w-6 text-emerald-300" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Nothing to track yet</h2>
          <p className="text-sm text-muted-foreground">Create a portfolio first, then come back to watch it live.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.1] px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/[0.16]"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PortfolioSelector portfolios={portfolios} activeId={activeId ?? null} selectedId={selectedId} onSelect={setSelectedId} />

      {resolvedCount === 0 && holdings.length > 0 && (
        <NotResolvedBanner count={holdings.length} />
      )}

      {error && (
        <div className="glass flex items-start gap-3 border-red-400/30 bg-red-500/[0.04] p-4 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-red-400" />
          <div>
            <div className="font-medium text-red-200">Live prices failed</div>
            <div className="text-red-200/70 text-xs">{error}</div>
          </div>
        </div>
      )}

      <LiveSummaryCards
        summary={summary}
        marketStatus={marketStatus}
        lastUpdated={lastUpdated}
        onRefresh={() => { void refresh(); }}
        refreshing={refreshing || quotesLoading}
      />

      {missing.length > 0 && (
        <MissingBanner missing={missing} />
      )}

      <HighestMovers holdings={holdings} quotes={quotes} />

      <LiveHoldingsTable
        holdings={holdings}
        quotes={quotes}
        history={history}
        totalCurrentValue={summary.currentValue}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />
    </div>
  );
}

function NotResolvedBanner({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass flex items-start gap-3 border-amber-400/30 bg-amber-500/[0.04] p-4 text-sm")}
    >
      <WifiOff className="mt-0.5 h-4 w-4 text-amber-300" />
      <div>
        <div className="font-medium text-amber-100">Couldn&apos;t match any tickers</div>
        <div className="text-amber-100/70 text-xs">
          None of the {count} holdings resolved to a Yahoo Finance NSE symbol. Add correct symbols in Review to enable live prices.
        </div>
      </div>
    </motion.div>
  );
}

interface MoverRow {
  holding: Holding;
  quote: LiveQuote;
  changePct: number;
  changeAbs: number;
  positionValue: number;
}

function HighestMovers({ holdings, quotes }: { holdings: Holding[]; quotes: QuoteMap }) {
  const rows: MoverRow[] = React.useMemo(() => {
    const out: MoverRow[] = [];
    for (const h of holdings) {
      const bare = resolveBareSymbol(h);
      if (!bare) continue;
      const q = quotes[bare];
      if (!q) continue;
      if (q.dayChangePercent == null || q.dayChange == null) continue;
      const price = q.price ?? q.previousClose ?? 0;
      out.push({
        holding: h,
        quote: q,
        changePct: q.dayChangePercent,
        changeAbs: q.dayChange,
        positionValue: price * (h.quantity ?? 0),
      });
    }
    return out;
  }, [holdings, quotes]);

  const { gainers, losers } = React.useMemo(() => {
    if (rows.length === 0) return { gainers: [] as MoverRow[], losers: [] as MoverRow[] };
    const sorted = [...rows].sort((a, b) => b.changePct - a.changePct);
    return {
      gainers: sorted.filter((r) => r.changePct > 0).slice(0, 3),
      losers: sorted.filter((r) => r.changePct < 0).slice(-3).reverse(),
    };
  }, [rows]);

  if (rows.length === 0) return null;
  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass p-4 md:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
          <Flame className="h-4 w-4 text-amber-300" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold">Highest Movers</div>
          <div className="text-[11px] text-muted-foreground">Top gainers &amp; losers in your portfolio today</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MoverList title="Top Gainers" icon="up" rows={gainers} emptyLabel="No gainers today" />
        <MoverList title="Top Losers" icon="down" rows={losers} emptyLabel="No losers today" />
      </div>
    </motion.section>
  );
}

function MoverList({
  title,
  icon,
  rows,
  emptyLabel,
}: {
  title: string;
  icon: "up" | "down";
  rows: MoverRow[];
  emptyLabel: string;
}) {
  const isUp = icon === "up";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const tone = isUp ? "text-emerald-300" : "text-rose-300";
  const bg = isUp ? "bg-emerald-500/[0.08]" : "bg-rose-500/[0.08]";
  const border = isUp ? "border-emerald-400/20" : "border-rose-400/20";
  return (
    <div className={cn("rounded-xl border p-3", border, bg)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone)} />
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      {rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">{emptyLabel}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={r.holding.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.holding.stockName || r.holding.symbol}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.holding.symbol} &middot; {formatCompactINR(r.positionValue)}
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-sm font-semibold tabular-nums", tone)}>{formatPct(r.changePct)}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {r.changeAbs >= 0 ? "+" : ""}
                  {r.changeAbs.toFixed(2)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MissingBanner({ missing }: { missing: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex items-start gap-3 border-amber-400/30 bg-amber-500/[0.03] p-3 text-xs"
    >
      <WifiOff className="mt-0.5 h-3.5 w-3.5 text-amber-300" />
      <div className="text-amber-100/80">
        No live quote for: <span className="font-medium">{missing.slice(0, 6).join(", ")}</span>
        {missing.length > 6 && <> +{missing.length - 6} more</>}. Falling back to imported price.
      </div>
    </motion.div>
  );
}
