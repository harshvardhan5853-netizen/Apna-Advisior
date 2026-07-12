"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  GitMerge,
  History,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { MergeHistoryEntry } from "@/types/portfolio";
import {
  listMergeHistory,
  restoreFromHistoryEntry,
  undoLastMerge,
} from "@/lib/portfolio-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatINR } from "@/lib/utils";

export default function MergeHistoryPage() {
  const [entries, setEntries] = React.useState<MergeHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [restoreId, setRestoreId] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const [undoing, setUndoing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMergeHistory();
      setEntries(data);
    } catch {
      toast.error("Failed to load merge history");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoring(true);
    try {
      const ok = await restoreFromHistoryEntry(restoreId);
      if (ok) {
        toast.success("Portfolio restored to selected snapshot");
        await load();
      } else {
        toast.error("Could not restore — entry may have been deleted");
      }
    } catch {
      toast.error("Restore failed");
    } finally {
      setRestoring(false);
      setRestoreId(null);
    }
  };

  const handleUndoLast = async () => {
    setUndoing(true);
    try {
      const ok = await undoLastMerge();
      if (ok) {
        toast.success("Last merge undone");
        await load();
      } else {
        toast.error("Nothing to undo");
      }
    } catch {
      toast.error("Undo failed");
    } finally {
      setUndoing(false);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Yesterday at ${timeStr}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 pb-16 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold">
                Merge History
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                {entries.length} event{entries.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Browse merge events and restore previous portfolio snapshots
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndoLast}
          disabled={undoing || entries.length === 0}
          className="gap-1.5"
        >
          {undoing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Undo Last Merge
        </Button>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading history…</span>
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16"
        >
          <History className="h-10 w-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="font-medium">No merge history yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Merge events will appear here as you import holdings into
              portfolios
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => {
            const isMerge = entry.action.type === "merge";
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 transition-colors hover:border-white/[0.1]"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isMerge
                      ? "border border-indigo-400/30 bg-indigo-500/[0.1]"
                      : "border border-emerald-400/30 bg-emerald-500/[0.1]",
                  )}
                >
                  {isMerge ? (
                    <GitMerge className="h-4 w-4 text-indigo-300" />
                  ) : (
                    <Plus className="h-4 w-4 text-emerald-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {entry.description}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        isMerge
                          ? "border border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
                          : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                      )}
                    >
                      {isMerge ? "Merge" : "Create"}
                    </span>
                  </div>

                  {entry.action.type === "merge" && entry.action.addedHoldingIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <Plus className="h-3 w-3" />
                        {entry.action.addedHoldingIds.length} added
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <GitMerge className="h-3 w-3" />
                        {entry.action.mergedHoldingIds.length} merged
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(entry.timestamp)}
                  </div>
                </div>

                {/* Actions */}
                {isMerge && (
                  <button
                    type="button"
                    onClick={() => setRestoreId(entry.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-emerald-500/[0.1] hover:text-emerald-300 group-hover:opacity-100"
                    title="Restore this snapshot"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Restore confirmation dialog */}
      <Dialog open={!!restoreId} onOpenChange={(o) => { if (!o) setRestoreId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Restore snapshot?
            </DialogTitle>
            <DialogDescription>
              This will replace the current portfolio with the data from the
              selected merge event. Any changes made after this event will be
              lost. Consider creating a manual backup first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreId(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRestore}
              disabled={restoring}
              className="gap-1.5"
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {restoring ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
