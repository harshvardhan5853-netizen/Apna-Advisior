"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Circle,
  Sparkles,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useActivePortfolio } from "@/hooks/use-portfolios";
import { formatCompactINR, formatPct } from "@/lib/utils";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getTodayDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const day = ist.getDay();
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const totalMinutes = hour * 60 + minute;
  // Indian market: Mon-Fri, 9:15 AM to 3:30 PM IST
  if (day === 0 || day === 6) return false;
  return totalMinutes >= 9 * 60 + 15 && totalMinutes < 15 * 60 + 30;
}

export function DashboardHeader() {
  const active = useActivePortfolio();
  const totals = active?.totals;
  const gain = (totals?.pnl ?? 0) >= 0;
  const marketOpen = useMemo(() => isMarketOpen(), []);

  return (
    <header className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-radial-emerald opacity-60" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              APNA ADVISOR
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {getTodayDate()}
            </span>
            <span className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium
              ${marketOpen
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-white/10 bg-white/[0.03] text-muted-foreground"
              }`}
            >
              <Circle className={`h-2 w-2 fill-current ${marketOpen ? "text-emerald-400" : "text-muted-foreground/50"}`} />
              {marketOpen ? "Market Open" : "Market Closed"}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="space-y-1"
          >
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              <span className="hero-gradient">{getGreeting()}</span> <span>&#x1f44b;</span>
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Manage your investments with confidence
            </p>
          </motion.div>
        </div>

        {active && totals ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-premium min-w-[260px] shrink-0"
          >
            <div className="relative px-5 py-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                Active portfolio
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-premium min-w-[260px] shrink-0"
          >
            <div className="px-5 py-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                Portfolio Status
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-pulse-soft" />
                No portfolio yet — import one to get started.
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
