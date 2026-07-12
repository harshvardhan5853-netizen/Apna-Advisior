"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileSpreadsheet,
  FileText,
  History,
  Image,
  Link,
  Merge,
  Plus,
  Settings,
  Shield,
  Undo2,
  Upload,
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
import { PortfolioList } from "./portfolio-list";
import { CreatePortfolioDialog } from "./create-portfolio-dialog";
import { AddToExistingDialog } from "./add-to-existing-dialog";
import { AiExtractionSettingsDialog } from "./ai-extraction-settings-dialog";


export function PortfolioCard() {
  const portfolios = usePortfolios();
  const activeId = useActivePortfolioId();
  const history = useMergeHistory();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [extractionSettingsOpen, setExtractionSettingsOpen] = React.useState(false);

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
    <div className="relative flex h-full flex-col gap-4 overflow-hidden p-5 card-emerald md:p-6">
      {/* Upload illustration */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 opacity-10"
        style={{ mixBlendMode: "screen" }}
        aria-hidden
      >
        <path d="M100 40v80M70 70l30-30 30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-emerald-300" />
        <rect x="55" y="110" width="90" height="60" rx="8" stroke="currentColor" strokeWidth="1.5" className="text-emerald-300/60" />
        <path d="M75 130h50M75 145h35M75 160h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-300/40" />
        <circle cx="160" cy="50" r="20" stroke="currentColor" strokeWidth="1" className="text-emerald-300/30" />
        <path d="M155 50h10M160 45v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-300/30" />
      </svg>
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

        <div className="hidden flex-wrap items-center gap-1.5 pr-3.5 md:flex">
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
          <button
            type="button"
            onClick={() => setExtractionSettingsOpen(true)}
            title="AI extraction settings"
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* Import method chips */}
      <div className="relative flex flex-wrap items-center gap-1.5">
        {[
          { icon: Upload, label: "CSV", color: "text-emerald-300" },
          { icon: FileSpreadsheet, label: "Excel", color: "text-emerald-300" },
          { icon: FileText, label: "PDF", color: "text-emerald-300" },
          { icon: Image, label: "Screenshot", color: "text-emerald-300" },
          { icon: Link, label: "Broker", color: "text-amber-300" },
        ].map((m) => (
          <span
            key={m.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium transition-all duration-200 hover:bg-white/[0.06]",
              m.color,
            )}
          >
            <m.icon className="h-3 w-3" />
            {m.label}
          </span>
        ))}
      </div>

      {/* Drag & drop zone + Body */}
      <div className="relative flex flex-1 flex-col gap-3 rounded-xl border border-dashed border-emerald-400/20 bg-emerald-500/[0.03] p-4">
        {/* Floating particles */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl animate-float-slow" />
          <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-emerald-400/10 blur-2xl animate-float-slow" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative flex flex-1 flex-col gap-3">
          {loading && <LoadingState />}

          {!loading && isEmpty && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <Upload className="h-8 w-8 text-emerald-400/40" />
              <p className="text-xs text-muted-foreground/70 text-center">
                Drag & drop files or click to browse
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Portfolio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <Link className="h-3.5 w-3.5" />
                  Connect Broker
                  <span className="ml-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-amber-300">
                    Soon
                  </span>
                </Button>
              </div>
            </div>
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
                  <button
                    type="button"
                    onClick={() => setExtractionSettingsOpen(true)}
                    title="AI extraction settings"
                    className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
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
      </div>

      {/* Security badge */}
      <div className="relative flex items-center gap-3 text-[10px] text-muted-foreground/60">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-emerald-400/60" />
          <span>Local storage</span>
        </div>
        <span className="text-white/[0.04]">·</span>
        <span>Encrypted at rest</span>
        <span className="text-white/[0.04]">·</span>
        <span className="hidden sm:inline">No data leaves your device</span>
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
      <AiExtractionSettingsDialog
        open={extractionSettingsOpen}
        onOpenChange={setExtractionSettingsOpen}
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
