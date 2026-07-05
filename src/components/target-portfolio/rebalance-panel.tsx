"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Info } from "lucide-react";
import { cn, formatINR, formatCompactINR } from "@/lib/utils";
import type { TargetGapRow, RebalanceSummary } from "@/types/target-portfolio";

interface RebalancePanelProps {
  rows: TargetGapRow[];
  summary: RebalanceSummary;
  className?: string;
}

export function RebalancePanel({ rows, summary, className }: RebalancePanelProps) {
  const under = React.useMemo(
    () => rows.filter((r) => r.status === "under-allocated" && r.requiredInvestment > 0).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6),
    [rows],
  );
  const over = React.useMemo(
    () => rows.filter((r) => r.status === "over-allocated" && r.requiredReduction > 0).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6),
    [rows],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("glass p-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Smart rebalancing</div>
          <div className="font-display text-lg font-semibold">
            How to reach your target
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
          <Wallet className="h-3 w-3" />
          Basis: {formatCompactINR(summary.totalCapital)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <NetTile
          label="Fresh capital to invest"
          value={summary.underweightSum}
          tone="warn"
          icon={<ArrowUpCircle className="h-4 w-4" />}
          sub={`${summary.underAllocatedCount} under-allocated stocks`}
        />
        <NetTile
          label="Amount to trim"
          value={summary.overweightSum}
          tone="loss"
          icon={<ArrowDownCircle className="h-4 w-4" />}
          sub={`${summary.overAllocatedCount} over-allocated stocks`}
        />
        <NetTile
          label={summary.netCashRequired >= 0 ? "Net cash required" : "Net cash freed"}
          value={Math.abs(summary.netCashRequired)}
          tone={summary.netCashRequired >= 0 ? "gain" : "warn"}
          icon={<Wallet className="h-4 w-4" />}
          sub={
            summary.netCashRequired >= 0
              ? "Additional capital to reach target"
              : "Cash released by trimming"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ActionList
          title="Buy first (top under-allocated)"
          tone="warn"
          rows={under}
          getAmount={(r) => r.requiredInvestment}
          getShares={(r) => r.sharesToBuy}
          verb="Invest"
          sharesVerb="Buy"
          emptyLabel="No under-allocated positions."
        />
        <ActionList
          title="Trim first (top over-allocated)"
          tone="loss"
          rows={over}
          getAmount={(r) => r.requiredReduction}
          getShares={(r) => r.sharesToSell}
          verb="Trim"
          sharesVerb="Sell"
          emptyLabel="No over-allocated positions."
        />
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 text-emerald-300/70" />
        Suggestions are based on the target capital shown above. Change the capital when editing this target to run &ldquo;what-if&rdquo; scenarios.
      </p>
    </motion.section>
  );
}

type Tone = "gain" | "loss" | "warn";

interface NetTileProps {
  label: string;
  value: number;
  tone: Tone;
  icon: React.ReactNode;
  sub: string;
}

function NetTile({ label, value, tone, icon, sub }: NetTileProps) {
  const toneClass =
    tone === "gain"
      ? "text-emerald-200 border-emerald-400/25 bg-emerald-500/[0.06]"
      : tone === "warn"
        ? "text-amber-200 border-amber-400/25 bg-amber-500/[0.06]"
        : "text-red-200 border-red-400/25 bg-red-500/[0.06]";
  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-3", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.05]">{icon}</div>
      </div>
      <div className="mt-2 font-display text-xl font-semibold money-tabular">{formatINR(value)}</div>
      <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  );
}

interface ActionListProps {
  title: string;
  tone: Tone;
  rows: TargetGapRow[];
  getAmount: (row: TargetGapRow) => number;
  getShares: (row: TargetGapRow) => number | null;
  verb: string;
  sharesVerb: string;
  emptyLabel: string;
}

function ActionList({ title, tone, rows, getAmount, getShares, verb, sharesVerb, emptyLabel }: ActionListProps) {
  const amountClass = tone === "loss" ? "text-red-300" : "text-amber-200";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="mt-2 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {rows.map((r) => {
            const shares = getShares(r);
            return (
              <li
                key={r.allocationId}
                className="flex items-center justify-between gap-2 rounded-md border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/[0.08] text-[10px] font-semibold text-emerald-200">
                    {r.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{r.stockName || r.symbol}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {r.diffPercent === 0 ? "" : `${r.diffPercent > 0 ? "+" : ""}${r.diffPercent.toFixed(1)}% off`}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn("money-tabular text-xs font-semibold", amountClass)}>
                    {verb} {formatINR(getAmount(r))}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground money-tabular">
                    {shares != null && shares > 0
                      ? `${sharesVerb} ~${shares} share${shares === 1 ? "" : "s"}`
                      : r.currentPrice == null
                        ? "Price unavailable"
                        : `${sharesVerb} <1 share`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
