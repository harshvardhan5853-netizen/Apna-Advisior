"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { useActivePortfolio } from "@/hooks/use-portfolios";
import { formatCompactINR, formatPct } from "@/lib/utils";

export function DashboardHeader() {
  const active = useActivePortfolio();
  const totals = active?.totals;
  const gain = (totals?.pnl ?? 0) >= 0;

  return (
    <header className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-radial-emerald opacity-70" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>APNA ADVISOR</span>
            <span className="text-emerald-400/50">·</span>
            <span className="text-emerald-100/80">Wealth. Simplified.</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Your <span className="text-emerald-gradient">wealth command center</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-2 max-w-xl text-sm text-muted-foreground"
          >
            Import portfolios from any Indian broker in seconds — CSV, Excel, PDF or a simple screenshot.
            We do the rest.
          </motion.p>
        </div>

        {active && totals && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass px-5 py-4 md:min-w-[280px]"
          >
            <div className="relative">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Active portfolio
              </div>
              <div className="mt-1 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-semibold">
                    {active.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {totals.holdingCount} holdings
                  </div>
                </div>
                <div className="text-right">
                  <div className="money-tabular text-lg font-semibold">
                    {formatCompactINR(totals.currentValue)}
                  </div>
                  <div
                    className={
                      "flex items-center justify-end gap-1 text-xs font-medium money-tabular " +
                      (gain ? "text-emerald-300" : "text-red-300")
                    }
                  >
                    <TrendingUp
                      className={
                        "h-3.5 w-3.5 " + (gain ? "" : "rotate-180")
                      }
                    />
                    {gain ? "+" : ""}
                    {formatPct(totals.pnlPercent)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
