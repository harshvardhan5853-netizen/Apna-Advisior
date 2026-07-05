"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { cn, formatCompactINR, formatINR } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { TargetGapRow } from "@/types/target-portfolio";

interface RebalanceTableProps {
  rows: TargetGapRow[];
  className?: string;
}

export function RebalanceTable({ rows, className }: RebalanceTableProps) {
  if (rows.length === 0) {
    return (
      <div className={cn("glass p-8 text-center text-sm text-muted-foreground", className)}>
        No allocations yet. Edit this target to add stocks.
      </div>
    );
  }
  return (
    <div className={cn("glass overflow-hidden p-0", className)}>
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Allocations</div>
          <div className="font-display text-base font-semibold">Gap analysis · {rows.length} stocks</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Diff = Current − Target · Positive = over-allocated
        </div>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <Th align="left" width="18%">Stock</Th>
            <Th align="right" width="8%">Target %</Th>
            <Th align="right" width="8%">Current %</Th>
            <Th align="right" width="8%">Diff %</Th>
            <Th align="right" width="11%">Current value</Th>
            <Th align="right" width="11%">Invest</Th>
            <Th align="right" width="11%">Trim</Th>
            <Th align="left" width="13%">Status</Th>
            <Th align="left" width="12%">Suggestion</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => (
            <RowView key={r.allocationId} row={r} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RowView = React.memo(function RowView({ row, index }: { row: TargetGapRow; index: number }) {
  const diffTone =
    row.status === "on-target"
      ? "text-emerald-300"
      : row.status === "under-allocated"
        ? "text-amber-200"
        : "text-red-300";
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(0.15, index * 0.015) }}
      className={cn(
        "border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]",
        !row.matched && row.targetPercent > 0 && "bg-amber-500/[0.03]",
      )}
    >
      <Td align="left">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/[0.08] font-display text-[10px] font-semibold text-emerald-200">
            {row.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.stockName || row.symbol}</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.symbol}
              {row.sector ? ` · ${row.sector}` : ""}
            </div>
          </div>
        </div>
      </Td>
      <Td align="right" className="money-tabular font-semibold text-foreground">
        {row.targetPercent > 0 ? `${row.targetPercent.toFixed(1)}%` : "—"}
      </Td>
      <Td align="right" className="money-tabular">
        {row.currentPercent > 0 ? `${row.currentPercent.toFixed(1)}%` : "0.0%"}
      </Td>
      <Td align="right" className={cn("money-tabular font-semibold", diffTone)}>
        {row.diffPercent === 0 ? "0.0%" : `${row.diffPercent > 0 ? "+" : ""}${row.diffPercent.toFixed(1)}%`}
      </Td>
      <Td align="right" className="money-tabular text-muted-foreground">
        {formatCompactINR(row.currentValue)}
      </Td>
      <Td align="right" className="money-tabular text-amber-200">
        {row.requiredInvestment > 0 ? formatCompactINR(row.requiredInvestment) : "—"}
      </Td>
      <Td align="right" className="money-tabular text-red-300">
        {row.requiredReduction > 0 ? formatCompactINR(row.requiredReduction) : "—"}
      </Td>
      <Td align="left">
        <StatusBadge status={row.status} />
      </Td>
      <Td align="left">
        <div className="flex items-start gap-1 text-[11px] text-muted-foreground line-clamp-2" title={row.suggestion}>
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300/70" />
          <span className="line-clamp-2">{formatShortSuggestion(row)}</span>
        </div>
      </Td>
    </motion.tr>
  );
});

function formatShortSuggestion(row: TargetGapRow): string {
  if (row.status === "on-target") return "Hold — within target band.";
  if (row.status === "under-allocated") {
    return row.matched
      ? `Invest ${formatINR(row.requiredInvestment)} more`
      : `Start position — invest ${formatINR(row.requiredInvestment)}`;
  }
  return row.matched && row.targetPercent > 0
    ? `Trim ${formatINR(row.requiredReduction)}`
    : `Not in target — consider trimming`;
}

function Th({
  children,
  align,
  width,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  width?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 py-3 font-semibold",
        align === "right" ? "text-right" : "text-left",
      )}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 align-middle",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
