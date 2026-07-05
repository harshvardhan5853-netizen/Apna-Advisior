"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Sparkles, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { combineHoldings } from "@/lib/analytics";
import { useOpportunities } from "@/hooks/use-opportunities";
import { usePortfolios } from "@/hooks/use-portfolios";
import { cn } from "@/lib/utils";
import type { OpportunityAnalysis, OpportunityFilterState } from "@/types/opportunity";

import { FilterBar, DEFAULT_OPPORTUNITY_FILTER, applyOpportunityFilters } from "./filter-bar";
import { OpportunityDrawer } from "./opportunity-drawer";
import { OpportunitySections } from "./opportunity-sections";
import { SummaryTiles } from "./summary-tiles";

export function OpportunityView() {
  const portfolios = usePortfolios();
  const [filter, setFilter] = React.useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTER);
  const [selected, setSelected] = React.useState<OpportunityAnalysis | null>(null);

  const portfolioSymbols = React.useMemo(() => {
    if (!portfolios || portfolios.length === 0) return [] as string[];
    const combined = combineHoldings(portfolios);
    return combined
      .map((h) => h.symbol?.toUpperCase() ?? "")
      .filter((s): s is string => s.length > 0);
  }, [portfolios]);

  const symbols = portfolioSymbols;

  const { analyses, loading, refreshing, error, lastUpdated, missing, warnings, refresh } =
    useOpportunities({ symbols });

  const sectors = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of analyses) {
      if (a.sector) set.add(a.sector);
    }
    return Array.from(set).sort();
  }, [analyses]);

  const filtered = React.useMemo(
    () => applyOpportunityFilters(analyses, filter, portfolioSymbols),
    [analyses, filter, portfolioSymbols],
  );

  const hasSymbols = symbols.length > 0;
  const isLoadingCold = loading && analyses.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="glass flex flex-col gap-3 rounded-2xl border border-white/[0.06] p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-violet-400/30 bg-violet-500/[0.08] p-2 text-violet-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scanning your {portfolioSymbols.length} portfolio holdings
            </div>
            <div className="text-sm text-muted-foreground">
              {analyses.length > 0
                ? `${analyses.length} analyses ready · ${missing.length} missing${lastUpdated ? ` · updated ${formatClock(lastUpdated)}` : ""}`
                : "Fundamentals, technicals, valuation and news scoring."}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refresh()} disabled={refreshing || !hasSymbols}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </header>

      {!hasSymbols ? (
        <EmptyState />
      ) : isLoadingCold ? (
        <LoadingState />
      ) : (
        <>
          {error && <ErrorBanner message={error} />}
          {warnings.length > 0 && <WarningsBanner warnings={warnings} />}
          <SummaryTiles analyses={analyses} />
          <FilterBar
            state={filter}
            onChange={setFilter}
            sectors={sectors}
            portfolioSymbols={portfolioSymbols}
            hasPortfolio={portfolioSymbols.length > 0}
            matched={filtered.length}
            total={analyses.length}
          />
          <OpportunitySections
            analyses={filtered}
            portfolioSymbols={portfolioSymbols}
            onSelectAnalysis={setSelected}
          />
        </>
      )}

      <OpportunityDrawer
        analysis={selected}
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] p-10 text-center"
    >
      <div className="rounded-full border border-violet-400/30 bg-violet-500/[0.08] p-3 text-violet-300">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="font-display text-lg font-semibold">No portfolios yet</div>
      <p className="max-w-md text-sm text-muted-foreground">
        Add a portfolio from the dashboard to start scoring opportunities across your holdings and the tracked NSE
        universe.
      </p>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-52 rounded-2xl border border-white/[0.05] bg-white/[0.02]"
        />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-4 text-sm text-red-200">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">Something went wrong</div>
        <div className="text-red-200/80">{message}</div>
      </div>
    </div>
  );
}

function WarningsBanner({ warnings }: { warnings: string[] }) {
  const preview = warnings.slice(0, 3);
  const extra = warnings.length - preview.length;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">Some analyses had warnings</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-amber-100/80">
          {preview.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
          {extra > 0 && <li>+{extra} more</li>}
        </ul>
      </div>
    </div>
  );
}

function formatClock(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}
