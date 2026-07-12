/**
 * Standalone extraction pipeline.
 *
 * Extracted from the inline `doParse()` inside create-portfolio-dialog.tsx
 * so it can be invoked both from the dialog (synchronous modal flow) and
 * from a background job context. Every phase reports progress via callback.
 */

import type { Holding, BrokerSource, ImportStats } from "@/types/portfolio";
import { parseFiles, type ParseFilesProgress } from "@/lib/parsers";
import {
  validateHoldings,
  mergeDuplicates,
  checkAutoImportGate,
  summarizeValidation,
  type HoldingValidation,
} from "@/lib/validation-engine";
import {
  computeConfidence,
  deriveStageScores,
} from "@/lib/confidence-scorer";
import { applyAiEnhancements } from "@/lib/ai-enhancer";
import { readAiExtractionSettings } from "@/lib/ai-extraction-settings";

/* ─── Progress reporting ─── */

export interface ExtractionProgress {
  /** Short human-readable label, e.g. "Reading files…" */
  label: string;
  /** 0–1 fraction, undefined when indeterminate */
  pct?: number;
}

export interface ExtractionResult {
  holdings: Holding[];
  source: BrokerSource;
  warnings: string[];
  validationResults: HoldingValidation[];
  /** true if the extraction can be auto-imported (no review needed) */
  autoImportable: boolean;
  stats: ImportStats;
}

export type OnExtractionProgress = (p: ExtractionProgress) => void;

/* ─── The extraction pipeline ─── */

export async function runExtraction(
  files: File[],
  onProgress: OnExtractionProgress,
  passwordMap?: Map<number, string>,
): Promise<ExtractionResult> {
  onProgress({ label: "Reading files…", pct: 0 });

  const result = await parseFiles(files, (p: ParseFilesProgress) => {
    onProgress({
      label:
        p.phase === "progress"
          ? `Extracting from ${p.fileName}…`
          : p.phase === "start"
            ? `Reading ${p.fileName}…`
            : p.phase === "done"
              ? `Finished ${p.fileName}`
              : p.message ?? "…",
      pct:
        p.phase === "progress" && typeof p.pct === "number"
          ? p.index / Math.max(p.total, 1) + p.pct / Math.max(p.total, 1)
          : p.phase === "done"
            ? (p.index + 1) / Math.max(p.total, 1)
            : undefined,
    });
  }, passwordMap);

  let parsed = result.holdings;
  const engine = result.source;

  if (parsed.length === 0) {
    return {
      holdings: parsed,
      source: engine,
      warnings: result.warnings,
      validationResults: [],
      autoImportable: false,
      stats: emptyStats(),
    };
  }

  // ── Validation ──────────────────────────────────────────────────
  onProgress({ label: "Validating extracted data…" });
  let validationResults = validateHoldings(parsed);
  const summary = summarizeValidation(validationResults);

  const settings = readAiExtractionSettings();
  const aiAvailable = settings.geminiApiKey?.length > 0;
  const shouldUseAi =
    aiAvailable &&
    (summary.totalCriticalErrors > 0 ||
      summary.unknownSymbols.length > 0 ||
      validationResults.some((v) => v.missingRequiredFields.length > 0) ||
      parsed.some((h) => h.confidence < 0.95));

  // ── AI Enhancement ──────────────────────────────────────────────
  if (shouldUseAi) {
    onProgress({ label: "AI is cleaning extracted data…" });

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
        onProgress({ label: "Re-validating cleaned data…" });
        validationResults = validateHoldings(parsed);
      }
    } catch {
      // AI failure must NEVER break imports
    }
  }

  // ── Merge duplicates ────────────────────────────────────────────
  onProgress({ label: "Merging duplicate entries…" });
  parsed = mergeDuplicates(parsed);

  // ── Final confidence ────────────────────────────────────────────
  onProgress({ label: "Computing confidence scores…" });
  validationResults = validateHoldings(parsed);

  const confidenceResults = parsed.map((h) => {
    const v = validationResults.find((vr) => vr.holdingId === h.id);
    const stages = deriveStageScores(h, v);
    return { stages, result: computeConfidence(stages) };
  });
  const finalLowest = Math.min(
    ...confidenceResults.map((c) => c.result.finalScore),
  );

  const gate = checkAutoImportGate(parsed, validationResults, finalLowest);

  // ── Stats ───────────────────────────────────────────────────────
  let invested = 0;
  let currentValue = 0;
  let review = 0;
  for (const h of parsed) {
    invested += h.investedAmount || 0;
    currentValue += h.currentValue || 0;
    if (h.needsReview) review += 1;
  }

  return {
    holdings: parsed,
    source: engine,
    warnings: result.warnings,
    validationResults,
    autoImportable: gate.canAutoImport,
    stats: {
      totalDetected: parsed.length,
      successfullyImported: parsed.length - review,
      requiresReview: review,
      totalInvested: invested,
      estimatedCurrentValue: currentValue,
    },
  };
}

function emptyStats(): ImportStats {
  return {
    totalDetected: 0,
    successfullyImported: 0,
    requiresReview: 0,
    totalInvested: 0,
    estimatedCurrentValue: 0,
  };
}
