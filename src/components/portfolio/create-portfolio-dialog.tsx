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
import { validateHoldings, mergeDuplicates, checkAutoImportGate, summarizeValidation, type HoldingValidation } from "@/lib/validation-engine";
import { computeConfidence, deriveStageScores, shouldAutoImport } from "@/lib/confidence-scorer";
import { applyAiEnhancements } from "@/lib/ai-enhancer";
import { readAiExtractionSettings } from "@/lib/ai-extraction-settings";
import { PasswordPromptDialog, type PasswordPromptFile, type PasswordState } from "./password-prompt-dialog";
import { detectProtectedFiles, validatePassword } from "@/lib/parsers/detect-protected";
import { formatCompactINR } from "@/lib/utils";
import { useExtractions } from "@/contexts/extraction-context";

type Step = "upload" | "password" | "review" | "confirm" | "success";

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
  const [validationResults, setValidationResults] = React.useState<HoldingValidation[]>([]);
  const [detectedSource, setDetectedSource] =
    React.useState<Portfolio["origin"]["source"]>("generic");
  const [camera, setCamera] = React.useState(false);
  const [createdName, setCreatedName] = React.useState("");
  const [, setShowPasswordPrompt] = React.useState(false);
  const [passwordPromptFiles, setPasswordPromptFiles] = React.useState<PasswordPromptFile[]>([]);
  const [passwordPromptIndex, setPasswordPromptIndex] = React.useState(0);
  const [passwordPromptState, setPasswordPromptState] = React.useState<PasswordState>("idle");
  const [passwordPromptError, setPasswordPromptError] = React.useState("");
  const [passwordValue, setPasswordValue] = React.useState("");
  const [usePasswordForAll, setUsePasswordForAll] = React.useState(false);
  const [background, setBackground] = React.useState(!!activePortfolio);
  const passwordMapRef = React.useRef<Map<number, string>>(new Map());

  const { addJob } = useExtractions();

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
        setShowPasswordPrompt(false);
        setPasswordPromptFiles([]);
        setPasswordPromptIndex(0);
        setPasswordPromptState("idle");
        setPasswordPromptError("");
        setPasswordValue("");
        setUsePasswordForAll(false);
        setBackground(false);
        passwordMapRef.current.clear();
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

  // ─────────────────────────────────────────────────────────────────────────
  // Extraction telemetry (easy-disable flag)
  const ENABLE_TELEMETRY = true;

  function logTelemetry(data: Record<string, unknown>) {
    if (!ENABLE_TELEMETRY) return;
    try {
      const entry = { ...data, ts: Date.now() };
      const stored = JSON.parse(
        typeof window !== "undefined"
          ? window.localStorage.getItem("apna-advisor.extraction-log") ?? "[]"
          : "[]",
      ) as Record<string, unknown>[];
      stored.push(entry);
      if (stored.length > 200) stored.splice(0, stored.length - 200);
      window.localStorage.setItem("apna-advisor.extraction-log", JSON.stringify(stored));
    } catch { /* ignore */ }
  }

  const submitBackgroundJob = React.useCallback((passwordMap?: Map<number, string>) => {
    addJob(
      crypto.randomUUID(),
      files.map((f) => f.name).join(", "),
      name.trim() || `Portfolio (${files.length} file${files.length > 1 ? "s" : ""})`,
      files,
      passwordMap,
    );
    onOpenChange(false);
    toast.success("Extraction submitted. You'll be notified when it's ready.");
  }, [addJob, files, name, onOpenChange]);

  const doParse = React.useCallback(
    async (passwordMap?: Map<number, string>) => {
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
            setProgress(p.index * perFile + p.pct * perFile);
          } else if (p.phase === "done") {
            setProgress((p.index + 1) / Math.max(p.total, 1));
          }
        }, passwordMap);

        let parsed = result.holdings;
        const engine = result.source;

        if (parsed.length > 0) {
          // ── Phase 8: Initial Validation ─────────────────────────────────
          setProgressLabel("Validating extracted data…");
          let validationResults = validateHoldings(parsed);
          const summary = summarizeValidation(validationResults);

          const settings = readAiExtractionSettings();
          const aiAvailable = settings.geminiApiKey?.length > 0;

          // ── Phase 7: AI Enhancement (only when needed) ──────────────────
          // Rules: validation has critical issues, unknown symbols, missing fields,
          // OR parser confidence is low (OCR ambiguity)
          const shouldUseAi =
            aiAvailable &&
            (summary.totalCriticalErrors > 0 ||
             summary.unknownSymbols.length > 0 ||
             validationResults.some((v) => v.missingRequiredFields.length > 0) ||
             parsed.some((h) => h.confidence < 0.95));

          if (shouldUseAi) {
            setProgressLabel("AI is cleaning extracted data…");
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15000);

              const res = await fetch("/api/ai/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  holdings: parsed,
                  apiKey: settings.geminiApiKey,
                  model: settings.extractionModel ?? "gemini-2.5-flash",
                }),
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (res.ok) {
                const { enhanced } = await res.json();
                parsed = applyAiEnhancements(parsed, enhanced);
                const changedCount = enhanced.filter(
                  (e: { changedFields: string[] }) => e.changedFields.length > 0,
                ).length;
                if (changedCount > 0) {
                  toast.success(`AI cleaned ${changedCount} holding${changedCount > 1 ? "s" : ""}`);
                }
                // Re-validate after AI
                setProgressLabel("Re-validating cleaned data…");
                validationResults = validateHoldings(parsed);
              } else if (res.status === 401 || res.status === 403) {
                toast.warning("AI skipped: invalid API key. Edit in ⚙ Settings.");
              } else if (res.status === 429) {
                toast.warning("AI rate-limited. Using parsed data as-is.");
              } else {
                toast.warning("AI temporarily unavailable. Using parsed data.");
              }
            } catch (err) {
              // AI failure must NEVER break imports (requirement #7)
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("abort") || msg.includes("timeout")) {
                console.warn("AI enhancement timed out, using parsed data as-is");
              } else {
                console.warn("AI enhancement failed, using parsed data as-is:", msg);
              }
            }
          }

          // ── Merge duplicates ─────────────────────────────────────────────
          setProgressLabel("Merging duplicate entries…");
          parsed = mergeDuplicates(parsed);

          // ── Phase 9: Final Confidence Calculation ────────────────────────
          setProgressLabel("Computing confidence scores…");
          validationResults = validateHoldings(parsed);
          const flatValidations = validationResults.map((v) => ({
            id: v.holdingId,
            score: v.score,
            confidencePenalty: v.confidencePenalty,
          }));

          const confidenceResults = parsed.map((h) => {
            const v = validationResults.find((vr) => vr.holdingId === h.id);
            const stages = deriveStageScores(h, v);
            return { stages, result: computeConfidence(stages) };
          });
          const finalLowest = Math.min(...confidenceResults.map((c) => c.result.finalScore));

          const finalSummary = summarizeValidation(validationResults);
          const gate = checkAutoImportGate(parsed, validationResults, finalLowest);
          const canAuto = gate.canAutoImport;

          setHoldings(parsed);
          setValidationResults(validationResults);
          setWarnings(result.warnings);
          setDetectedSource(result.source);

          // ── Extraction telemetry ─────────────────────────────────────────
          const nMissingFields = validationResults.reduce((s, v) => s + v.missingRequiredFields.length, 0);
          logTelemetry({
            fileType: files.map((f) => f.name.split(".").pop()),
            extractionEngine: engine,
            aiUsed: shouldUseAi,
            nHoldings: parsed.length,
            extractionConfidence: confidenceResults[0]?.stages.ocr ?? 0,
            parserConfidence: confidenceResults[0]?.stages.parser ?? 0,
            validationConfidence: confidenceResults[0]?.stages.validation ?? 0,
            finalConfidence: finalLowest,
            criticalErrors: finalSummary.totalCriticalErrors,
            unknownSymbols: finalSummary.unknownSymbols.length,
            missingFields: nMissingFields,
            reviewRequired: !canAuto,
          });

          const formattedBroker =
            result.source === "angelone"
              ? "Angel One"
              : result.source === "generic"
                ? "Generic/Custom"
                : result.source.charAt(0).toUpperCase() + result.source.slice(1);

          // ── Phase 10: Import Decision ───────────────────────────────────
          if (parsed.length > 0) {
            const issueParts: string[] = [];
            if (!canAuto) {
              if (finalLowest < 0.95) issueParts.push("low confidence");
              if (finalSummary.totalCriticalErrors > 0) issueParts.push(`${finalSummary.totalCriticalErrors} validation error${finalSummary.totalCriticalErrors > 1 ? "s" : ""}`);
              if (finalSummary.unknownSymbols.length > 0) issueParts.push(`${finalSummary.unknownSymbols.length} unknown symbol${finalSummary.unknownSymbols.length > 1 ? "s" : ""}`);
              if (nMissingFields > 0) issueParts.push(`${nMissingFields} missing field${nMissingFields > 1 ? "s" : ""}`);
            }

            const aiHint = aiAvailable ? "" : " Add a Gemini API key in ⚙ Settings for AI-powered corrections.";
            const reviewNeeded = issueParts.length > 0;
            toast.success(
              reviewNeeded
                ? `Parsed ${parsed.length} holdings from ${formattedBroker}. Review needed: ${issueParts.join(", ")}.${aiHint}`
                : `Verified ${parsed.length} holdings from ${formattedBroker} · Review to confirm.`,
            );
            setStep("review");
          } else {
            toast.error(
              "Couldn't extract any holdings. Try a clearer file or different format.",
            );
            setStep("review");
          }
        } else {
          setHoldings(parsed);
          setValidationResults(validationResults);
          setWarnings(result.warnings);
          setDetectedSource(result.source);
          toast.error(
            "Couldn't extract any holdings. Try a clearer file or different format.",
          );
          setStep("review");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Parse failed";
        toast.error(msg);
      } finally {
        setProcessing(false);
        setProgress(undefined);
        setProgressLabel(undefined);
      }
    },
    [files, activePortfolio],
  );

  const handleParse = async () => {
    if (!canContinueUpload) return;

    // Client-side file size limit: 50MB
    const LIMIT_MB = 50;
    const largeFile = files.find((f) => f.size > LIMIT_MB * 1024 * 1024);
    if (largeFile) {
      toast.error(`"${largeFile.name}" exceeds the ${LIMIT_MB}MB limit. Please upload a smaller file.`);
      return;
    }

    setProcessing(true);
    setProgress(0);
    setProgressLabel("Checking files…");

    try {
      const protectedResults = await detectProtectedFiles(files, (p) => {
        setProgressLabel(`Checking ${p.fileName}…`);
        setProgress((p.index + 1) / Math.max(p.total, 1));
      });

      // Collect messages for corrupted / unsupported files (never ask for
      // a password on these — they'll be surfaced as warnings during parse).
      const nonPasswordIssues: string[] = [];
      for (const r of protectedResults) {
        if (r.status !== "protected" && r.status !== "ok" && r.error) {
          nonPasswordIssues.push(r.error);
        }
      }

      const protectedOnes = protectedResults.filter((r) => r.protected) as {
        index: number;
        file: File;
      }[];

      if (protectedOnes.length > 0) {
        setPasswordPromptFiles(
          protectedOnes.map((r) => ({
            name: r.file.name,
            index: r.index,
          })),
        );
        setPasswordPromptIndex(0);
        setPasswordPromptState("idle");
        setPasswordPromptError("");
        setPasswordValue("");
        passwordMapRef.current.clear();
        setCamera(false);
        setStep("password");
        setProcessing(false);
        setProgress(undefined);
        setProgressLabel(undefined);
        // nonPasswordIssues will be surfaced after password flow completes
        if (nonPasswordIssues.length > 0) {
          for (const msg of nonPasswordIssues) {
            toast.error(msg);
          }
        }
      } else {
        setProcessing(false);
        setProgress(undefined);
        setProgressLabel(undefined);
        if (nonPasswordIssues.length > 0) {
          for (const msg of nonPasswordIssues) {
            toast.error(msg);
          }
        }
        if (protectedResults.some((r) => r.status === "ok")) {
          if (background) {
            submitBackgroundJob();
          } else {
            void doParse();
          }
        } else {
          toast.error("None of the selected files could be processed.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File check failed";
      toast.error(msg);
      setProcessing(false);
      setProgress(undefined);
      setProgressLabel(undefined);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    const current = passwordPromptFiles[passwordPromptIndex];
    if (!current || !password.trim()) return;

    setPasswordPromptState("validating");

    try {
      const file = files[current.index];
      const valid = await validatePassword(file, password);

      if (valid) {
        setPasswordPromptState("success");
        passwordMapRef.current.set(current.index, password);

        await new Promise((r) => setTimeout(r, 600));

        if (usePasswordForAll) {
          // Apply this password to every remaining protected file
          for (let i = passwordPromptIndex + 1; i < passwordPromptFiles.length; i++) {
            passwordMapRef.current.set(passwordPromptFiles[i].index, password);
          }
          setStep("upload");
          setShowPasswordPrompt(false);
          setPasswordPromptFiles([]);
          setPasswordPromptIndex(0);
          setUsePasswordForAll(false);
          if (background) {
            submitBackgroundJob(passwordMapRef.current);
          } else {
            void doParse(passwordMapRef.current);
          }
        } else if (passwordPromptIndex < passwordPromptFiles.length - 1) {
          setPasswordPromptIndex((i) => i + 1);
          setPasswordPromptState("idle");
          setPasswordPromptError("");
        } else {
          setStep("upload");
          setShowPasswordPrompt(false);
          setPasswordPromptFiles([]);
          setPasswordPromptIndex(0);
          if (background) {
            submitBackgroundJob(passwordMapRef.current);
          } else {
            void doParse(passwordMapRef.current);
          }
        }
      } else {
        setPasswordPromptState("error");
        setPasswordPromptError(
          "That password didn\u2019t work. Passwords are case-sensitive \u2014 double-check and try again.",
        );
      }
    } catch {
      setPasswordPromptState("error");
      setPasswordPromptError(
        "Could not validate password right now. Check your connection and try again.",
      );
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

  const handleCreate = async (holdingsToSave?: Holding[]) => {
    setProcessing(true);
    try {
      const created = await createPortfolio({
        name: name.trim(),
        holdings: holdingsToSave ?? holdings,
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

  const dialogTitle: Partial<Record<Step, string>> = {
    upload: "Create a new portfolio",
    review: "Review extracted holdings",
    confirm: "Replace active portfolio?",
    success: "Portfolio created",
  };
  const dialogDesc: Partial<Record<Step, string>> = {
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
          {step !== "password" && (
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
          )}

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
                {!processing && files.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={background}
                      onChange={(e) => setBackground(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                    />
                    Run in background — close dialog once submitted
                  </label>
                )}
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
                <ReviewTable holdings={holdings} onChange={setHoldings} validationResults={validationResults} />
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

          {step !== "password" ? (
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
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
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
                    onClick={() => handleCreate()}
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
          ) : (
            <div className="flex items-center justify-center py-6">
              <PasswordPromptDialog
                embedded
                protectedFiles={passwordPromptFiles}
                currentIndex={passwordPromptIndex}
                state={passwordPromptState}
                errorMessage={passwordPromptError || undefined}
                password={passwordValue}
                onPasswordChange={(v) => {
                  setPasswordValue(v);
                  setPasswordPromptError("");
                }}
                onSubmit={handlePasswordSubmit}
                onCancel={() => {
                  setPasswordPromptState("idle");
                  setPasswordPromptError("");
                  setPasswordValue("");
                  passwordMapRef.current.clear();
                  setStep("upload");
                }}
                totalProtected={passwordPromptFiles.length}
                useForAll={usePasswordForAll}
                onUseForAllChange={setUsePasswordForAll}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CameraCapture
        open={camera && step !== "password"}
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
