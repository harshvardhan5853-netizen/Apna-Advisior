"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, TrendingDown, Percent, Sunrise, Layers, Activity, LineChart } from "lucide-react";
import { cn, formatCompactINR, formatINR, formatPct } from "@/lib/utils";
import type { PortfolioSummary } from "@/types/portfolio";

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const gain = summary.pnl >= 0;
  const dayGain = summary.todayPnl >= 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
      <Tile
        label="Total investment"
        value={formatCompactINR(summary.invested)}
        sub={formatINR(summary.invested)}
        icon={<IndianRupee className="h-4 w-4" />}
        tint="from-emerald-400/20 to-emerald-500/0"
      />
      <Tile
        label="Current value"
        value={formatCompactINR(summary.currentValue)}
        sub={formatINR(summary.currentValue)}
        icon={<IndianRupee className="h-4 w-4" />}
        tint="from-teal-400/20 to-teal-500/0"
      />
      <Tile
        label="Total P/L"
        value={formatCompactINR(summary.pnl)}
        sub={formatINR(summary.pnl)}
        valueTone={gain ? "gain" : "loss"}
        icon={gain ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        tint={gain ? "from-emerald-400/20 to-emerald-500/0" : "from-red-400/20 to-red-500/0"}
      />
      <Tile
        label="Total return"
        value={formatPct(summary.pnlPercent)}
        sub={gain ? "Overall gain" : "Overall loss"}
        valueTone={gain ? "gain" : "loss"}
        icon={<Percent className="h-4 w-4" />}
        tint={gain ? "from-emerald-400/20 to-emerald-500/0" : "from-red-400/20 to-red-500/0"}
      />
      <Tile
        label="Today's P/L"
        value={summary.todayPnl !== 0 ? formatCompactINR(summary.todayPnl) : "—"}
        sub={summary.todayPnl !== 0 ? formatPct(summary.todayPnlPercent) : "Live prices pending"}
        valueTone={summary.todayPnl !== 0 ? (dayGain ? "gain" : "loss") : "muted"}
        icon={<Sunrise className="h-4 w-4" />}
        tint="from-cyan-400/20 to-cyan-500/0"
      />
      <Tile
        label="XIRR"
        value={summary.xirr != null ? formatPct(summary.xirr) : "—"}
        sub={summary.xirr != null ? "Annualized (money-weighted)" : "Needs buy-date history"}
        valueTone={summary.xirr != null ? (summary.xirr >= 0 ? "gain" : "loss") : "muted"}
        icon={<Activity className="h-4 w-4" />}
        tint="from-violet-400/20 to-violet-500/0"
      />
      <Tile
        label="CAGR"
        value={summary.cagr != null ? formatPct(summary.cagr) : "—"}
        sub={summary.cagr != null ? "Annualized (start → now)" : "Needs buy-date history"}
        valueTone={summary.cagr != null ? (summary.cagr >= 0 ? "gain" : "loss") : "muted"}
        icon={<LineChart className="h-4 w-4" />}
        tint="from-fuchsia-400/20 to-fuchsia-500/0"
      />
      <Tile
        label="Stocks"
        value={String(summary.stockCount)}
        sub="Unique holdings"
        icon={<Layers className="h-4 w-4" />}
        tint="from-lime-400/20 to-lime-500/0"
      />
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tint: string;
  valueTone?: "gain" | "loss" | "muted";
}

const Tile = React.memo(TileBase);

function TileBase({ label, value, sub, icon, tint, valueTone }: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass relative flex min-h-[110px] flex-col gap-2 overflow-hidden p-4"
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", tint)} />
      <div className="relative flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-emerald-300">
          {icon}
        </div>
      </div>
      <div className="relative mt-1 flex flex-col gap-0.5">
        <div
          className={cn(
            "money-tabular font-display text-xl font-semibold leading-none",
            valueTone === "gain" && "text-emerald-300",
            valueTone === "loss" && "text-red-400",
            valueTone === "muted" && "text-muted-foreground",
          )}
        >
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground line-clamp-1">{sub}</div>
      </div>
    </motion.div>
  );
}
