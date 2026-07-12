"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, TrendingDown, TrendingUp, WifiOff } from "lucide-react";
import type { Holding } from "@/types/portfolio";
import type { QuoteMap, LiveQuote } from "@/lib/live-quotes/types";
import { cn, formatINR, formatNumber, formatPct } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { LiveSparkline } from "./live-sparkline";
import { resolveBareSymbol } from "@/lib/live-quotes/yahoo-symbol";

export type LiveSortKey =
  | "highest-profit"
  | "highest-loss"
  | "highest-day-gain"
  | "highest-day-loss"
  | "highest-allocation"
  | "alphabetical";

export const LIVE_SORT_OPTIONS: Array<{ key: LiveSortKey; label: string }> = [
  { key: "highest-profit", label: "Highest profit" },
  { key: "highest-loss", label: "Highest loss" },
  { key: "highest-day-gain", label: "Highest day gain" },
  { key: "highest-day-loss", label: "Highest day loss" },
  { key: "highest-allocation", label: "Highest allocation" },
  { key: "alphabetical", label: "Alphabetical" },
];

export interface LiveRow {
  holding: Holding;
  quote: LiveQuote | null;
  quantity: number;
  invested: number;
  livePrice: number | null;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number | null;
  dayChangePercent: number | null;
  open: number | null;
  previousClose: number | null;
  allocationPercent: number;
  history: number[];
}

interface LiveHoldingsTableProps {
  holdings: Holding[];
  quotes: QuoteMap;
  history: Record<string, number[]>;
  totalCurrentValue: number;
  sortKey: LiveSortKey;
  onSortChange: (key: LiveSortKey) => void;
  className?: string;
}

export function buildLiveRows(
  holdings: Holding[],
  quotes: QuoteMap,
  history: Record<string, number[]>,
  totalCurrentValue: number,
): LiveRow[] {
  const rows: LiveRow[] = [];
  for (const h of holdings) {
    const bare = resolveBareSymbol(h);
    const quote = bare ? quotes[bare] ?? null : null;
    const livePrice = quote?.price ?? null;
    const quantity = h.quantity ?? 0;
    const invested = h.investedAmount ?? quantity * (h.avgBuyPrice ?? 0);
    // If we don't have a live price, fall back to whatever currentPrice we imported.
    const effectivePrice = livePrice ?? h.currentPrice ?? h.avgBuyPrice ?? 0;
    const currentValue = quantity * effectivePrice;
    const pnl = currentValue - invested;
    const pnlPercent = invested > 0 ? pnl / invested : 0;
    const dayChange = quote?.dayChange != null && Number.isFinite(quote.dayChange) ? quote.dayChange * quantity : null;
    const dayChangePercent = quote?.dayChangePercent ?? null;
    const allocationPercent = totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;
    const spark = bare ? history[bare] ?? [] : [];
    rows.push({
      holding: h,
      quote,
      quantity,
      invested,
      livePrice,
      currentValue,
      pnl,
      pnlPercent,
      dayChange,
      dayChangePercent,
      open: quote?.open ?? null,
      previousClose: quote?.previousClose ?? null,
      allocationPercent,
      history: spark,
    });
  }
  return rows;
}

export function sortLiveRows(rows: LiveRow[], key: LiveSortKey): LiveRow[] {
  const copy = rows.slice();
  switch (key) {
    case "highest-profit":
      copy.sort((a, b) => b.pnl - a.pnl);
      break;
    case "highest-loss":
      copy.sort((a, b) => a.pnl - b.pnl);
      break;
    case "highest-day-gain":
      copy.sort((a, b) => (b.dayChange ?? -Infinity) - (a.dayChange ?? -Infinity));
      break;
    case "highest-day-loss":
      copy.sort((a, b) => (a.dayChange ?? Infinity) - (b.dayChange ?? Infinity));
      break;
    case "highest-allocation":
      copy.sort((a, b) => b.allocationPercent - a.allocationPercent);
      break;
    case "alphabetical":
      copy.sort((a, b) => a.holding.stockName.localeCompare(b.holding.stockName));
      break;
  }
  return copy;
}

export function LiveHoldingsTable({
  holdings,
  quotes,
  history,
  totalCurrentValue,
  sortKey,
  onSortChange,
  className,
}: LiveHoldingsTableProps) {
  const rows = React.useMemo(
    () => sortLiveRows(buildLiveRows(holdings, quotes, history, totalCurrentValue), sortKey),
    [holdings, quotes, history, totalCurrentValue, sortKey],
  );

  return (
    <div className={cn("glass p-5 flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold">Live holdings</h3>
          <p className="text-xs text-muted-foreground">
            Quantity × live price · sorted by {LIVE_SORT_OPTIONS.find((s) => s.key === sortKey)?.label.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LIVE_SORT_OPTIONS.map((opt) => {
            const active = opt.key === sortKey;
            const Icon = iconFor(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSortChange(opt.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200 shadow-glow-emerald"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-emerald-400/40 hover:text-emerald-200",
                )}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.05]">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <thead className="bg-[hsl(158_28%_10%)]/95 border-b border-white/10">
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <Th className="text-left w-[18%]">Company</Th>
              <Th className="text-right w-[5%]">Qty</Th>
              <Th className="text-right w-[7%]">Open</Th>
              <Th className="text-right w-[7%]">Prev close</Th>
              <Th className="text-right w-[8%]">Live price</Th>
              <Th className="text-right w-[7%]">Day Δ</Th>
              <Th className="text-right w-[6%]">Day %</Th>
              <Th className="text-right w-[8%]">Invested</Th>
              <Th className="text-right w-[8%]">Current value</Th>
              <Th className="text-right w-[8%]">P&L</Th>
              <Th className="text-right w-[7%]">P&L %</Th>
              <Th className="text-center w-[11%]">Today</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">
                  No holdings to track live.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <LiveRowView key={r.holding.id} row={r} index={idx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function iconFor(k: LiveSortKey): React.ComponentType<{ className?: string }> {
  switch (k) {
    case "highest-profit":
    case "highest-day-gain":
      return TrendingUp;
    case "highest-loss":
    case "highest-day-loss":
      return TrendingDown;
    default:
      return ArrowUpDown;
  }
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-2 py-2 font-medium", className)}>{children}</th>;
}

interface RowViewProps { row: LiveRow; index: number }

const LiveRowView = React.memo(function LiveRowView({ row, index }: RowViewProps) {
  const { holding, quote, quantity, invested, livePrice, currentValue, pnl, pnlPercent, dayChange, dayChangePercent, open, previousClose, history } = row;
  const gain = pnl >= 0;
  const dayGain = (dayChange ?? 0) >= 0;
  const hasLive = quote != null && livePrice != null;
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(0.12, index * 0.012) }}
      className={cn(
        "border-b border-white/[0.04] transition-colors",
        "hover:bg-white/[0.02]",
        !hasLive && "opacity-90",
      )}
    >
      <td className="px-2 py-2 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/[0.08] text-[11px] font-semibold text-emerald-200">
            {holding.stockName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium">{holding.stockName}</span>
            <span className="truncate text-[10px] text-muted-foreground">
              {holding.symbol || "—"} · {holding.exchange}
              {!hasLive && <span className="ml-1 inline-flex items-center gap-1 text-amber-300/80"><WifiOff className="h-3 w-3" />no live</span>}
            </span>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-right money-tabular">{formatNumber(quantity)}</td>
      <td className="px-2 py-2 text-right money-tabular text-muted-foreground">
        {open != null ? formatINR(open, true) : "—"}
      </td>
      <td className="px-2 py-2 text-right money-tabular text-muted-foreground">
        {previousClose != null ? formatINR(previousClose, true) : "—"}
      </td>
      <td className="px-2 py-2 text-right">
        <AnimatedNumber
          value={livePrice}
          format={(v) => formatINR(v, true)}
          tone={dayChange}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <AnimatedNumber value={dayChange} format={(v) => formatINR(v)} tone={dayChange} />
      </td>
      <td className={cn("px-2 py-2 text-right", dayGain ? "text-emerald-300" : "text-red-400")}>
        <AnimatedNumber
          value={dayChangePercent}
          format={(v) => formatPct(v)}
          tone={dayChangePercent}
          flash={false}
        />
      </td>
      <td className="px-2 py-2 text-right money-tabular text-muted-foreground">{formatINR(invested)}</td>
      <td className="px-2 py-2 text-right">
        <AnimatedNumber value={currentValue} format={(v) => formatINR(v)} />
      </td>
      <td className={cn("px-2 py-2 text-right font-medium", gain ? "text-emerald-300" : "text-red-400")}>
        <AnimatedNumber value={pnl} format={(v) => formatINR(v)} tone={pnl} />
      </td>
      <td className={cn("px-2 py-2 text-right", gain ? "text-emerald-300" : "text-red-400")}>
        <AnimatedNumber value={pnlPercent} format={(v) => formatPct(v)} tone={pnlPercent} flash={false} />
      </td>
      <td className="px-2 py-2 text-center">
        <LiveSparkline values={history} baseline={previousClose ?? undefined} />
      </td>
    </motion.tr>
  );
});

function iconForSort(k: LiveSortKey): React.ComponentType<{ className?: string }> {
  return iconFor(k);
}
void iconForSort;
void ArrowUp;
void ArrowDown;
