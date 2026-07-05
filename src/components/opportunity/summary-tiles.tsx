"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { OpportunityAnalysis, Recommendation } from "@/types/opportunity";
import { cn } from "@/lib/utils";

interface SummaryTilesProps {
  analyses: OpportunityAnalysis[];
  className?: string;
}

interface TileMeta {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  ring: string;
  text: string;
  glow: string;
}

const TILE_META: Record<"strong-buy" | "buy" | "hold" | "sell" | "avg", TileMeta> = {
  "strong-buy": {
    label: "Strong Buys",
    Icon: TrendingUp,
    ring: "border-emerald-400/40",
    text: "text-emerald-200",
    glow: "from-emerald-400/20",
  },
  buy: {
    label: "Buys",
    Icon: ArrowUpRight,
    ring: "border-emerald-500/30",
    text: "text-emerald-300",
    glow: "from-emerald-500/15",
  },
  hold: {
    label: "Holds",
    Icon: Minus,
    ring: "border-amber-400/30",
    text: "text-amber-200",
    glow: "from-amber-400/15",
  },
  sell: {
    label: "Sells",
    Icon: ArrowDownRight,
    ring: "border-red-400/30",
    text: "text-red-200",
    glow: "from-red-400/15",
  },
  avg: {
    label: "Avg confidence",
    Icon: Sparkles,
    ring: "border-violet-400/40",
    text: "text-violet-200",
    glow: "from-violet-400/20",
  },
};

function SummaryTilesBase({ analyses, className }: SummaryTilesProps) {
  const tiles = React.useMemo(() => {
    const counts: Record<Recommendation, number> = {
      "strong-buy": 0,
      buy: 0,
      hold: 0,
      sell: 0,
      "strong-sell": 0,
    };
    let confSum = 0;
    let confCount = 0;
    for (const a of analyses) {
      counts[a.recommendation] += 1;
      if (Number.isFinite(a.confidence)) {
        confSum += a.confidence;
        confCount += 1;
      }
    }
    const avgConfidence = confCount > 0 ? (confSum / confCount) * 100 : 0;
    const sellCombined = counts.sell + counts["strong-sell"];
    const list: Array<{ key: keyof typeof TILE_META; value: string; sub?: string }> = [
      { key: "strong-buy", value: String(counts["strong-buy"]) },
      { key: "buy", value: String(counts.buy) },
      { key: "hold", value: String(counts.hold) },
      { key: "sell", value: String(sellCombined), sub: `${counts.sell} sell · ${counts["strong-sell"]} strong` },
      { key: "avg", value: `${avgConfidence.toFixed(1)}%`, sub: analyses.length ? `${analyses.length} analysed` : "—" },
    ];
    return list;
  }, [analyses]);

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-5", className)}>
      {tiles.map((t, i) => {
        const meta = TILE_META[t.key];
        const Icon = meta.Icon;
        return (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i, duration: 0.3 }}
            className={cn(
              "glass relative overflow-hidden rounded-2xl border p-4",
              meta.ring,
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl",
                meta.glow,
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </span>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]",
                  meta.text,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className={cn("mt-3 font-display text-2xl font-semibold money-tabular", meta.text)}>
              {t.value}
            </div>
            {t.sub && (
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t.sub}</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export const SummaryTiles = React.memo(SummaryTilesBase);
