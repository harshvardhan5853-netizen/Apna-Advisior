"use client";
import type Tesseract from "tesseract.js";
import type { BrokerSource, Holding, ParseResult } from "@/types/portfolio";
import {
  normalizeStockName,
  normalizeSymbol,
  parseNumberLoose,
  uid,
} from "../utils";
import { extractHoldingsFromLines } from "./pdf";

/**
 * OCR pipeline for broker screenshots.
 *
 * Key ideas that make this actually work on real broker screenshots:
 *
 *   1. Upscale the input image (~2000 px wide) before running Tesseract so
 *      small decimal points and thin digits survive OCR. Native-resolution
 *      broker screenshots routinely lose the "." in ₹2,793.90 without this.
 *
 *   2. Run Tesseract in PSM 6 (single uniform block) with
 *      `preserve_interword_spaces` — dramatically improves column integrity
 *      for tabular broker views (Upstox / Angel One / Zerodha / Dhan).
 *
 *   3. Reconstruct visual rows from word-level bounding boxes using
 *      Y-clustering, NOT `data.lines` (which are text lines within a
 *      paragraph, not table rows).
 *
 *   4. Auto-detect layout: Groww shows each holding as a multi-line CARD
 *      ("Name" / "N shares · Avg. ₹X" / LTP / day-change / PnL / PnL% /
 *      current / invested), while everyone else uses a TABULAR row.
 *
 *   5. After parsing, cross-check each row with the identity
 *          qty × avg  ≈  invested       and       qty × ltp  ≈  currentValue
 *      to detect and correct lost decimal points (e.g. `279390` → `2793.90`).
 */

type WordBox = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number;
};

type VisualRow = {
  words: WordBox[];
  text: string;
  yCenter: number;
  height: number;
};

export async function parseImageOcr(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  if (typeof window === "undefined") {
    return {
      holdings: [],
      source: "generic",
      warnings: ["OCR unavailable on server"],
    };
  }

  // Primary: Python OpenCV + EasyOCR/Tesseract (+ Gemini). Browser Tesseract is fallback.
  try {
    const { parseViaExtractApi } = await import("./extract-api");
    const apiResult = await parseViaExtractApi(file, "image", onProgress);
    if (apiResult) return apiResult;
  } catch (err) {
    console.warn("Server extraction failed, falling back to browser Tesseract:", err);
  }

  onProgress?.(0.02);
  const { dataUrl, scale } = await preprocessImage(file);
  onProgress?.(0.08);

  // Use an explicit worker so we can pin PSM 6 (SINGLE_BLOCK). This helps
  // Tesseract treat broker tables as one coherent tabular block instead of
  // trying to reflow paragraphs.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.min(0.98, 0.1 + m.progress * 0.87));
      }
    },
  });

  let result: Tesseract.RecognizeResult;
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6" as unknown as Tesseract.PSM,
      preserve_interword_spaces: "1",
    });
    result = await worker.recognize(dataUrl);
  } finally {
    await worker.terminate().catch(() => {});
  }

  const rawText = result.data.text ?? "";
  const broker = detectBroker(rawText);

  // Prefer structured word-bbox extraction. Fall back to the legacy
  // line-based extractor if we can't get anything from the words path.
  const words = extractWords(result);
  const warnings: string[] = [];
  let holdings: Holding[] = [];

  if (words.length > 0) {
    const rows = groupWordsIntoRows(words);
    const mode = detectLayoutMode(rawText, rows);
    holdings =
      mode === "card"
        ? extractCardLayout(rows, broker)
        : extractTabularLayout(rows, broker);
  }

  if (holdings.length === 0) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    holdings = extractHoldingsFromLines(lines, broker);
    if (holdings.length > 0) {
      warnings.push(
        "Used fallback text parser — please verify each row carefully before saving.",
      );
    }
  }

  if (holdings.length === 0) {
    warnings.push(
      "Couldn't identify any holdings rows. Try a clearer screenshot with the full table visible, or add rows manually.",
    );
  }

  onProgress?.(1);
  void scale;
  return { holdings, source: broker, warnings };
}

/* ─────────────────────────── image preprocessing ─────────────────────────── */

/**
 * Upscale the input image so that thin digits and decimal points survive
 * OCR. Also flatten alpha onto a white background — otherwise dark-mode
 * screenshots with transparent regions confuse Tesseract.
 */
async function preprocessImage(
  file: File,
): Promise<{ dataUrl: string; scale: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to decode image"));
      i.src = url;
    });
    const targetWidth = 2000;
    const rawScale = targetWidth / Math.max(1, img.naturalWidth);
    const scale = Math.max(1, Math.min(3, rawScale));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // Extremely unlikely; fall back to the original file.
      return { dataUrl: await fileToDataUrl(file), scale: 1 };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Flatten onto white so transparency doesn't leak.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/png"), scale };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

/* ─────────────────── word-bbox extraction and row grouping ────────────────── */

function extractWords(result: Tesseract.RecognizeResult): WordBox[] {
  const data = result.data as unknown as {
    words?: Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      confidence: number;
    }>;
  };
  if (!Array.isArray(data.words)) return [];
  return data.words
    .filter((w) => w.text && w.text.trim().length > 0)
    .map((w) => ({
      text: w.text.trim(),
      x0: w.bbox.x0,
      y0: w.bbox.y0,
      x1: w.bbox.x1,
      y1: w.bbox.y1,
      confidence: w.confidence,
    }));
}

/**
 * Cluster words into visual rows using Y-center proximity. Row height
 * tolerance = ~55 % of the median word height, which keeps normal text lines
 * separate while grouping words within the same visual row across wide
 * columns.
 */
function groupWordsIntoRows(words: WordBox[]): VisualRow[] {
  if (words.length === 0) return [];
  const heights = words.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 20;
  const tolerance = medianH * 0.55;

  const sorted = [...words].sort(
    (a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2,
  );

  const rows: WordBox[][] = [];
  let cur: WordBox[] = [];
  let sumY = 0;

  for (const w of sorted) {
    const c = (w.y0 + w.y1) / 2;
    const avg = cur.length ? sumY / cur.length : c;
    if (cur.length === 0 || Math.abs(c - avg) <= tolerance) {
      cur.push(w);
      sumY += c;
    } else {
      rows.push(cur);
      cur = [w];
      sumY = c;
    }
  }
  if (cur.length > 0) rows.push(cur);

  return rows.map((r) => {
    r.sort((a, b) => a.x0 - b.x0);
    const yCenter = r.reduce((s, w) => s + (w.y0 + w.y1) / 2, 0) / r.length;
    const height = Math.max(...r.map((w) => w.y1 - w.y0));
    return {
      words: r,
      text: r.map((w) => w.text).join(" "),
      yCenter,
      height,
    };
  });
}

/* ───────────────────────── layout detection ─────────────────────────────── */

const HEADER_TOKENS = new Set([
  "name",
  "names",
  "company",
  "instrument",
  "stock",
  "symbol",
  "qty",
  "quantity",
  "shares",
  "avg",
  "average",
  "ltp",
  "price",
  "market",
  "cmp",
  "inv",
  "invested",
  "investment",
  "amt",
  "amount",
  "current",
  "cur",
  "value",
  "val",
  "overall",
  "day",
  "days",
  "returns",
  "return",
  "gain",
  "loss",
  "g/l",
  "gl",
  "p&l",
  "pnl",
  "p/l",
  "holdings",
  "portfolio",
  "net",
  "chg",
  "change",
]);

function looksLikeHeaderRow(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9%/&\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const alpha = tokens.filter((t) => /^[a-z%/&]/.test(t));
  if (alpha.length === 0) return false;
  const hits = alpha.filter((t) => HEADER_TOKENS.has(t)).length;
  // Very few digits AND at least 2 header words → this is a header row.
  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  if (hits >= 2 && digitCount <= 2) return true;
  // "Holdings 6" style small header
  if (hits >= 1 && alpha.length <= 3 && digitCount <= 2) return true;
  return false;
}

const SHARES_AVG_RE =
  /(\d[\d,]*)\s*shares?\s*[^A-Za-z\d]*avg\.?\s*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i;

function detectLayoutMode(
  rawText: string,
  rows: VisualRow[],
): "card" | "tabular" {
  const cardHits = rows.filter((r) => SHARES_AVG_RE.test(r.text)).length;
  if (cardHits >= 2) return "card";
  if (/\bgroww\b/i.test(rawText) && cardHits >= 1) return "card";
  return "tabular";
}

/* ─────────────────────── numeric helpers ────────────────────────────────── */

/** Extract all numeric values from a line, preserving sign from +/- prefix. */
function extractSignedNumbers(text: string): number[] {
  const out: number[] = [];
  // Signed, optional currency prefix, digits (with commas), optional decimal,
  // optional % suffix. The `−` (U+2212) minus is recognised too.
  const re =
    /(?<![A-Za-z0-9])([+\-−])?\s*(?:₹|Rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*%?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sign = m[1] === "-" || m[1] === "−" ? -1 : 1;
    const cleaned = m[2].replace(/,/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n)) continue;
    out.push(sign * n);
  }
  return out;
}

/**
 * Correct OCR-lost decimal points using the identity qty × avg ≈ invested.
 * Tries dividing avg by 10, 100 or 1000 — whichever makes the identity hold.
 */
function correctDecimalPair(
  qty: number,
  avg: number,
  invested: number,
): { avg: number; invested: number } {
  if (!(qty > 0) || !(avg > 0) || !(invested > 0)) return { avg, invested };
  const near = (a: number, b: number) => Math.abs(a / b - 1) < 0.08;
  if (near(qty * avg, invested)) return { avg, invested };
  for (const div of [10, 100, 1000]) {
    if (near(qty * (avg / div), invested)) return { avg: avg / div, invested };
  }
  // avg is fine, invested might have lost a decimal / dropped a digit.
  for (const div of [10, 100, 1000]) {
    if (near(qty * avg, invested * div)) return { avg, invested: invested * div };
  }
  return { avg, invested };
}

/**
 * Score a row 0..1. Higher score = more math-consistent = we can trust it.
 * Rows with score < 0.8 will be flagged for review in the UI.
 */
function scoreRow(
  qty: number,
  avg: number,
  ltp: number,
  invested: number,
  curVal: number,
): number {
  let score = 0.4;
  if (qty > 0) score += 0.08;
  if (avg > 0) score += 0.05;
  if (ltp > 0) score += 0.05;
  if (invested > 0) score += 0.05;
  if (curVal > 0) score += 0.05;
  const near = (a: number, b: number) => Math.abs(a / b - 1) < 0.05;
  if (qty > 0 && avg > 0 && invested > 0 && near(qty * avg, invested))
    score += 0.16;
  if (qty > 0 && ltp > 0 && curVal > 0 && near(qty * ltp, curVal))
    score += 0.16;
  return Math.min(1, score);
}

function normText(s: string): string {
  return s
    .replace(/[|]/g, " ")
    .replace(/[·•]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[₨]/g, "₹")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ─────────────────────── tabular layout extractor ───────────────────────── */

/**
 * Merge orphan continuation rows into the row above. Handles broker views
 * that stack PnL and PnL% on two visual lines within one table cell
 * (Upstox, Angel One).
 */
function mergeStackedRows(rows: VisualRow[]): VisualRow[] {
  if (rows.length === 0) return rows;
  const heights = rows.map((r) => r.height).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 20;
  const merged: VisualRow[] = [];
  for (const r of rows) {
    const prev = merged[merged.length - 1];
    const rText = normText(r.text);
    const rHasLetters = /[A-Za-z]{3,}/.test(rText);
    const rHasNums = /\d/.test(rText);
    if (
      prev &&
      !rHasLetters &&
      rHasNums &&
      r.yCenter - prev.yCenter < medianH * 1.6 &&
      /[A-Za-z]{3,}/.test(prev.text)
    ) {
      // Same visual row's continuation.
      prev.words.push(...r.words);
      prev.words.sort((a, b) => a.x0 - b.x0);
      prev.text = prev.words.map((w) => w.text).join(" ");
      continue;
    }
    merged.push({
      words: [...r.words],
      text: r.text,
      yCenter: r.yCenter,
      height: r.height,
    });
  }
  return merged;
}

function extractTabularLayout(
  rows: VisualRow[],
  source: BrokerSource,
): Holding[] {
  const holdings: Holding[] = [];
  const merged = mergeStackedRows(rows);

  for (const row of merged) {
    const text = normText(row.text);
    if (!text) continue;
    if (looksLikeHeaderRow(text)) continue;

    // Locate the first numeric token; everything before it is the name.
    const firstNumMatch = /(?<![A-Za-z])\d/.exec(text);
    if (!firstNumMatch) continue;
    const firstNumIdx = firstNumMatch.index;
    if (firstNumIdx <= 0) continue;

    const namePart = text
      .slice(0, firstNumIdx)
      .replace(/[^\w &().-]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!namePart || !/[A-Za-z]/.test(namePart)) continue;
    // Guard against header labels bleeding into the name half.
    if (looksLikeHeaderRow(namePart)) continue;

    const nums = extractSignedNumbers(text.slice(firstNumIdx));
    if (nums.length < 3) continue;

    const [qtyR, avgR, ltpR, invR, curValR, pnlR, pnlPctR] = nums;
    const qty = qtyR ?? 0;
    let avg = avgR ?? 0;
    let ltp = ltpR ?? 0;
    let invested = invR ?? 0;
    let curVal = curValR ?? 0;

    // Correct decimal-point loss using math sanity checks.
    ({ avg, invested } = correctDecimalPair(qty, avg, invested));
    const ltpFix = correctDecimalPair(qty, ltp, curVal);
    ltp = ltpFix.avg;
    curVal = ltpFix.invested;

    let pnl =
      pnlR !== undefined && Number.isFinite(pnlR) ? pnlR : curVal - invested;
    let pnlPct =
      pnlPctR !== undefined && Number.isFinite(pnlPctR)
        ? Math.abs(pnlPctR) > 3
          ? pnlPctR / 100
          : pnlPctR
        : invested > 0
          ? pnl / invested
          : 0;

    // Sign-consistency: if the math says loss but extracted pnl is positive
    // (or vice versa), trust the math derived from invested/curVal.
    const mathPnl = curVal - invested;
    if (
      Math.abs(mathPnl) > 0.5 &&
      Math.sign(pnl) !== 0 &&
      Math.sign(pnl) !== Math.sign(mathPnl) &&
      invested > 0
    ) {
      pnl = mathPnl;
      pnlPct = mathPnl / invested;
    }

    const confidence = scoreRow(qty, avg, ltp, invested, curVal);
    holdings.push({
      id: uid("h"),
      stockName: normalizeStockName(namePart),
      symbol: normalizeSymbol(namePart.split(/\s+/)[0]),
      exchange: "UNKNOWN",
      quantity: qty,
      avgBuyPrice: avg,
      currentPrice: ltp,
      investedAmount: invested,
      currentValue: curVal,
      pnl,
      pnlPercent: pnlPct,
      confidence,
      needsReview: confidence < 0.8,
      source,
    });
  }
  return holdings;
}

/* ─────────────────────── card layout extractor (Groww) ──────────────────── */

function extractCardLayout(
  rows: VisualRow[],
  source: BrokerSource,
): Holding[] {
  const holdings: Holding[] = [];
  const items = rows.map((r) => ({ ...r, text: normText(r.text) }));

  for (let i = 0; i < items.length; i++) {
    const m = SHARES_AVG_RE.exec(items[i].text);
    if (!m) continue;

    // Name is the closest non-empty, non-numeric row above the "N shares · Avg" line.
    let name = "";
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const t = items[j].text.trim();
      if (!t) continue;
      if (SHARES_AVG_RE.test(t)) break;
      if (looksLikeHeaderRow(t)) continue;
      // Reject rows that start with a currency symbol or digit — those are
      // number rows from the previous card.
      if (/^[+\-−₹\d(]/.test(t)) continue;
      if (!/[A-Za-z]/.test(t)) continue;
      name = t
        .replace(/[^\w &().-]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      break;
    }
    if (!name) continue;

    const qty = parseNumberLoose(m[1]);
    const avg = parseNumberLoose(m[2]);

    // Collect numbers from the following rows until we hit the next card
    // boundary or run past a reasonable window.
    const nextNums: number[] = [];
    let scannedRows = 0;
    for (let k = i + 1; k < items.length && scannedRows < 10; k++) {
      const t = items[k].text.trim();
      if (!t) continue;
      if (SHARES_AVG_RE.test(t)) break;
      // Pure-alphabetic row after we've collected enough numbers is the next
      // card's name.
      const hasDigits = /\d/.test(t);
      const hasWords = /[A-Za-z]{3,}/.test(t);
      if (!hasDigits && hasWords && nextNums.length >= 5) break;
      nextNums.push(...extractSignedNumbers(t));
      scannedRows += 1;
      if (nextNums.length >= 7) break;
    }

    // Groww card fields (top-to-bottom on the screenshot):
    //   [0] LTP
    //   [1] day-change absolute (may be missing on cards with 0 day-change)
    //   [2] day-change %          (same)
    //   [3] PnL absolute (signed)
    //   [4] PnL %
    //   [5] Current value
    //   [6] Invested amount
    let ltp = 0;
    let pnl = 0;
    let pnlPct = 0;
    let curVal = 0;
    let invested = 0;

    if (nextNums.length >= 7) {
      ltp = nextNums[0];
      pnl = nextNums[3];
      pnlPct = nextNums[4];
      curVal = nextNums[5];
      invested = nextNums[6];
    } else if (nextNums.length === 6) {
      // Sometimes day-change is one number instead of two.
      ltp = nextNums[0];
      pnl = nextNums[2];
      pnlPct = nextNums[3];
      curVal = nextNums[4];
      invested = nextNums[5];
    } else if (nextNums.length === 5) {
      // No day-change line at all.
      ltp = nextNums[0];
      pnl = nextNums[1];
      pnlPct = nextNums[2];
      curVal = nextNums[3];
      invested = nextNums[4];
    } else if (nextNums.length >= 3) {
      // Very rough fallback: assume last two numbers are curVal + invested.
      ltp = nextNums[0];
      curVal = nextNums[nextNums.length - 2];
      invested = nextNums[nextNums.length - 1];
      pnl = curVal - invested;
      pnlPct = invested > 0 ? pnl / invested : 0;
    } else {
      continue;
    }

    // Groww always shows a plausible integer for invested; use that as the
    // truth to correct any OCR damage on curVal and/or ltp.
    const ltpFix = correctDecimalPair(qty, ltp, curVal);
    ltp = ltpFix.avg;
    curVal = ltpFix.invested;

    // Percent normalisation.
    if (Math.abs(pnlPct) > 3) pnlPct = pnlPct / 100;

    // Sign correction: infer from the math whenever the OCR-extracted sign
    // disagrees with (curVal - invested).
    const mathPnl = curVal - invested;
    if (
      Math.abs(mathPnl) > 0.5 &&
      Math.sign(pnl) !== 0 &&
      Math.sign(pnl) !== Math.sign(mathPnl)
    ) {
      pnl = mathPnl;
      if (invested > 0) pnlPct = mathPnl / invested;
    }
    // If percent and absolute disagree wildly, prefer the math-derived %.
    if (invested > 0 && Math.abs(pnlPct * invested - pnl) > Math.abs(pnl) * 0.5) {
      pnlPct = mathPnl / invested;
      pnl = mathPnl;
    }

    const confidence = scoreRow(qty, avg, ltp, invested, curVal);
    holdings.push({
      id: uid("h"),
      stockName: normalizeStockName(name),
      symbol: normalizeSymbol(name.split(/\s+/)[0]),
      exchange: "UNKNOWN",
      quantity: qty,
      avgBuyPrice: avg,
      currentPrice: ltp,
      investedAmount: invested,
      currentValue: curVal,
      pnl,
      pnlPercent: pnlPct,
      confidence,
      needsReview: confidence < 0.8,
      source,
    });
  }
  return holdings;
}

/* ───────────────────────── broker detection ─────────────────────────────── */

/** Cheap keyword-based broker detection from OCR text. */
export function detectBroker(text: string): BrokerSource {
  const t = text.toLowerCase();
  if (/\bgroww\b/.test(t)) return "groww";
  if (/\bzerodha\b|\bkite\b|\bconsole\b/.test(t)) return "zerodha";
  if (/\bangel one\b|\bangelone\b|\bangel broking\b/.test(t)) return "angelone";
  if (/\bupstox\b/.test(t)) return "upstox";
  if (/\bdhan\b/.test(t)) return "dhan";
  return "generic";
}

export type { Holding };
