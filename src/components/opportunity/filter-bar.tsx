"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import type {
  OpportunityAnalysis,
  OpportunityFilterState,
  OpportunityTag,
  Recommendation,
  RiskLevel,
} from "@/types/opportunity";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const DEFAULT_OPPORTUNITY_FILTER: OpportunityFilterState = {
  recommendations: [],
  tags: [],
  sector: "all",
  riskLevel: "all",
  query: "",
  minScore: 0,
  onlyInPortfolio: false,
};

const REC_ORDER: Recommendation[] = ["strong-buy", "buy", "hold", "sell", "strong-sell"];
const REC_LABEL: Record<Recommendation, string> = {
  "strong-buy": "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  "strong-sell": "Strong Sell",
};
const TAG_ORDER: OpportunityTag[] = ["cheap", "growth", "dividend", "high-quality", "turnaround"];
const TAG_LABEL: Record<OpportunityTag, string> = {
  cheap: "Cheap",
  growth: "Growth",
  dividend: "Dividend",
  "high-quality": "High quality",
  turnaround: "Turnaround",
};
const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "very-high"];
const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "Very high",
};

interface FilterBarProps {
  state: OpportunityFilterState;
  onChange: (next: OpportunityFilterState) => void;
  sectors: string[];
  portfolioSymbols?: string[];
  hasPortfolio?: boolean;
  matched?: number;
  total?: number;
}

function FilterBarBase({
  state,
  onChange,
  sectors,
  hasPortfolio = false,
  matched,
  total,
}: FilterBarProps) {
  const toggleRec = React.useCallback(
    (r: Recommendation) => {
      const next = state.recommendations.includes(r)
        ? state.recommendations.filter((x) => x !== r)
        : [...state.recommendations, r];
      onChange({ ...state, recommendations: next });
    },
    [state, onChange],
  );
  const toggleTag = React.useCallback(
    (t: OpportunityTag) => {
      const next = state.tags.includes(t) ? state.tags.filter((x) => x !== t) : [...state.tags, t];
      onChange({ ...state, tags: next });
    },
    [state, onChange],
  );
  const isDefault =
    state.recommendations.length === 0 &&
    state.tags.length === 0 &&
    state.sector === "all" &&
    state.riskLevel === "all" &&
    state.query === "" &&
    state.minScore === 0 &&
    !state.onlyInPortfolio;

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl border border-white/[0.06] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, symbol, sector\u2026"
            value={state.query}
            onChange={(e) => onChange({ ...state, query: e.target.value })}
            className="h-9 pl-9"
          />
          {state.query && (
            <button
              type="button"
              onClick={() => onChange({ ...state, query: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wider">Min score</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={state.minScore}
            onChange={(e) => onChange({ ...state, minScore: Number(e.target.value) })}
            className="accent-emerald-400"
          />
          <span className="w-8 font-mono text-foreground">{state.minScore}</span>
        </div>
        {hasPortfolio && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground hover:border-emerald-400/40">
            <input
              type="checkbox"
              checked={state.onlyInPortfolio}
              onChange={(e) => onChange({ ...state, onlyInPortfolio: e.target.checked })}
              className="accent-emerald-400"
            />
            <span className="uppercase tracking-wider">In portfolio only</span>
          </label>
        )}
        {typeof matched === "number" && typeof total === "number" && (
          <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
            {matched} of {total}
          </span>
        )}
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_OPPORTUNITY_FILTER })}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:border-red-400/40 hover:text-red-200"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {REC_ORDER.map((r) => {
          const active = state.recommendations.includes(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => toggleRec(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                active
                  ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              {REC_LABEL[r]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {TAG_ORDER.map((t) => {
          const active = state.tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                active
                  ? "border-violet-400/50 bg-violet-500/[0.12] text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              {TAG_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Sector</div>
          <Select value={state.sector} onValueChange={(v) => onChange({ ...state, sector: v })}>
            <SelectTrigger>
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Risk level</div>
          <Select
            value={state.riskLevel}
            onValueChange={(v) => onChange({ ...state, riskLevel: v as RiskLevel | "all" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any risk</SelectItem>
              {RISK_ORDER.map((r) => (
                <SelectItem key={r} value={r}>
                  {RISK_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export const FilterBar = React.memo(FilterBarBase);

export function applyOpportunityFilters(
  analyses: OpportunityAnalysis[],
  state: OpportunityFilterState,
  portfolioSymbols?: string[],
): OpportunityAnalysis[] {
  const portfolioSet = new Set((portfolioSymbols ?? []).map((s) => s.toUpperCase()));
  const query = state.query.trim().toLowerCase();
  return analyses.filter((a) => {
    if (state.recommendations.length > 0 && !state.recommendations.includes(a.recommendation)) return false;
    if (state.tags.length > 0 && !state.tags.some((t) => a.tags.includes(t))) return false;
    if (state.sector !== "all" && (a.sector ?? "Unknown") !== state.sector) return false;
    if (state.riskLevel !== "all" && a.risk.level !== state.riskLevel) return false;
    if (a.advisorScore < state.minScore) return false;
    if (state.onlyInPortfolio && !portfolioSet.has(a.symbol.toUpperCase())) return false;
    if (query) {
      const blob = `${a.name} ${a.symbol} ${a.sector ?? ""} ${a.industry ?? ""}`.toLowerCase();
      if (!blob.includes(query)) return false;
    }
    return true;
  });
}
