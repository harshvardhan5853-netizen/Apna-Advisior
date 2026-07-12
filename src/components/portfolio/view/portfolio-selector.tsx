"use client";

import * as React from "react";
import { Search, Layers, Star, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatCompactINR, formatPct } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Portfolio } from "@/types/portfolio";

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  activeId: string | null;
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
}

export function PortfolioSelector({ portfolios, activeId, selectedId, onSelect }: PortfolioSelectorProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return portfolios;
    return portfolios.filter((p) => p.name.toLowerCase().includes(q));
  }, [portfolios, query]);

  const combinedTotals = React.useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let holdingCount = 0;
    for (const p of portfolios) {
      invested += p.totals?.invested ?? 0;
      currentValue += p.totals?.currentValue ?? 0;
      holdingCount += p.totals?.holdingCount ?? p.holdings.length;
    }
    const pnl = currentValue - invested;
    const pnlPercent = invested > 0 ? pnl / invested : 0;
    return { invested, currentValue, pnl, pnlPercent, holdingCount };
  }, [portfolios]);

  return (
    <div className="glass flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Portfolio</div>
          <div className="font-display text-lg font-semibold">Choose which portfolios to view</div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search portfolios\u2026"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SelectorChip
          selected={selectedId === "all"}
          onClick={() => onSelect("all")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="All Portfolios Combined"
          sub={`${portfolios.length} portfolios \u00b7 ${combinedTotals.holdingCount} stocks`}
          value={formatCompactINR(combinedTotals.currentValue)}
          pctValue={combinedTotals.pnlPercent}
        />
        {filtered.map((p) => {
          const isActive = p.id === activeId;
          const isArchived = p.status === "archived";
          return (
            <SelectorChip
              key={p.id}
              selected={selectedId === p.id}
              onClick={() => onSelect(p.id)}
              icon={
                isActive ? (
                  <Star className="h-3.5 w-3.5 text-emerald-300" fill="currentColor" />
                ) : isArchived ? (
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )
              }
              label={p.name}
              sub={`${p.holdings.length} stocks \u00b7 ${isArchived ? "Archived" : "Active"}`}
              value={formatCompactINR(p.totals?.currentValue ?? 0)}
              pctValue={p.totals?.pnlPercent ?? 0}
            />
          );
        })}
        {filtered.length === 0 && query.trim() && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
            No portfolios match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}

interface SelectorChipProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  pctValue: number;
}

function SelectorChip({ selected, onClick, icon, label, sub, value, pctValue }: SelectorChipProps) {
  const gain = pctValue >= 0;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex min-w-[220px] flex-1 flex-col items-start gap-2 overflow-hidden rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-emerald-400/50 bg-emerald-500/[0.08] shadow-glow-emerald"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            {icon}
          </div>
          <div className="text-sm font-semibold text-foreground line-clamp-1">{label}</div>
        </div>
        <div className={cn("text-[11px] font-semibold", gain ? "text-emerald-300" : "text-red-400")}>{formatPct(pctValue)}</div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="line-clamp-1">{sub}</div>
        <div className="money-tabular text-xs font-semibold text-foreground">{value}</div>
      </div>
    </motion.button>
  );
}
