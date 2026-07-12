"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Trash2,
  Download,
  AlertTriangle,
  Layers,
  IndianRupee,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageShell } from "@/components/layout/page-shell";
import { useExtractions } from "@/contexts/extraction-context";
import { createPortfolio } from "@/lib/portfolio-store";
import { ReviewTable } from "@/components/portfolio/review-table";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { formatCompactINR } from "@/lib/utils";
import type { ImportStats, Holding } from "@/types/portfolio";

export function ReviewContent() {
  const searchParams = useSearchParams();
  const focusedJobId = searchParams.get("job");

  return (
    <AuthGuard>
      <PageShell>
        <main className="container relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14 page-enter">
          <header className="flex flex-col gap-4">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                Pending <span className="text-emerald-gradient">Reviews</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and approve extracted portfolio files that need your
                attention.
              </p>
            </div>
          </header>

          <ReviewList focusedJobId={focusedJobId} />

          <footer className="pt-6 text-center text-xs text-muted-foreground">
            Local-only · Nothing leaves your device.
          </footer>
        </main>
      </PageShell>
    </AuthGuard>
  );
}

/* ─── Review list ─── */

function ReviewList({ focusedJobId }: { focusedJobId: string | null }) {
  const { jobs } = useExtractions();

  const pendingJobs = useMemo(
    () =>
      jobs.filter((j) => j.status === "completed" && j.holdings.length > 0),
    [jobs],
  );

  if (pendingJobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center">
        <CheckCircle2 className="size-10 text-emerald-400/60" />
        <h2 className="font-display text-lg font-semibold">All caught up</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          No extractions are waiting for review. Upload a file from the
          dashboard to get started.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingJobs.map((job) => (
        <ReviewJobCard
          key={job.id}
          job={job}
          isFocused={job.id === focusedJobId}
        />
      ))}
    </div>
  );
}

/* ─── Individual job card with holdings table ─── */

function ReviewJobCard({
  job,
  isFocused,
}: {
  job: NonNullable<ReturnType<typeof useExtractions>["jobs"][number]>;
  isFocused: boolean;
}) {
  const [holdings, setHoldings] = useState<Holding[]>(job.holdings);
  const [importing, setImporting] = useState(false);
  const { removeJob } = useExtractions();

  const stats: ImportStats = useMemo(
    () => ({
      totalDetected: holdings.length,
      successfullyImported: 0,
      requiresReview: holdings.filter((h) => h.needsReview).length,
      totalInvested: holdings.reduce((s, h) => s + (h.investedAmount || 0), 0),
      estimatedCurrentValue: holdings.reduce(
        (s, h) => s + (h.currentValue || 0),
        0,
      ),
    }),
    [holdings],
  );

  const handleImport = async () => {
    setImporting(true);
    try {
      const created = await createPortfolio({
        name: job.portfolioName.trim() || `Portfolio (${job.fileName})`,
        holdings,
        source: job.source,
        fileNames: [job.fileName],
      });
      removeJob(job.id);
      toast.success(
        `Portfolio "${created.name}" created with ${holdings.length} holding${holdings.length > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleBulkImport = async (ids: string[]) => {
    if (ids.length === 0) return;
    const selectedHoldings = holdings.filter((h) => ids.includes(h.id));
    if (selectedHoldings.length === 0) return;
    setImporting(true);
    try {
      const created = await createPortfolio({
        name: job.portfolioName.trim() || `Portfolio (${job.fileName})`,
        holdings: selectedHoldings,
        source: job.source,
        fileNames: [job.fileName],
      });
      removeJob(job.id);
      toast.success(
        `Portfolio "${created.name}" created with ${selectedHoldings.length} holding${selectedHoldings.length > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleDiscard = () => {
    removeJob(job.id);
    toast.success("Extraction discarded.");
  };

  return (
    <div
      className={`rounded-xl border bg-white/[0.02] p-5 transition-colors ${
        isFocused
          ? "border-emerald-400/30 ring-1 ring-emerald-400/20"
          : "border-white/[0.06]"
      }`}
    >
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {job.portfolioName || job.fileName}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {holdings.length} holding{holdings.length > 1 ? "s" : ""} ·{" "}
            {new Date(job.startedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {job.fileName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleImport}
            disabled={importing || holdings.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Importing…
              </>
            ) : (
              <>
                <Download className="size-3.5" /> Import
              </>
            )}
          </button>
          <button
            onClick={handleDiscard}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Discard
          </button>
        </div>
      </div>

      {/* Stats summary row */}
      <ImportStatsRow stats={stats} />

      {/* Holdings table */}
      <div className="mt-4">
        <ReviewTable
          holdings={holdings}
          onChange={setHoldings}
          validationResults={job.validationResults}
          showBulkActions
          onBulkImport={handleBulkImport}
          onBulkDiscard={() => {}}
          bulkImporting={importing}
        />
      </div>
    </div>
  );
}

/* ─── Stats tiles row ─── */

function ImportStatsRow({ stats }: { stats: ImportStats }) {
  const items = [
    {
      label: "Detected",
      value: stats.totalDetected.toString(),
      icon: Layers,
      tone: "text-emerald-200",
    },
    {
      label: "Ready",
      value: stats.successfullyImported.toString(),
      icon: CheckCircle2,
      tone: "text-emerald-300",
    },
    {
      label: "Needs review",
      value: stats.requiresReview.toString(),
      icon: AlertTriangle,
      tone: stats.requiresReview > 0 ? "text-amber-300" : "text-muted-foreground",
    },
    {
      label: "Invested",
      value: formatCompactINR(stats.totalInvested),
      icon: IndianRupee,
      tone: "text-foreground",
    },
    {
      label: "Current value",
      value: formatCompactINR(stats.estimatedCurrentValue),
      icon: IndianRupee,
      tone: "text-foreground",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Icon className={"h-3.5 w-3.5 " + it.tone} />
              {it.label}
            </div>
            <div
              className={
                "mt-1 font-display text-base font-semibold money-tabular " +
                it.tone
              }
            >
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
