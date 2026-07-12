"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  GitMerge,
  Loader2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Holding, ImportStats, Portfolio } from "@/types/portfolio";
import { mergeIntoPortfolio } from "@/lib/portfolio-store";
import { parseFiles, type ParseFilesProgress } from "@/lib/parsers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadArea } from "./upload-area";
import { CameraCapture } from "./camera-capture";
import { ReviewTable } from "./review-table";
import { ImportStatsRow } from "./import-stats";
import { cn, formatCompactINR, formatPct } from "@/lib/utils";

type Step = "upload" | "review" | "success";

interface AddToExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolios: Portfolio[];
  activeId: string | null;
}

interface MergeSummary {
  added: number;
  merged: number;
  targetName: string;
  uploadName: string;
  totals: Portfolio["totals"];
}

export function AddToExistingDialog({
  open,
  onOpenChange,
  portfolios,
  activeId,
}: AddToExistingDialogProps) {
  const [step, setStep] = React.useState<Step>("upload");
  const [name, setName] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [targetId, setTargetId] = React.useState<string>("");
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const [progressLabel, setProgressLabel] = React.useState<string | undefined>();
  const [holdings, setHoldings] = React.useState<Holding[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [camera, setCamera] = React.useState(false);
  const [summary, setSummary] = React.useState<MergeSummary | null>(null);

  // Seed the target selection when the dialog opens: prefer active, else first.
  React.useEffect(() => {
    if (open && !targetId) {
      const seed = activeId ?? portfolios[0]?.id ?? "";
      setTargetId(seed);
    }
  }, [open, targetId, activeId, portfolios]);

  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("upload");
        setName("");
        setFiles([]);
        setTargetId("");
        setProcessing(false);
        setProgress(undefined);
        setProgressLabel(undefined);
        setHoldings([]);
        setWarnings([]);
        setCamera(false);
        setSummary(null);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const stats: ImportStats = React.useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let review = 0;
    for (const h of holdings) {
      invested += h.investedAmount || 0;
      currentValue += h.currentValue || 0;
      if (h.needsReview) review += 1;
    }
    return {
      totalDetected: holdings.length,
      successfullyImported: holdings.length - review,
      requiresReview: review,
      totalInvested: invested,
      estimatedCurrentValue: currentValue,
    };
  }, [holdings]);

  const canContinueUpload =
    name.trim().length > 0 &&
    files.length > 0 &&
    targetId.length > 0 &&
    !processing;

  const handleParse = async () => {
    if (!canContinueUpload) return;
    setProcessing(true);
    setProgress(0);
    setProgressLabel("Reading files…");
    try {
      const result = await parseFiles(files, (p: ParseFilesProgress) => {
        setProgressLabel(
          p.phase === "progress"
            ? `Extracting from ${p.fileName}…`
            : p.phase === "start"
              ? `Reading ${p.fileName}…`
              : p.phase === "done"
                ? `Finished ${p.fileName}`
                : p.message ?? "…",
        );
        if (p.phase === "progress" && typeof p.pct === "number") {
          const perFile = 1 / Math.max(p.total, 1);
          setProgress((p.index * perFile) + (p.pct * perFile));
        } else if (p.phase === "done") {
          setProgress((p.index + 1) / Math.max(p.total, 1));
        }
      });
      setHoldings(result.holdings);
      setWarnings(result.warnings);
      if (result.holdings.length > 0) {
        const formattedBroker = result.source === "angelone" ? "Angel One" : result.source === "generic" ? "Generic/Custom" : result.source.charAt(0).toUpperCase() + result.source.slice(1);
        toast.success(`Successfully parsed ${result.holdings.length} holdings. Detected broker: ${formattedBroker}.`);
      } else {
        toast.error(
          "Couldn't extract any holdings. Try a clearer file or different format.",
        );
      }
      setStep("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setProgress(undefined);
      setProgressLabel(undefined);
    }
  };

  const target = portfolios.find((p) => p.id === targetId) ?? null;

  const handleMerge = async () => {
    if (!target || holdings.length === 0) return;
    setProcessing(true);
    try {
      const result = await mergeIntoPortfolio({
        targetPortfolioId: target.id,
        incoming: holdings,
        incomingSourceName: name.trim() || files[0]?.name,
      });
      setSummary({
        added: result.addedCount,
        merged: result.mergedCount,
        targetName: result.portfolio.name,
        uploadName: name.trim() || "Upload",
        totals: result.portfolio.totals,
      });
      setStep("success");
      toast.success(
        `${name.trim() || "Upload"} has been merged successfully with ${result.portfolio.name}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Merge failed";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const dialogTitle: Record<Step, string> = {
    upload: "Add to an existing portfolio",
    review: "Review holdings before merge",
    success: "Merged successfully",
  };
  const dialogDesc: Record<Step, string> = {
    upload:
      "Pick the target portfolio and drop in a broker export, PDF, or screenshot. Duplicates are auto-merged with a weighted average buy price.",
    review:
      "Fix low-confidence rows before merging. Duplicates in the target will combine automatically.",
    success:
      "Quantities were combined and averages recalculated where duplicates were found.",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size={step === "review" ? "xl" : "lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === "review" && (
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-emerald-gradient">{dialogTitle[step]}</span>
            </DialogTitle>
            <DialogDescription>{dialogDesc[step]}</DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="upload-name">Upload name / label</Label>
                  <Input
                    id="upload-name"
                    autoFocus
                    placeholder="e.g. Zerodha June export"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Merge into</Label>
                  <TargetPicker
                    portfolios={portfolios}
                    activeId={activeId}
                    value={targetId}
                    onChange={setTargetId}
                  />
                </div>

                <UploadArea
                  files={files}
                  onFilesChange={setFiles}
                  onOpenCamera={() => setCamera(true)}
                  processing={processing}
                  processingLabel={progressLabel}
                  progress={progress}
                />
              </motion.div>
            )}

            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                  <GitMerge className="h-4 w-4 text-emerald-300" />
                  <span className="text-muted-foreground">Merging into</span>
                  <span className="font-medium">{target?.name}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {target?.totals.holdingCount ?? 0} existing ·{" "}
                    {formatCompactINR(target?.totals.currentValue ?? 0)}
                  </span>
                </div>
                <ImportStatsRow stats={stats} />
                {warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
                    <div className="mb-1 flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" /> Parsing notes
                    </div>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {warnings.slice(0, 4).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {warnings.length > 4 && (
                        <li>and {warnings.length - 4} more…</li>
                      )}
                    </ul>
                  </div>
                )}
                <ReviewTable holdings={holdings} onChange={setHoldings} existingHoldings={target?.holdings} />
              </motion.div>
            )}

            {step === "success" && summary && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/25 blur-2xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
                      <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                      <Sparkles className="h-3 w-3" /> Merge complete
                    </div>
                    <h3 className="font-display text-lg font-semibold">
                      &ldquo;
                      <span className="text-emerald-gradient">
                        {summary.uploadName}
                      </span>
                      &rdquo; has been merged successfully with &ldquo;
                      <span className="text-emerald-gradient">
                        {summary.targetName}
                      </span>
                      &rdquo;.
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <SummaryTile label="Stocks added">{summary.added}</SummaryTile>
                  <SummaryTile label="Duplicates merged">
                    {summary.merged}
                  </SummaryTile>
                  <SummaryTile label="Total invested">
                    {formatCompactINR(summary.totals.invested)}
                  </SummaryTile>
                  <SummaryTile label="Current value">
                    {formatCompactINR(summary.totals.currentValue)}
                  </SummaryTile>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3",
                    summary.totals.pnl >= 0
                      ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100"
                      : "border-red-400/25 bg-red-500/[0.06] text-red-100",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {summary.totals.pnl >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="uppercase tracking-wider text-xs opacity-80">
                      Portfolio P&amp;L
                    </span>
                  </div>
                  <div className="money-tabular text-lg font-semibold">
                    {summary.totals.pnl >= 0 ? "+" : ""}
                    {formatCompactINR(summary.totals.pnl)} ·{" "}
                    {formatPct(summary.totals.pnlPercent)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter>
            {step === "upload" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button onClick={handleParse} disabled={!canContinueUpload}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Extracting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Continue
                    </>
                  )}
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={holdings.length === 0 || processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Merging…
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4" />
                      Merge into &ldquo;{target?.name ?? "portfolio"}&rdquo;
                    </>
                  )}
                </Button>
              </>
            )}
            {step === "success" && (
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraCapture
        open={camera}
        onOpenChange={setCamera}
        onCapture={(file) => setFiles((prev) => [...prev, file])}
      />
    </>
  );
}

interface TargetPickerProps {
  portfolios: Portfolio[];
  activeId: string | null;
  value: string;
  onChange: (id: string) => void;
}

function TargetPicker({ portfolios, activeId, value, onChange }: TargetPickerProps) {
  if (portfolios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground">
        No portfolios yet. Create one first.
      </div>
    );
  }
  return (
    <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.015] p-1.5 md:grid-cols-2">
      {portfolios.map((p) => {
        const selected = p.id === value;
        const isActive = p.id === activeId;
        const gain = p.totals.pnl >= 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-transparent p-2.5 text-left transition-all",
              selected
                ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                : "hover:border-white/10 hover:bg-white/[0.03]",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border text-emerald-300",
                selected
                  ? "border-emerald-400/40 bg-emerald-400/[0.12]"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              {isActive ? (
                <Star className="h-4 w-4" />
              ) : gain ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{p.name}</span>
                {isActive && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[9px] uppercase tracking-wider text-emerald-200">
                    Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.totals.holdingCount} holdings ·{" "}
                {formatCompactINR(p.totals.currentValue)}
              </div>
            </div>
            <div
              className={cn(
                "h-3 w-3 shrink-0 rounded-full border transition-colors",
                selected
                  ? "border-emerald-300 bg-emerald-400"
                  : "border-white/20 bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function SummaryTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-base font-semibold money-tabular">
        {children}
      </div>
    </div>
  );
}
