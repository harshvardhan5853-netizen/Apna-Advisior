"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  Merge,
  Plus,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import {
  useActivePortfolioId,
  useMergeHistory,
  usePortfolios,
} from "@/hooks/use-portfolios";
import { undoLastMerge } from "@/lib/portfolio-store";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { PortfolioList } from "./portfolio-list";
import { CreatePortfolioDialog } from "./create-portfolio-dialog";
import { AddToExistingDialog } from "./add-to-existing-dialog";

export function PortfolioCard() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();
  const history = useMergeHistory();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const loading = portfolios === undefined || activeId === undefined;
  const isEmpty = !loading && (portfolios?.length ?? 0) === 0;
  const activePortfolio =
    portfolios?.find((p) => p.id === activeId) ?? null;
  const canMerge = !isEmpty && (portfolios?.length ?? 0) > 0;
  const canUndo = (history?.length ?? 0) > 0;

  const handleUndo = async () => {
    try {
      const ok = await undoLastMerge();
      if (ok) toast.success("Reverted the last change");
      else toast.message("Nothing to undo");
    } catch (err) {
      toast.error("Couldn't undo");
    }
  };

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden p-5 glass md:p-6">
      {/* Ambient tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">
              Add Portfolio
            </div>
            <div className="text-xs text-muted-foreground">
              Import CSV, Excel, PDF, or a screenshot — we&apos;ll do the rest.
            </div>
          </div>
        </div>

        <div className="hidden flex-wrap items-center gap-1.5 md:flex">
          {canUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              title="Undo last change"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen((v) => !v)}
            title="Merge history"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col gap-4">
        {loading && <LoadingState />}

        {!loading && isEmpty && (
          <EmptyState
            onCreate={() => setCreateOpen(true)}
          />
        )}

        {!loading && !isEmpty && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New portfolio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMergeOpen(true)}
                disabled={!canMerge}
              >
                <Merge className="h-3.5 w-3.5" />
                Add to existing
              </Button>
              {/* Mobile-only actions */}
              <div className="ml-auto flex items-center gap-1.5 md:hidden">
                {canUndo && (
                  <Button variant="ghost" size="sm" onClick={handleUndo}>
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryOpen((v) => !v)}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <PortfolioList
              portfolios={portfolios ?? []}
              activeId={activeId ?? null}
            />
          </>
        )}

        <AnimatePresence>
          {historyOpen && (
            <motion.div
              key="history"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <HistoryPanel
                onClose={() => setHistoryOpen(false)}
                entries={history ?? []}
                onUndo={handleUndo}
                canUndo={canUndo}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-muted-foreground">
        <span>
          {activePortfolio
            ? `Active: ${activePortfolio.name}`
            : isEmpty
              ? "No portfolio yet"
              : "No active portfolio"}
        </span>
        <span className="hidden md:inline">
          Local-only · Encrypted at rest by your browser
        </span>
      </div>

      <CreatePortfolioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        activePortfolio={activePortfolio}
      />
      <AddToExistingDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        portfolios={portfolios ?? []}
        activeId={activeId ?? null}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-16 rounded-xl border border-white/[0.06] bg-white/[0.02] shimmer",
          )}
        />
      ))}
    </div>
  );
}

interface HistoryPanelProps {
  entries: import("@/types/portfolio").MergeHistoryEntry[];
  onClose: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

function HistoryPanel({ entries, onClose, onUndo, canUndo }: HistoryPanelProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Merge history
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo last
          </Button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] p-4 text-center text-xs text-muted-foreground">
          No history yet. Portfolio creations and merges will show up here.
        </div>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {entries.slice(0, 20).map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 text-xs"
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border",
                  e.action.type === "create"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-emerald-300",
                )}
              >
                {e.action.type === "create" ? (
                  <Plus className="h-3.5 w-3.5" />
                ) : (
                  <Merge className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">
                  {e.description}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDate(e.timestamp)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
