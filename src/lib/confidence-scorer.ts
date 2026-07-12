import type { Holding } from "@/types/portfolio";
import type { HoldingValidation } from "./validation-engine";

// ── Stage weights (Phase 9: Confidence Scoring) ──────────────────────────
// AI does NOT directly increase confidence. It modifies data.
// Validation determines trust after AI has cleaned the data.

export const STAGE_WEIGHTS = {
  /** How well the raw OCR / extraction engine read the text. */
  ocr: 0.40,
  /** How cleanly the Row Builder parsed columns. */
  parser: 0.30,
  /** Cross-field consistency & known-market validation. */
  validation: 0.30,
} as const;

export type StageName = keyof typeof STAGE_WEIGHTS;

export interface StageScores {
  ocr: number;       // 0..1 — real OCR confidence from extraction engine
  parser: number;    // 0..1
  validation: number; // 0..1 — trust score from validation engine
}

export interface ConfidenceResult {
  /** 0..1 — 0.95+ = auto-import (combined with validation gate). */
  finalScore: number;
  /** Per-stage breakdown. */
  stages: StageScores;
  /** Human label. */
  label: "High" | "Medium" | "Low";
}

// ── Scoring helpers ──────────────────────────────────────────────────────

/** Compute weighted confidence from stage scores. */
export function computeConfidence(stages: StageScores): ConfidenceResult {
  let score = 0;
  score += stages.ocr * STAGE_WEIGHTS.ocr;
  score += stages.parser * STAGE_WEIGHTS.parser;
  score += stages.validation * STAGE_WEIGHTS.validation;

  const finalScore = Math.min(1, Math.max(0, Math.round(score * 1000) / 1000));
  return {
    finalScore,
    stages,
    label: finalScore >= 0.95 ? "High" : finalScore >= 0.7 ? "Medium" : "Low",
  };
}

// ── Convenience: derive stage scores from a holding + validation ─────────

export function deriveStageScores(
  h: Holding,
  validation: HoldingValidation | undefined,
): StageScores {
  // OCR score: real confidence from extraction engine
  // (handled by parsers: PaddleOCR scores for images, 1.0 for CSV/Excel)
  const ocr = h.confidence;

  // Parser score: 1.0 if fields are reasonable, lower if dubious
  const hasParserIssues =
    !h.stockName ||
    h.quantity <= 0 ||
    h.avgBuyPrice <= 0 ||
    h.currentPrice <= 0;
  const parser = hasParserIssues ? 0.5 : 1.0;

  // Validation score from the engine: 1.0 - confidencePenalty
  const validation_score = validation ? Math.max(0, 1 - (validation.confidencePenalty ?? 0)) : 1.0;

  return { ocr, parser, validation: validation_score };
}

/** @deprecated Use `checkAutoImportGate` from validation-engine instead. */
export function shouldAutoImport(result: ConfidenceResult): boolean {
  return result.finalScore >= 0.95;
}

export function needsReview(result: ConfidenceResult): boolean {
  return result.finalScore < 0.95;
}

export function confidenceColor(score: number): string {
  if (score >= 0.95) return "text-emerald-300";
  if (score >= 0.7) return "text-amber-300";
  return "text-red-300";
}

export function confidenceBg(score: number): string {
  if (score >= 0.95) return "bg-emerald-400/10 border-emerald-400/20";
  if (score >= 0.7) return "bg-amber-400/10 border-amber-400/20";
  return "bg-red-400/10 border-red-400/20";
}
