"use client";

import { motion } from "framer-motion";
import { useActivePortfolio } from "@/hooks/use-portfolios";
import { formatCompactINR, formatPct } from "@/lib/utils";

export function PortfolioStatusCard() {
  const active = useActivePortfolio();
  const totals = active?.totals;
  const gain = (totals?.pnl ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-premium h-[100px] rounded-[24px] p-[20px]"
    >
      {active && totals ? (
        <div className="relative flex h-full flex-col justify-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Active portfolio
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate font-display text-base font-semibold text-foreground">
                {active.name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {totals.holdingCount} holding{totals.holdingCount === 1 ? "" : "s"}
              </div>
            </div>
            <div className="text-right">
              <div className="stats-number text-xl font-bold text-foreground">
                {formatCompactINR(totals.currentValue)}
              </div>
              <div
                className={
                  "mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold stats-number " +
                  (gain ? "text-emerald-300" : "text-red-300")
                }
              >
                {gain ? "+" : ""}
                {formatPct(totals.pnlPercent)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Portfolio Status
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-pulse-soft" />
            No portfolio yet — import one to get started.
          </div>
        </div>
      )}
    </motion.div>
  );
}
