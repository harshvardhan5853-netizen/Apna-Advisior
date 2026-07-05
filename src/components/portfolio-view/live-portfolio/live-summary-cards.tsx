"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, IndianRupee, Layers, TrendingDown, TrendingUp, Clock, RefreshCw, Wifi } from "lucide-react";
import type { MarketStatus } from "@/lib/live-quotes/types";
import { cn, formatCompactINR, formatINR, formatPct } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { MarketStatusPill } from "./market-status-pill";

export interface LiveSummary {
  invested: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  todayChange: number;
  todayChangePercent: number;
  stockCount: number;
  liveCount: number;
}

interface LiveSummaryCardsProps {
  summary: LiveSummary;
  marketStatus: MarketStatus;
  lastUpdated: number | null;
  onRefresh: () => void;
  refreshing: boolean;
  className?: string;
}

function formatClock(ts: number | null): string {
  if (ts == null) return "—";
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function LiveSummaryCards({
  summary,
  marketStatus,
  lastUpdated,
  onRefresh,
  refreshing,
  className,
}: LiveSummaryCardsProps) {
  const gainTone = summary.totalPnl >= 0 ? "gain" : "loss";
  const dayTone = summary.todayChange >= 0 ? "gain" : "loss";

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3", className)}>
      <Tile label="Total invested" icon={IndianRupee} tone="muted">
        <AnimatedNumber value={summary.invested} format={(v) => formatINR(v)} />
      </Tile>
      <Tile label="Current live value" icon={Wifi} tone="muted" pulse>
        <AnimatedNumber value={summary.currentValue} format={(v) => formatINR(v)} />
      </Tile>
      <Tile label="Total P&L" icon={summary.totalPnl >= 0 ? TrendingUp : TrendingDown} tone={gainTone}>
        <AnimatedNumber
          value={summary.totalPnl}
          format={(v) => formatINR(v)}
          tone={summary.totalPnl}
        />
      </Tile>
      <Tile label="Total return" icon={summary.totalPnl >= 0 ? TrendingUp : TrendingDown} tone={gainTone}>
        <AnimatedNumber
          value={summary.totalPnlPercent}
          format={(v) => formatPct(v)}
          tone={summary.totalPnlPercent}
        />
      </Tile>
      <Tile label="Today's change" icon={Activity} tone={dayTone}>
        <div className="flex flex-col">
          <AnimatedNumber
            value={summary.todayChange}
            format={(v) => formatINR(v)}
            tone={summary.todayChange}
          />
          <span className={cn("text-xs font-medium", summary.todayChange >= 0 ? "text-emerald-300/80" : "text-red-400/80")}>
            <AnimatedNumber
              value={summary.todayChangePercent}
              format={(v) => formatPct(v)}
              tone={summary.todayChangePercent}
              flash={false}
              className="text-xs"
            />
          </span>
        </div>
      </Tile>
      <Tile label="Stocks tracked" icon={Layers} tone="muted">
        <div className="flex items-baseline gap-2">
          <span className="money-tabular">{summary.liveCount}</span>
          <span className="text-sm text-muted-foreground">/ {summary.stockCount}</span>
        </div>
      </Tile>

      {/* Second row: status + last updated + refresh */}
      <Tile label="Market status" icon={Activity} tone="muted" className="md:col-span-1">
        <MarketStatusPill status={marketStatus} />
      </Tile>
      <Tile label="Last updated" icon={Clock} tone="muted" className="md:col-span-1">
        <div className="flex flex-col">
          <span className="money-tabular text-lg">{formatClock(lastUpdated)}</span>
          <span className="text-[11px] text-muted-foreground">
            {lastUpdated == null ? "Waiting for first tick…" : "Local time"}
          </span>
        </div>
      </Tile>
      <Tile label="Refresh" icon={RefreshCw} tone="muted" className="md:col-span-1">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1.5 text-sm font-medium text-emerald-200 transition-colors",
            "hover:border-emerald-400/50 hover:bg-emerald-500/[0.12]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </Tile>
    </div>
  );
}

interface TileProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "gain" | "loss" | "muted";
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const Tile = React.memo(TileBase);

function TileBase({ label, icon: Icon, tone, children, className, pulse }: TileProps) {
  const toneStyles =
    tone === "gain"
      ? "from-emerald-500/[0.12] to-emerald-400/0"
      : tone === "loss"
        ? "from-red-500/[0.12] to-red-400/0"
        : "from-emerald-400/[0.06] to-emerald-400/0";
  const iconTone = tone === "gain" ? "text-emerald-300" : tone === "loss" ? "text-red-400" : "text-emerald-300/70";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn("relative glass overflow-hidden p-4", className)}
    >
      <div className={cn("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl bg-gradient-to-br", toneStyles)} />
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]", iconTone)}>
          <Icon className="h-3.5 w-3.5" />
          {pulse && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse-ring" aria-hidden />
          )}
        </div>
      </div>
      <div className="relative mt-2 text-xl font-semibold">
        {children}
      </div>
    </motion.div>
  );
}

/** Format compact when large. */
export function formatSmartINR(v: number): string {
  return Math.abs(v) >= 100_000 ? formatCompactINR(v) : formatINR(v);
}
