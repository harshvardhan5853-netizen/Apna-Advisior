"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BookmarkPlus, ClipboardCheck, Gauge, History, Pencil, Trash2, Wallet, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolios } from "@/hooks/use-portfolios";
import {
  useActiveTargetPortfolioId,
  useRebalanceHistory,
  useTargetPortfolios,
} from "@/hooks/use-target-portfolios";
import { combineHoldings } from "@/lib/analytics";
import {
  deleteRebalanceEntry,
  logRebalance,
  saveTargetVersion,
  switchActiveTargetPortfolio,
} from "@/lib/target-store";
import { computeTargetGap } from "@/lib/target-analytics";
import { cn, formatCompactINR, formatINR, formatPct } from "@/lib/utils";
import type { RebalanceHistoryEntry, TargetPortfolio } from "@/types/target-portfolio";

import { CreateTargetDialog } from "./create-dialog";
import { EditTargetDialog } from "./edit-dialog";
import { TargetEmptyState } from "./empty-state";
import { TargetSelector } from "./target-selector";
import { TargetSummaryTiles } from "./summary-tiles";
import { RebalanceTable } from "./rebalance-table";
import { RebalancePanel } from "./rebalance-panel";
import { BeforeAfterChart, TargetCharts } from "./charts";

export function TargetView() {
  const portfolios = usePortfolios();
  const targetPortfolios = useTargetPortfolios();
  const activeTargetId = useActiveTargetPortfolioId();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [capitalStr, setCapitalStr] = React.useState<string>("");

  // Seed selectedId from active target on first load / when list changes
  React.useEffect(() => {
    if (!targetPortfolios) return;
    if (selectedId && targetPortfolios.some((t) => t.id === selectedId)) return;
    if (activeTargetId && targetPortfolios.some((t) => t.id === activeTargetId)) {
      setSelectedId(activeTargetId);
      return;
    }
    const firstActive = targetPortfolios.find((t) => t.status === "active");
    setSelectedId(firstActive?.id ?? targetPortfolios[0]?.id ?? null);
  }, [targetPortfolios, activeTargetId, selectedId]);

  const combined = React.useMemo(
    () => combineHoldings(portfolios ?? []),
    [portfolios],
  );

  const currentInvestedValue = React.useMemo(
    () => combined.reduce((sum, h) => sum + h.currentValue, 0),
    [combined],
  );

  const selectedTarget: TargetPortfolio | null = React.useMemo(() => {
    if (!targetPortfolios || !selectedId) return null;
    return targetPortfolios.find((t) => t.id === selectedId) ?? null;
  }, [targetPortfolios, selectedId]);

  const capitalOverride = React.useMemo(() => {
    const n = Number(capitalStr);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [capitalStr]);

  const gap = React.useMemo(() => {
    if (!selectedTarget) return null;
    return computeTargetGap(
      selectedTarget,
      combined,
      capitalOverride ?? selectedTarget.totalCapitalOverride ?? null,
    );
  }, [selectedTarget, combined, capitalOverride]);

  const loading = portfolios === undefined || targetPortfolios === undefined;

  const handleSelect = React.useCallback(
    async (id: string) => {
      setSelectedId(id);
      try {
        await switchActiveTargetPortfolio(id);
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const handleCreated = React.useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleEditSaved = React.useCallback(() => {
    setEditOpen(false);
  }, []);

  const handleEditDeleted = React.useCallback(() => {
    setEditOpen(false);
    setSelectedId(null);
  }, []);

  const handleSaveVersion = React.useCallback(async () => {
    if (!selectedTarget) return;
    try {
      const snap = await saveTargetVersion(selectedTarget.id);
      if (snap) {
        toast.success(`Saved snapshot "${snap.name}"`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save version");
    }
  }, [selectedTarget]);

  const history = useRebalanceHistory(selectedTarget?.id ?? null);

  const handleLogRebalance = React.useCallback(async () => {
    if (!selectedTarget || !gap) return;
    try {
      await logRebalance({ target: selectedTarget, summary: gap.summary });
      toast.success("Rebalance logged");
    } catch (err) {
      console.error(err);
      toast.error("Could not log rebalance");
    }
  }, [selectedTarget, gap]);

  const handleDeleteHistoryEntry = React.useCallback(async (id: string) => {
    try {
      await deleteRebalanceEntry(id);
      toast.success("Entry removed");
    } catch (err) {
      console.error(err);
      toast.error("Could not delete entry");
    }
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const hasTargets = (targetPortfolios ?? []).length > 0;

  if (!hasTargets) {
    return (
      <>
        <TargetEmptyState onCreate={() => setCreateOpen(true)} />
        <CreateTargetDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      </>
    );
  }

  const hasPortfolioData = combined.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <TargetSelector
        portfolios={targetPortfolios ?? []}
        activeId={activeTargetId ?? null}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCreate={() => setCreateOpen(true)}
      />

      {!hasPortfolioData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 text-sm"
        >
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-amber-100/90">
            No matching portfolio holdings found. Rebalance amounts use the
            target capital you enter below. Import a portfolio to see live gaps.
          </div>
        </motion.div>
      )}

      {selectedTarget && (
        <section className="glass flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Editing
              </div>
              <div className="mt-1 font-display text-lg font-semibold">
                {selectedTarget.name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {selectedTarget.allocations.length} allocations
                {selectedTarget.origin?.preset && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-amber-200/80">
                      From {selectedTarget.origin.preset} template
                    </span>
                  </>
                )}
              </div>
              {gap && (
                <AlignmentBadge score={gap.summary.alignmentScore} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-emerald-300/80" />
                <span>Target capital</span>
                <Input
                  value={capitalStr}
                  onChange={(e) =>
                    setCapitalStr(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder={
                    hasPortfolioData
                      ? String(Math.round(currentInvestedValue))
                      : "e.g. 100000"
                  }
                  inputMode="numeric"
                  className="h-9 w-40 text-sm"
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveVersion}
                className="gap-2"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save version
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogRebalance}
                disabled={!gap}
                className="gap-2"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Mark rebalanced
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit target
              </Button>
            </div>
          </div>

          {gap && Math.abs(gap.summary.totalTargetPercent - 100) > 0.5 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>
                Total allocation is{" "}
                <span className="font-semibold">
                  {gap.summary.totalTargetPercent.toFixed(1)}%
                </span>
                . Please adjust so it sums to 100% for accurate rebalancing.
              </span>
            </div>
          )}
        </section>
      )}

      {gap && (
        <>
          <TargetSummaryTiles summary={gap.summary} />
          <TargetCharts
            rows={gap.rows}
            totalCapital={gap.summary.totalCapital}
          />
          <RebalancePanel rows={gap.rows} summary={gap.summary} />
          <BeforeAfterChart rows={gap.rows} />
          <RebalanceTable rows={gap.rows} />
          <RebalanceHistoryPanel
            entries={history ?? []}
            onDelete={handleDeleteHistoryEntry}
          />
        </>
      )}

      <CreateTargetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <EditTargetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        target={selectedTarget}
        currentValue={currentInvestedValue}
        onSaved={(id) => {
          setSelectedId(id);
          handleEditSaved();
          toast.success("Target saved");
        }}
        onDeleted={handleEditDeleted}
      />
    </div>
  );
}

function AlignmentBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  const tone =
    rounded >= 85
      ? { text: "text-emerald-200", border: "border-emerald-400/30", bg: "bg-emerald-500/[0.08]", label: "Well aligned" }
      : rounded >= 65
        ? { text: "text-amber-200", border: "border-amber-400/30", bg: "bg-amber-500/[0.08]", label: "Drifting" }
        : { text: "text-red-300", border: "border-red-400/30", bg: "bg-red-500/[0.08]", label: "Rebalance needed" };
  return (
    <div className={cn("mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]", tone.border, tone.bg, tone.text)}>
      <Gauge className="h-3 w-3" />
      <span className="font-semibold money-tabular">{rounded}/100</span>
      <span className="uppercase tracking-wider">Alignment · {tone.label}</span>
    </div>
  );
}

function RebalanceHistoryPanel({
  entries,
  onDelete,
}: {
  entries: RebalanceHistoryEntry[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="glass flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <History className="h-4 w-4 text-emerald-200" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-semibold">
            Rebalance history
          </div>
          <div className="text-xs text-muted-foreground">
            Applied rebalances for this target (snapshot of alignment + cash-flow at that moment)
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-6 text-center text-xs text-muted-foreground">
          No rebalances logged yet. Click <span className="font-semibold text-emerald-200">Mark rebalanced</span> after you execute a rebalance to keep a record here.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <RebalanceHistoryRow
              key={entry.id}
              entry={entry}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RebalanceHistoryRow({
  entry,
  onDelete,
}: {
  entry: RebalanceHistoryEntry;
  onDelete: (id: string) => void;
}) {
  const rounded = Math.round(entry.alignmentScore);
  const tone =
    rounded >= 85
      ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
      : rounded >= 65
        ? "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
        : "border-red-400/30 bg-red-500/[0.08] text-red-200";
  const dateLabel = new Date(entry.timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <div className="text-xs text-muted-foreground">{dateLabel}</div>
        <div className="mt-0.5 text-sm font-semibold">{entry.targetName}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
            tone,
          )}
        >
          <Gauge className="h-3 w-3" />
          {rounded}/100
        </span>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/[0.06] px-2 py-0.5 text-emerald-200">
          Invest {formatINR(entry.underweightSum)}
        </span>
        <span className="rounded-full border border-rose-400/25 bg-rose-500/[0.06] px-2 py-0.5 text-rose-200">
          Trim {formatINR(entry.overweightSum)}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-muted-foreground">
          Net {formatINR(entry.netCashRequired)}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-muted-foreground">
          Capital {formatCompactINR(entry.totalCapital)} · {formatPct(entry.matchedCount / Math.max(1, entry.rowCount))} matched
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(entry.id)}
          className="h-7 gap-1 px-2 text-muted-foreground hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-24 rounded-2xl border border-white/[0.05] bg-white/[0.02] shimmer",
          )}
        />
      ))}
      <div className="mt-2 text-xs text-muted-foreground">
        Loading targets · Combined value{" "}
        <span className="money-tabular text-emerald-300/70">
          {formatCompactINR(0)}
        </span>
      </div>
    </div>
  );
}
