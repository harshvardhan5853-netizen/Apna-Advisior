import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  confidenceColor,
  confidenceBg,
  needsReview,
  shouldAutoImport,
} from "../confidence-scorer";

/* ─── computeConfidence ─── */
describe("computeConfidence", () => {
  it("returns High for scores >= 0.95", () => {
    const r = computeConfidence({ ocr: 1, parser: 1, validation: 1 });
    expect(r.finalScore).toBe(1);
    expect(r.label).toBe("High");
  });

  it("returns Medium for scores between 0.7 and 0.95", () => {
    const r = computeConfidence({ ocr: 0.8, parser: 0.8, validation: 0.5 });
    expect(r.finalScore).toBeGreaterThanOrEqual(0.7);
    expect(r.finalScore).toBeLessThan(0.95);
    expect(r.label).toBe("Medium");
  });

  it("returns Low for scores < 0.7", () => {
    const r = computeConfidence({ ocr: 0.3, parser: 0.3, validation: 0.3 });
    expect(r.finalScore).toBeLessThan(0.7);
    expect(r.label).toBe("Low");
  });
});

/* ─── shouldAutoImport ─── */
describe("shouldAutoImport", () => {
  it("returns true when score >= 0.95", () => {
    expect(shouldAutoImport(computeConfidence({ ocr: 1, parser: 1, validation: 1 }))).toBe(true);
  });

  it("returns false when score < 0.95", () => {
    expect(shouldAutoImport(computeConfidence({ ocr: 0.5, parser: 0.5, validation: 0.5 }))).toBe(false);
  });
});

/* ─── needsReview ─── */
describe("needsReview", () => {
  it("returns false for high confidence", () => {
    expect(needsReview(computeConfidence({ ocr: 1, parser: 1, validation: 1 }))).toBe(false);
  });

  it("returns true for medium confidence", () => {
    expect(needsReview(computeConfidence({ ocr: 0.5, parser: 0.5, validation: 0.5 }))).toBe(true);
  });
});

/* ─── confidenceColor ─── */
describe("confidenceColor", () => {
  it("returns emerald for high", () => {
    expect(confidenceColor(0.96)).toContain("emerald");
  });

  it("returns amber for medium", () => {
    expect(confidenceColor(0.8)).toContain("amber");
  });

  it("returns red for low", () => {
    expect(confidenceColor(0.5)).toContain("red");
  });
});

/* ─── confidenceBg ─── */
describe("confidenceBg", () => {
  it("returns emerald bg for high", () => {
    expect(confidenceBg(0.96)).toContain("emerald");
  });

  it("returns amber bg for medium", () => {
    expect(confidenceBg(0.8)).toContain("amber");
  });

  it("returns red bg for low", () => {
    expect(confidenceBg(0.5)).toContain("red");
  });
});
