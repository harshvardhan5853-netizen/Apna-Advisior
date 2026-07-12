"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, LayoutGrid, Radio } from "lucide-react";
import { usePortfolios, useActivePortfolioId } from "@/hooks/use-portfolios";
import {
  combineHoldings,
  computeGrowthSeries,
  computeHighlights,
  computePnlTrend,
  computeSectorAllocation,
  computeStockAllocation,
  computeSummary,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PortfolioSelector } from "./portfolio-selector";
import { SummaryCards } from "./summary-cards";
import { AnalyticsHighlights } from "./analytics-highlights";
import { FilterBar, applyFilters, type FilterState } from "./filter-bar";
import { HoldingsTable } from "./holdings-table";
import { StockDrawer } from "./stock-drawer";
import { GrowthChart } from "./charts/growth-chart";
import { StockAllocationPie } from "./charts/stock-allocation-pie";
import { SectorAllocationChart } from "./charts/sector-allocation-chart";
import { PnlTrendChart } from "./charts/pnl-trend-chart";
import { ExportMenu } from "./export-menu";
import { PortfolioViewEmptyState } from "./empty-state";
import { LiveView } from "./live-portfolio/live-view";
import { TimelineEvents } from "./timeline-events";
import { RecoveryWizard } from "./recovery-wizard";

type ViewMode = "snapshot" | "live";

export function PortfolioViewPage() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();

  const [selectedId, setSelectedId] = React.useState<string | "all">("all");
  const [filter, setFilter] = React.useState<FilterState>({ quick: "all", sector: "all", portfolio: "all" });
  const [drawerHoldingId, setDrawerHoldingId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("snapshot");

  const loading = portfolios === undefined || activeId === undefined;
  const isEmpty = !loading && (portfolios?.length ?? 0) === 0;

  const visiblePortfolios = React.useMemo(() => {
    if (!portfolios) return [];
    if (selectedId === "all") return portfolios;
    return portfolios.filter((p) => p.id === selectedId);
  }, [portfolios, selectedId]);

  const holdings = React.useMemo(() => combineHoldings(visiblePortfolios), [visiblePortfolios]);
  const sectorAllocation = React.useMemo(() => computeSectorAllocation(holdings), [holdings]);
  const summary = React.useMemo(() => computeSummary(holdings), [holdings]);
  const highlights = React.useMemo(() => computeHighlights(holdings, sectorAllocation), [holdings, sectorAllocation]);
  const filteredHoldings = React.useMemo(() => applyFilters(holdings, filter), [holdings, filter]);
  const filteredStockAllocation = React.useMemo(() => computeStockAllocation(filteredHoldings, 8), [filteredHoldings]);
  const growthSeries = React.useMemo(() => computeGrowthSeries(filteredHoldings), [filteredHoldings]);
  const pnlTrend = React.useMemo(() => computePnlTrend(filteredHoldings, 15), [filteredHoldings]);
  void growthSeries;
  void pnlTrend;

  const sectorOptions = React.useMemo(() => sectorAllocation.map((s) => s.sector), [sectorAllocation]);
  const portfolioOptions = React.useMemo(
    () => (portfolios ?? []).map((p) => ({ id: p.id, name: p.name })),
    [portfolios],
  );
  const scopeLabel = React.useMemo(() => {
    if (selectedId === "all") return "All portfolios combined";
    return portfolios?.find((p) => p.id === selectedId)?.name || "Portfolio";
  }, [selectedId, portfolios]);

  const activeHolding = React.useMemo(
    () => (drawerHoldingId ? holdings.find((h) => h.id === drawerHoldingId) ?? null : null),
    [drawerHoldingId, holdings],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return <PortfolioViewEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ViewModeToggle mode={viewMode} onChange={setViewMode} holdingCount={holdings.length} />

      {viewMode === "live" ? (
        <LiveView />
      ) : (
        <SnapshotView
          portfolios={portfolios!}
          activeId={activeId ?? null}
          selectedId={selectedId}
          onSelectPortfolio={setSelectedId}
          summary={summary}
          highlights={highlights}
          scopeLabel={scopeLabel}
          holdings={holdings}
          filteredHoldings={filteredHoldings}
          filteredStockAllocation={filteredStockAllocation}
          sectorAllocation={sectorAllocation}
          sectorOptions={sectorOptions}
          portfolioOptions={portfolioOptions}
          filter={filter}
          onFilterChange={setFilter}
          activeHolding={activeHolding}
          drawerHoldingId={drawerHoldingId}
          onSelectHolding={setDrawerHoldingId}
        />
      )}
    </div>
  );
}

interface SnapshotViewProps {
  portfolios: ReturnType<typeof usePortfolios> extends undefined ? never : NonNullable<ReturnType<typeof usePortfolios>>;
  activeId: string | null;
  selectedId: string | "all";
  onSelectPortfolio: (id: string | "all") => void;
  summary: ReturnType<typeof computeSummary>;
  highlights: ReturnType<typeof computeHighlights>;
  scopeLabel: string;
  holdings: ReturnType<typeof combineHoldings>;
  filteredHoldings: ReturnType<typeof combineHoldings>;
  filteredStockAllocation: ReturnType<typeof computeStockAllocation>;
  sectorAllocation: ReturnType<typeof computeSectorAllocation>;
  sectorOptions: string[];
  portfolioOptions: Array<{ id: string; name: string }>;
  filter: FilterState;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>;
  activeHolding: ReturnType<typeof combineHoldings>[number] | null;
  drawerHoldingId: string | null;
  onSelectHolding: (id: string | null) => void;
}

function SnapshotView(props: SnapshotViewProps) {
  const { onSelectHolding } = props;
  const onDrawerOpenChange = React.useCallback(
    (o: boolean) => {
      if (!o) onSelectHolding(null);
    },
    [onSelectHolding],
  );
  const {
    portfolios,
    activeId,
    selectedId,
    onSelectPortfolio,
    summary,
    highlights,
    scopeLabel,
    holdings,
    filteredHoldings,
    filteredStockAllocation,
    sectorAllocation,
    sectorOptions,
    portfolioOptions,
    filter,
    onFilterChange,
    activeHolding,
    drawerHoldingId,
  } = props;
  return (
    <>
      <RecoveryWizard />

      <PortfolioSelector
        portfolios={portfolios}
        activeId={activeId}
        selectedId={selectedId}
        onSelect={onSelectPortfolio}
      />

      <SummaryCards summary={summary} />

      <AnalyticsHighlights highlights={highlights} onSelectHolding={onSelectHolding} />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass flex flex-col gap-4 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <LayoutGrid className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Holdings</div>
              <div className="text-xs text-muted-foreground">
                {scopeLabel} · {holdings.length} stocks
              </div>
            </div>
          </div>
          <ExportMenu
            scopeLabel={scopeLabel}
            holdings={filteredHoldings}
            summary={summary}
            sectors={sectorAllocation}
          />
        </div>

        <FilterBar
          state={filter}
          onChange={onFilterChange}
          sectors={sectorOptions}
          portfolios={portfolioOptions}
          matched={filteredHoldings.length}
          total={holdings.length}
        />

        <HoldingsTable holdings={filteredHoldings} onSelectHolding={onSelectHolding} />
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2">
        <GrowthChart holdings={filteredHoldings} invested={summary.invested} />
        <StockAllocationPie data={filteredStockAllocation} />
        <SectorAllocationChart data={sectorAllocation} />
        <PnlTrendChart holdings={filteredHoldings} />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass flex flex-col gap-4 p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-indigo-300">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Timeline</div>
              <div className="text-xs text-muted-foreground">Portfolio events & merge history</div>
            </div>
          </div>
          <Link
            href="/portfolio/history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View full history
          </Link>
        </div>
        <TimelineEvents portfolioId={selectedId} max={30} />
      </motion.section>

      <StockDrawer
        holding={activeHolding}
        open={!!drawerHoldingId}
        onOpenChange={onDrawerOpenChange}
      />
    </>
  );
}

function ViewModeToggle({
  mode,
  onChange,
  holdingCount,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  holdingCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative glass overflow-hidden p-4 md:p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/[0.12] blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/[0.1]">
            <Radio className="h-5 w-5 text-emerald-300" />
            {mode === "live" && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-display text-lg font-semibold">
                {mode === "live" ? "Live Portfolio" : "Portfolio Snapshot"}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                {mode === "live" ? "Live" : "Snapshot"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === "live"
                ? "Real-time NSE prices \u00b7 auto-refresh every 20s \u00b7 Yahoo Finance"
                : "Imported cost basis \u00b7 holdings, analytics, exports"}
              {holdingCount > 0 && <> \u00b7 {holdingCount} stock{holdingCount === 1 ? "" : "s"}</>}
            </div>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Portfolio view mode"
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm"
        >
          <button
            role="tab"
            aria-selected={mode === "snapshot"}
            type="button"
            onClick={() => onChange("snapshot")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              mode === "snapshot"
                ? "bg-emerald-500/[0.16] text-emerald-100 shadow-glow-emerald"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Snapshot
          </button>
          <button
            role="tab"
            aria-selected={mode === "live"}
            type="button"
            onClick={() => onChange("live")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              mode === "live"
                ? "bg-emerald-500/[0.16] text-emerald-100 shadow-glow-emerald"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Live
          </button>
        </div>
      </div>
    </motion.div>
  );
}
