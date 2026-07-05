"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Holding, ImportStats, Portfolio } from "@/types/portfolio";
import { createPortfolio } from "@/lib/portfolio-store";
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
import { formatCompactINR } from "@/lib/utils";

type Step = "upload" | "review" | "confirm" | "success";

interface CreatePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePortfolio: Portfolio | null;
}

export function CreatePortfolioDialog({
  open,
  onOpenChange,
  activePortfolio,
}: CreatePortfolioDialogProps) {
  const [step, setStep] = React.useState<Step>("upload");
  const [name, setName] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const [progressLabel, setProgressLabel] = React.useState<string | undefined>();
  const [holdings, setHoldings] = React.useState<Holding[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [detectedSource, setDetectedSource] =
    React.useState<Portfolio["origin"]["source"]>("generic");
  const [camera, setCamera] = React.useState(false);
  const [createdName, setCreatedName] = React.useState("");

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Small delay so the closing animation doesn't flash empty content.
      const t = setTimeout(() => {
        setStep("upload");
        setName("");
        setFiles([]);
        setProcessing(false);
        setProgress(undefined);
        setProgressLabel(undefined);
        setHoldings([]);
        setWarnings([]);
        setDetectedSource("generic");
        setCamera(false);
        setCreatedName("");
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
    name.trim().length > 0 && files.length > 0 && !processing;

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
          // Weight per-file progress across the batch
          const perFile = 1 / Math.max(p.total, 1);
          setProgress((p.index * perFile) + (p.pct * perFile));
        } else if (p.phase === "done") {
          setProgress((p.index + 1) / Math.max(p.total, 1));
        }
      });
      setHoldings(result.holdings);
      setWarnings(result.warnings);
      setDetectedSource(result.source);
      if (result.holdings.length === 0) {
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

  const proceedFromReview = () => {
    if (holdings.length === 0) {
      toast.error("Add at least one holding to continue.");
      return;
    }
    if (activePortfolio) {
      setStep("confirm");
    } else {
      void handleCreate();
    }
  };

  const handleCreate = async () => {
    setProcessing(true);
    try {
      const created = await createPortfolio({
        name: name.trim(),
        holdings,
        source: detectedSource,
        fileNames: files.map((f) => f.name),
      });
      setCreatedName(created.name);
      setStep("success");
      toast.success(`Portfolio "${created.name}" has been created successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const dialogTitle: Record<Step, string> = {
    upload: "Create a new portfolio",
    review: "Review extracted holdings",
    confirm: "Replace active portfolio?",
    success: "Portfolio created",
  };
  const dialogDesc: Record<Step, string> = {
    upload:
      "Give your portfolio a name and drop in a broker export, PDF, or screenshot.",
    review:
      "Fix low-confidence rows before saving. Everything runs locally on your device.",
    confirm:
      "Creating a new portfolio will replace the currently active portfolio. Do you want to continue?",
    success: "You can now explore your holdings in the dashboard.",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size={step === "review" ? "xl" : "lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step !== "upload" && step !== "success" && (
                <button
                  type="button"
                  onClick={() =>
                    setStep(step === "confirm" ? "review" : "upload")
                  }
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
                  <Label htmlFor="pf-name">Portfolio name</Label>
                  <Input
                    id="pf-name"
                    autoFocus
                    placeholder="e.g. Long Term · NSE Equity"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
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
                <ReviewTable holdings={holdings} onChange={setHoldings} />
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Heads up
                  </div>
                  <p className="text-sm text-foreground/90">
                    <span className="font-medium">
                      &ldquo;{activePortfolio?.name}&rdquo;
                    </span>{" "}
                    is currently active. Creating{" "}
                    <span className="font-medium">&ldquo;{name}&rdquo;</span> will
                    archive it (you can restore it any time from the portfolio
                    list).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <SummaryTile label="Holdings">
                    {stats.totalDetected}
                  </SummaryTile>
                  <SummaryTile label="Invested">
                    {formatCompactINR(stats.totalInvested)}
                  </SummaryTile>
                  <SummaryTile label="Current value">
                    {formatCompactINR(stats.estimatedCurrentValue)}
                  </SummaryTile>
                  <SummaryTile label="Needs review">
                    {stats.requiresReview}
                  </SummaryTile>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-3 text-center"
              >
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-400/25 blur-2xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                    <Sparkles className="h-3 w-3" /> All set
                  </div>
                  <h3 className="font-display text-xl font-semibold">
                    Portfolio &ldquo;
                    <span className="text-emerald-gradient">{createdName}</span>
                    &rdquo; has been created successfully.
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stats.totalDetected} holdings imported ·{" "}
                    {formatCompactINR(stats.estimatedCurrentValue)} current value.
                  </p>
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
                <Button
                  onClick={handleParse}
                  disabled={!canContinueUpload}
                >
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
                  onClick={proceedFromReview}
                  disabled={holdings.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  {activePortfolio
                    ? "Continue"
                    : `Create "${name.trim() || "Untitled"}"`}
                </Button>
              </>
            )}
            {step === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setStep("review")}>
                  No, go back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={processing}
                  variant="destructive"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>Yes, replace and create</>
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
