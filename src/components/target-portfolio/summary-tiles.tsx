"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Target,
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  ListChecks,
} from "lucide-react";
import { cn, formatCompactINR } from "@/lib/utils";
import type { RebalanceSummary } from "@/types/target-portfolio";

interface TargetSummaryTilesProps {
  summary: RebalanceSummary;
  className?: string;
}

export function TargetSummaryTiles({ summary, className }: TargetSummaryTilesProps) {
  const totalPct = summary.totalTargetPercent;
  const totalPctTone: Tone = Math.abs(totalPct - 100) <= 0.5 ? "gain" : totalPct > 0 ? "warn" : "muted";
  const totalPctLabel = totalPct === 0 ? "—" : `${totalPct.toFixed(1)}%`;
  const totalPctSub = totalPct === 0 ? "Add allocations" : Math.abs(totalPct - 100) <= 0.5 ? "Balanced" : totalPct > 100 ? `${(totalPct - 100).toFixed(1)}% over` : `${(100 - totalPct).toFixed(1)}% short`;

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6", className)}>
      <Tile
        label="Total allocation"
        icon={<Target className="h-4 w-4" />}
        value={totalPctLabel}
        sub={totalPctSub}
        tone={totalPctTone}
        delay={0}
      />
      <Tile
        label="Target capital"
        icon={<Wallet className="h-4 w-4" />}
        value={formatCompactINR(summary.totalCapital)}
        sub="Basis for rebalancing"
        tone="muted"
        delay={0.03}
      />
      <Tile
        label="Currently invested"
        icon={<IndianRupee className="h-4 w-4" />}
        value={formatCompactINR(summary.totalCurrentValue)}
        sub={`${summary.matchedCount} matched \u00b7 ${summary.unmatchedCount} unowned`}
        tone="muted"
        delay={0.06}
      />
      <Tile
        label="On target"
        icon={<CheckCircle2 className="h-4 w-4" />}
        value={`${summary.onTargetCount}`}
        sub="Within 1.5% band"
        tone={summary.onTargetCount > 0 ? "gain" : "muted"}
        delay={0.09}
      />
      <Tile
        label="Need to invest"
        icon={<ArrowUpCircle className="h-4 w-4" />}
        value={formatCompactINR(summary.underweightSum)}
        sub={`${summary.underAllocatedCount} under-allocated`}
        tone={summary.underweightSum > 0 ? "warn" : "muted"}
        delay={0.12}
      />
      <Tile
        label="Need to trim"
        icon={<ArrowDownCircle className="h-4 w-4" />}
        value={formatCompactINR(summary.overweightSum)}
        sub={`${summary.overAllocatedCount} over-allocated`}
        tone={summary.overweightSum > 0 ? "loss" : "muted"}
        delay={0.15}
      />
    </div>
  );
}

type Tone = "gain" | "loss" | "warn" | "muted";

const TONE: Record<
  Tone,
  { text: string; icon: string; blob: string }
> = {
  gain: {
    text: "text-emerald-200",
    icon: "text-emerald-300 border-emerald-400/25 bg-emerald-400/[0.08]",
    blob: "bg-emerald-500/10",
  },
  loss: {
    text: "text-red-300",
    icon: "text-red-300 border-red-400/25 bg-red-400/[0.08]",
    blob: "bg-red-500/10",
  },
  warn: {
    text: "text-amber-200",
    icon: "text-amber-300 border-amber-400/25 bg-amber-400/[0.08]",
    blob: "bg-amber-500/10",
  },
  muted: {
    text: "text-foreground",
    icon: "text-muted-foreground border-white/10 bg-white/[0.04]",
    blob: "bg-white/[0.03]",
  },
};

interface TileProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  sub: string;
  tone: Tone;
  delay?: number;
}

function Tile({ label, icon, value, sub, tone, delay = 0 }: TileProps) {
  const t = TONE[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass relative overflow-hidden p-4"
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl", t.blob)} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", t.icon)}>{icon}</div>
      </div>
      <div className={cn("relative mt-3 font-display text-xl font-semibold money-tabular", t.text)}>{value}</div>
      <div className="relative mt-1 text-[11px] text-muted-foreground line-clamp-1">{sub}</div>
    </motion.div>
  );
}

// Extra re-exports for icons in case host component wants a matching visual.
export { TrendingUp, TrendingDown, ListChecks };
