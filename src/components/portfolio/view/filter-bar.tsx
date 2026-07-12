"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, TrendingUp, TrendingDown, Crown, Clock, Landmark, ArrowUpDown, ArrowDownWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CombinedHolding } from "@/types/portfolio";

export type QuickFilter =
  | "all"
  | "profit"
  | "loss"
  | "top-allocation"
  | "recently-added"
  | "large-cap"
  | "mid-cap"
  | "small-cap"
  | "return-strong"
  | "return-moderate"
  | "return-weak"
  | "return-slide";

export interface FilterState {
  quick: QuickFilter;
  sector: string | "all";
  portfolio: string | "all";
}

interface FilterBarProps {
  state: FilterState;
  onChange: (next: FilterState) => void;
  sectors: string[];
  portfolios: Array<{ id: string; name: string }>;
  matched: number;
  total: number;
}

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string; icon: React.ReactNode }> = [
  { key: "all", label: "All", icon: <Filter className="h-3.5 w-3.5" /> },
  { key: "profit", label: "In profit", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: "loss", label: "In loss", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { key: "top-allocation", label: "Top allocation", icon: <Crown className="h-3.5 w-3.5" /> },
  { key: "recently-added", label: "Recently added", icon: <Clock className="h-3.5 w-3.5" /> },
  { key: "large-cap", label: "Large cap", icon: <Landmark className="h-3.5 w-3.5" /> },
  { key: "mid-cap", label: "Mid cap", icon: <Landmark className="h-3.5 w-3.5" /> },
  { key: "small-cap", label: "Small cap", icon: <Landmark className="h-3.5 w-3.5" /> },
  { key: "return-strong", label: "Return > 20%", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: "return-moderate", label: "Return 5–20%", icon: <ArrowUpDown className="h-3.5 w-3.5" /> },
  { key: "return-weak", label: "Loss < -10%", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { key: "return-slide", label: "Loss 0–10%", icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" /> },
];

export function FilterBar({ state, onChange, sectors, portfolios, matched, total }: FilterBarProps) {
  const hasNonDefault = state.quick !== "all" || state.sector !== "all" || state.portfolio !== "all";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange({ ...state, quick: f.key })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              state.quick === f.key
                ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200"
                : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-foreground",
            )}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sectors.length > 0 && (
          <PillSelect
            label="Sector"
            value={state.sector}
            onChange={(v) => onChange({ ...state, sector: v as FilterState["sector"] })}
            options={[{ value: "all", label: "All sectors" }, ...sectors.map((s) => ({ value: s, label: s }))]}
          />
        )}
        {portfolios.length > 1 && (
          <PillSelect
            label="Portfolio"
            value={state.portfolio}
            onChange={(v) => onChange({ ...state, portfolio: v as FilterState["portfolio"] })}
            options={[{ value: "all", label: "All portfolios" }, ...portfolios.map((p) => ({ value: p.id, label: p.name }))]}
          />
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{matched}</span>
          <span>of {total} holdings</span>
          <AnimatePresence>
            {hasNonDefault && (
              <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange({ quick: "all", sector: "all", portfolio: "all" })}
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface PillSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

function PillSelect({ label, value, onChange, options }: PillSelectProps) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs font-medium text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[hsl(158_28%_10%)]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function applyFilters(holdings: CombinedHolding[], state: FilterState): CombinedHolding[] {
  const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return holdings.filter((h) => {
    switch (state.quick) {
      case "profit":
        if (h.pnl <= 0) return false;
        break;
      case "loss":
        if (h.pnl >= 0) return false;
        break;
      case "top-allocation":
        if (h.allocationPercent < 5) return false;
        break;
      case "recently-added":
        if ((h.importedAt ?? 0) < recentThreshold) return false;
        break;
      case "large-cap":
        if (h.marketCap !== "Large") return false;
        break;
      case "mid-cap":
        if (h.marketCap !== "Mid") return false;
        break;
      case "small-cap":
        if (h.marketCap !== "Small") return false;
        break;
      case "return-strong":
        if (h.pnlPercent < 0.2) return false;
        break;
      case "return-moderate":
        if (h.pnlPercent < 0.05 || h.pnlPercent >= 0.2) return false;
        break;
      case "return-weak":
        if (h.pnlPercent > -0.1) return false;
        break;
      case "return-slide":
        if (h.pnlPercent > 0 || h.pnlPercent <= -0.1) return false;
        break;
      default:
        break;
    }
    if (state.sector !== "all" && (h.sector || "Unknown") !== state.sector) return false;
    if (state.portfolio !== "all" && !h.sources.some((s) => s.portfolioId === state.portfolio)) return false;
    return true;
  });
}
