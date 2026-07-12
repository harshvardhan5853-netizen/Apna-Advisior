"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Award,
  AlertTriangle,
  Crown,
  TrendingUp,
  TrendingDown,
  ChartPie,
  Building2,
  Scale,
} from "lucide-react";
import { cn, formatCompactINR, formatPct } from "@/lib/utils";
import type { Highlights } from "@/types/portfolio";

interface AnalyticsHighlightsProps {
  highlights: Highlights;
  onSelectHolding?: (id: string) => void;
}

interface HighlightCard {
  key: string;
  title: string;
  icon: React.ReactNode;
  tone: "gain" | "loss" | "neutral";
  stockName?: string;
  symbol?: string;
  value: string;
  sub: string;
  onClick?: () => void;
}

function AnalyticsHighlightsBase({ highlights, onSelectHolding }: AnalyticsHighlightsProps) {
  const cards = React.useMemo<HighlightCard[]>(() => {
    const list: HighlightCard[] = [];
    if (highlights.bestPerformer) {
      const h = highlights.bestPerformer.holding;
      list.push({
        key: "best",
        title: "Best performer",
        icon: <Award className="h-4 w-4" />,
        tone: "gain",
        stockName: h.stockName,
        symbol: h.symbol,
        value: formatPct(highlights.bestPerformer.value),
        sub: `${formatCompactINR(h.currentValue)} \u00b7 ${h.sources.length > 1 ? `${h.sources.length} portfolios` : h.sources[0]?.portfolioName || ""}`,
        onClick: onSelectHolding ? () => onSelectHolding(h.id) : undefined,
      });
    }
    if (highlights.worstPerformer) {
      const h = highlights.worstPerformer.holding;
      list.push({
        key: "worst",
        title: "Worst performer",
        icon: <AlertTriangle className="h-4 w-4" />,
        tone: "loss",
        stockName: h.stockName,
        symbol: h.symbol,
        value: formatPct(highlights.worstPerformer.value),
        sub: `${formatCompactINR(h.currentValue)} \u00b7 ${h.sources.length > 1 ? `${h.sources.length} portfolios` : h.sources[0]?.portfolioName || ""}`,
        onClick: onSelectHolding ? () => onSelectHolding(h.id) : undefined,
      });
    }
    if (highlights.highestAllocation) {
      const h = highlights.highestAllocation.holding;
      list.push({
        key: "top",
        title: "Highest allocation",
        icon: <Crown className="h-4 w-4" />,
        tone: "neutral",
        stockName: h.stockName,
        symbol: h.symbol,
        value: `${highlights.highestAllocation.value.toFixed(1)}%`,
        sub: `${formatCompactINR(h.currentValue)} of portfolio`,
        onClick: onSelectHolding ? () => onSelectHolding(h.id) : undefined,
      });
    }
    if (highlights.biggestGainer) {
      const h = highlights.biggestGainer.holding;
      list.push({
        key: "gainer",
        title: "Biggest gainer",
        icon: <TrendingUp className="h-4 w-4" />,
        tone: "gain",
        stockName: h.stockName,
        symbol: h.symbol,
        value: formatCompactINR(highlights.biggestGainer.value),
        sub: formatPct(h.pnlPercent),
        onClick: onSelectHolding ? () => onSelectHolding(h.id) : undefined,
      });
    }
    if (highlights.biggestLoser) {
      const h = highlights.biggestLoser.holding;
      list.push({
        key: "loser",
        title: "Biggest loser",
        icon: <TrendingDown className="h-4 w-4" />,
        tone: "loss",
        stockName: h.stockName,
        symbol: h.symbol,
        value: formatCompactINR(highlights.biggestLoser.value),
        sub: formatPct(h.pnlPercent),
        onClick: onSelectHolding ? () => onSelectHolding(h.id) : undefined,
      });
    }
    if (highlights.mostProfitableSector) {
      const s = highlights.mostProfitableSector;
      list.push({
        key: "sector-gain",
        title: "Most profitable sector",
        icon: <ChartPie className="h-4 w-4" />,
        tone: "gain",
        stockName: s.sector,
        value: formatCompactINR(s.pnl),
        sub: `${s.count} stocks \u00b7 ${formatPct(s.pnlPercent)}`,
      });
    }
    if (highlights.mostLossMakingSector) {
      const s = highlights.mostLossMakingSector;
      list.push({
        key: "sector-loss",
        title: "Most loss-making sector",
        icon: <Building2 className="h-4 w-4" />,
        tone: "loss",
        stockName: s.sector,
        value: formatCompactINR(s.pnl),
        sub: `${s.count} stocks \u00b7 ${formatPct(s.pnlPercent)}`,
      });
    }
    const wl = highlights.winLoss;
    if (wl.winners + wl.losers + wl.flat > 0) {
      const net = wl.winnersValue + wl.losersValue;
      const tone: "gain" | "loss" | "neutral" = net > 0 ? "gain" : net < 0 ? "loss" : "neutral";
      list.push({
        key: "win-loss",
        title: "Winners vs losers",
        icon: <Scale className="h-4 w-4" />,
        tone,
        stockName: `${wl.winners} winner${wl.winners === 1 ? "" : "s"} \u00b7 ${wl.losers} loser${wl.losers === 1 ? "" : "s"}${wl.flat > 0 ? ` \u00b7 ${wl.flat} flat` : ""}`,
        value: formatCompactINR(net),
        sub: `Gains ${formatCompactINR(wl.winnersValue)} \u00b7 Losses ${formatCompactINR(wl.losersValue)}`,
      });
    }
    return list;
  }, [highlights, onSelectHolding]);

  if (cards.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Smart analytics</div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, idx) => (
          <motion.button
            key={c.key}
            type="button"
            onClick={c.onClick}
            disabled={!c.onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            whileHover={c.onClick ? { y: -2 } : undefined}
            className={cn(
              "glass relative flex flex-col gap-2 overflow-hidden p-4 text-left transition-all",
              c.onClick ? "cursor-pointer hover:border-white/15" : "cursor-default opacity-95",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl",
                c.tone === "gain" ? "from-emerald-400/20 to-emerald-500/0" : c.tone === "loss" ? "from-red-400/20 to-red-500/0" : "from-cyan-400/20 to-cyan-500/0",
              )}
            />
            <div className="relative flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg border border-white/10",
                  c.tone === "gain" && "bg-emerald-500/10 text-emerald-300",
                  c.tone === "loss" && "bg-red-500/10 text-red-400",
                  c.tone === "neutral" && "bg-cyan-500/10 text-cyan-300",
                )}
              >
                {c.icon}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</div>
            </div>
            <div className="relative">
              <div className="line-clamp-1 text-sm font-semibold text-foreground">
                {c.stockName}
                {c.symbol && c.symbol !== c.stockName && (
                  <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{c.symbol}</span>
                )}
              </div>
              <div className={cn("money-tabular mt-0.5 font-display text-lg font-semibold", c.tone === "gain" && "text-emerald-300", c.tone === "loss" && "text-red-400")}>
                {c.value}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{c.sub}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export const AnalyticsHighlights = React.memo(AnalyticsHighlightsBase);
