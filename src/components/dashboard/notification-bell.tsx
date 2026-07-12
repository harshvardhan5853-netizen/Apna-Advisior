"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useExtractions } from "@/contexts/extraction-context";
import { cn } from "@/lib/utils";
import type { ExtractionJob } from "@/lib/extraction-types";

/* ─── Relative time helper ─── */

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1m ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1h ago";
  return `${hours}h ago`;
}

/* ─── Stage label mapping ─── */

const STAGE_LABELS: Record<string, string> = {
  uploading: "Uploading file…",
  ocr: "Extracting text…",
  parsing: "Analyzing portfolio…",
  validation: "Validating holdings…",
  ai_cleanup: "Enhancing extracted data…",
  finished: "Portfolio ready for review",
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage;
}

/* ─── Bell component ─── */

export function NotificationBell() {
  const { jobs, removeJob, clearCompleted, isExtracting, hasCompleted, hasFailed, activeCount, unreadCount, markAsRead } =
    useExtractions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCount = jobs.length;
  const needsAttention = unreadCount > 0 || isExtracting;

  /* Determine badge/dot */
  const showBadge = activeCount > 0;
  const showDot = !showBadge && needsAttention;

  const dotColor = isExtracting
    ? "bg-red-500 animate-pulse"
    : hasFailed && !hasCompleted
      ? "bg-amber-500"
      : "bg-emerald-500";

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markAsRead(); // mark notifications as read when opening dropdown
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        aria-label={`Notifications${needsAttention ? " — items need attention" : ""}`}
      >
        <Bell className="size-4" />
        {/* Dot indicator */}
        {showDot && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#050508]",
              dotColor,
            )}
          />
        )}
        {/* Numeric badge for active extractions */}
        {showBadge && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg">
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-[#050508]/95 backdrop-blur-xl p-1.5 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Portfolio Imports
                {totalCount > 0 && (
                  <span className="ml-1.5 text-emerald-400">({totalCount})</span>
                )}
              </span>
              {totalCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear done
                </button>
              )}
            </div>

            {totalCount === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <Bell className="size-8 text-white/[0.08]" />
                <p className="text-xs text-muted-foreground">No extractions yet</p>
              </div>
            ) : (
              <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} onDismiss={removeJob} />
                ))}
              </div>
            )}

            <Link
              href="/portfolio/review"
              onClick={() => setOpen(false)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <ExternalLink className="size-3" />
              View pending reviews
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Individual job row ─── */

function JobRow({
  job,
  onDismiss,
}: {
  job: ExtractionJob;
  onDismiss: (id: string) => void;
}) {
  const { retryJob } = useExtractions();

  const needsReview =
    job.status === "completed" &&
    job.holdings.length > 0 &&
    !job.autoImported;

  const isEmpty =
    job.status === "completed" && job.holdingsCount === 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
        "hover:bg-white/[0.04]",
        needsReview &&
          "border border-amber-400/15 bg-amber-500/[0.04]",
        job.status === "failed" &&
          "border border-red-400/10 bg-red-500/[0.03]",
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {job.status === "extracting" || job.status === "queued" ? (
          <div className="relative">
            <Loader2 className="size-4 animate-spin text-emerald-400" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        ) : needsReview ? (
          <CheckCircle2 className="size-4 text-emerald-400" />
        ) : isEmpty ? (
          <XCircle className="size-4 text-muted-foreground/50" />
        ) : job.status === "failed" ? (
          <XCircle className="size-4 text-red-400" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {job.fileName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {job.status === "extracting"
            ? stageLabel(job.stage)
            : job.status === "queued"
              ? "Waiting…"
              : needsReview
                ? `${job.holdingsCount} holdings extracted`
                : isEmpty
                  ? "No holdings found"
                  : job.status === "failed"
                    ? job.error ?? "Extraction failed"
                    : `${job.holdingsCount} holdings extracted`}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          Started {timeAgo(job.startedAt)}
        </p>
      </div>

      {/* Actions — always visible */}
      <div className="flex shrink-0 items-center gap-0.5">
        {needsReview && (
          <Link
            href={`/portfolio/review?job=${job.id}`}
            className="rounded-md p-1 text-emerald-400 hover:bg-emerald-500/15 transition-colors"
            aria-label="Review Portfolio"
          >
            <ExternalLink className="size-3.5" />
          </Link>
        )}
        {job.status === "failed" && (
          <button
            onClick={() => retryJob(job.id)}
            className="rounded-md p-1 text-amber-400 hover:bg-amber-500/15 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="size-3.5" />
          </button>
        )}
        <button
          onClick={() => onDismiss(job.id)}
          className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
