/**
 * AI Enhancement layer (Phase 7).
 *
 * Gemini is NOT used for OCR. It is only called to CLEAN / REPAIR already-parsed
 * holdings data when confidence is low or validation found issues.
 *
 * Trigger rules (caller's responsibility):
 *   - OCR / Parser confidence < 95%
 *   - Validation engine found errors
 *   - Missing columns after parsing
 *   - Unknown symbol
 *
 * Input:  Array of partially-parsed Holding objects (possibly with OCR noise).
 * Output: Array of cleaned Holding objects with Gemini's corrections applied
 *         and a per-holding aiConfidence (0..1) reflecting Gemini's certainty.
 */

import type { Holding } from "@/types/portfolio";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 20_000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface AiEnhancedHolding {
  original: Holding;
  cleaned: Partial<Holding>;
  /** 0..1 — how confident Gemini is in its corrections (from the model). */
  aiConfidence: number;
  /** Which fields were changed. */
  changedFields: string[];
  /** Gemini's free-text note about what it fixed. */
  note: string;
}

export interface AiEnhanceResult {
  enhanced: AiEnhancedHolding[];
  /** The model used. */
  model: string;
  /** Overall Gemini confidence for this batch. */
  batchConfidence: number;
}

// ── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial data cleaning assistant for Indian stock portfolios.

Your job is to CLEAN already-extracted data — NOT to perform OCR or re-recognize text.

For each holding, given these fields: stockName, symbol, quantity, avgBuyPrice, currentPrice, investedAmount, currentValue.

Rules:
1. Fix obvious OCR misreads in stock names (e.g. "HDFCBANX" → "HDFCBANK", "INFOSYS" → "INFOSYS", "TCS" is correct).
2. Fix Indian ticker symbols to NSE convention (e.g. "HDFC" → "HDFCBANK", "ITC" keep, "RELIANCE" keep).
3. Correct numeric OCR errors in prices/quantities (e.g. "1,45O" → 1450, "5,OO" → 5000, "54,1O1" → 54101).
4. Remove commas from numbers and convert to proper numeric values.
5. If a field appears correct, leave it as-is (pass through).
6. If you're uncertain about a correction, set shouldReview: true.
7. Never invent data that isn't in the input. If something is missing, leave it null.
8. Recompute investedAmount = quantity * avgBuyPrice if you changed any of those.
9. Recompute currentValue = quantity * currentPrice if you changed any of those.
10. Recompute pnl = currentValue - investedAmount (rough estimate).
11. Try to correct partial symbols: e.g. "SIANPAINT" → "ASIANPAINT". "BLUESTARCO" → "BLUESTARCO" (wait its correct).
  Use the NSE symbol list: HCLTECH, BLUESTARCO, ASIANPAINT, INDUSINDBK, INDIGO, LT, M&M, MARUTI, NESTLEIND, TATAMOTORS, TCS, RELIANCE, HDFCBANK, ICICIBANK, SBIN, BHARTIARTL, KOTAKBANK, BAJFINANCE, DMART, WIPRO, ITC, AXISBANK, ADANIENT, TITAN, SUNPHARMA, BAJAJFINSV, NTPC, POWERGRID, ULTRACEMCO, ASIANPAINT, INFOSYS.

Output format: JSON array of objects, one per input holding, each with:
{
  "stockName": corrected or null,
  "symbol": corrected or null,
  "quantity": corrected number or null,
  "avgBuyPrice": corrected number or null,
  "currentPrice": corrected number or null,
  "investedAmount": corrected number or null,
  "currentValue": corrected number or null,
  "note": "brief explanation of what was fixed",
  "aiConfidence": 0.0-1.0,
  "shouldReview": true/false
}

Return ONLY the JSON array, no other text.`;

// ── Gemini API call ─────────────────────────────────────────────────────────

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number };
}

async function callGemini(
  apiKey: string,
  model: string,
  holdingsPayload: string,
): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: holdingsPayload }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 4096,
      responseMimeType: "application/json" as const,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const parsed: GeminiResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = parsed.error?.message ?? response.statusText ?? "unknown";
      throw new Error(`Gemini responded ${response.status}: ${msg}`);
    }

    const blockReason = parsed.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`Gemini blocked: ${blockReason}`);

    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned empty content");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ── Gemini response parser ──────────────────────────────────────────────────

interface GeminiOutputItem {
  stockName?: string | null;
  symbol?: string | null;
  quantity?: number | null;
  avgBuyPrice?: number | null;
  currentPrice?: number | null;
  investedAmount?: number | null;
  currentValue?: number | null;
  note?: string;
  aiConfidence?: number;
  shouldReview?: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseGeminiResponse(text: string, originals: Holding[]): AiEnhancedHolding[] {
  let items: GeminiOutputItem[];
  try {
    items = JSON.parse(text) as GeminiOutputItem[];
  } catch {
    throw new Error("Gemini returned non-JSON payload");
  }

  if (!Array.isArray(items)) {
    throw new Error("Gemini returned non-array payload");
  }

  return items.map((item, i) => {
    const original = originals[i] ?? originals[originals.length - 1];
    const changedFields: string[] = [];
    const patch: Partial<Holding> = {};

    const checkField = (field: keyof Holding, geminiValue: unknown) => {
      if (geminiValue === null || geminiValue === undefined) return;
      const originalVal = original[field];
      const newVal = typeof originalVal === "number" ? Number(geminiValue) : String(geminiValue);
      if (String(newVal) !== String(originalVal)) {
        (patch as Record<string, unknown>)[field] = newVal;
        changedFields.push(field);
      }
    };

    checkField("stockName", item.stockName);
    checkField("symbol", item.symbol);
    checkField("quantity", item.quantity);
    checkField("avgBuyPrice", item.avgBuyPrice);
    checkField("currentPrice", item.currentPrice);
    checkField("investedAmount", item.investedAmount);
    checkField("currentValue", item.currentValue);

    const aiConfidence = item.aiConfidence !== undefined
      ? clamp(item.aiConfidence, 0, 1)
      : changedFields.length > 0 ? 0.85 : 1.0;

    return {
      original,
      cleaned: patch,
      aiConfidence,
      changedFields,
      note: item.note ?? (changedFields.length > 0 ? "AI applied corrections" : "No changes needed"),
    };
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Send parsed (but possibly noisy) holdings to Gemini for cleaning.
 *
 * @param holdings  Array of parsed Holding objects.
 * @param apiKey    Gemini API key from user settings.
 * @param model     Gemini model name (default: gemini-2.5-flash).
 * @returns         AiEnhanceResult with per-holding corrections + batch confidence.
 */
export async function enhanceHoldings(
  holdings: Holding[],
  apiKey: string,
  model = "gemini-2.5-flash",
): Promise<AiEnhanceResult> {
  if (holdings.length === 0) {
    return {
      enhanced: [],
      model,
      batchConfidence: 1,
    };
  }

  // Build the user prompt: a concise JSON payload of holdings to clean
  const payload = JSON.stringify(
    holdings.map((h) => ({
      stockName: h.stockName,
      symbol: h.symbol,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      investedAmount: h.investedAmount,
      currentValue: h.currentValue,
    })),
  );

  const raw = await callGemini(apiKey, model, payload);
  const enhanced = parseGeminiResponse(raw, holdings);

  const batchConfidence =
    enhanced.length > 0
      ? enhanced.reduce((sum, e) => sum + e.aiConfidence, 0) / enhanced.length
      : 1;

  // Apply corrections onto the originals
  const applied: AiEnhancedHolding[] = enhanced.map((e) => {
    if (e.changedFields.length === 0) return e;
    // Deep merge: apply patch onto original
    const cleaned = { ...e.original, ...e.cleaned };
    // Recompute financials if prices/qty changed
    if (e.changedFields.includes("quantity") || e.changedFields.includes("avgBuyPrice")) {
      cleaned.investedAmount = cleaned.quantity * cleaned.avgBuyPrice;
    }
    if (e.changedFields.includes("quantity") || e.changedFields.includes("currentPrice")) {
      cleaned.currentValue = cleaned.quantity * cleaned.currentPrice;
    }
    if (e.changedFields.includes("investedAmount") || e.changedFields.includes("currentValue")) {
      cleaned.pnl = cleaned.currentValue - cleaned.investedAmount;
      cleaned.pnlPercent = cleaned.investedAmount > 0 ? cleaned.pnl / cleaned.investedAmount : 0;
    }
    return {
      ...e,
      original: e.original,
      cleaned: e.cleaned,
      aiConfidence: e.aiConfidence,
    };
  });

  return { enhanced: applied, model, batchConfidence };
}

/**
 * Determine whether AI enhancement should be triggered for a set of holdings.
 */
export function shouldEnhance(
  holdings: Holding[],
  validationScore: number,
  allowEnhancement: boolean,
): boolean {
  if (!allowEnhancement) return false;
  if (holdings.length === 0) return false;
  // Enhance if any holding has low confidence OR validation found issues
  const lowConfidence = holdings.some((h) => h.confidence < 0.95);
  return lowConfidence || validationScore < 0.95;
}

/**
 * Apply AI-enhanced patches back onto the original Holding objects,
 * updating confidence and needsReview flags.
 */
export function applyAiEnhancements(
  originals: Holding[],
  enhanced: AiEnhancedHolding[],
): Holding[] {
  // Map originals by id
  const map = new Map(originals.map((h) => [h.id, h]));

  for (const e of enhanced) {
    const h = map.get(e.original.id);
    if (!h) continue;
    if (e.changedFields.length === 0) {
      // No changes → boost confidence slightly
      h.confidence = Math.min(1, h.confidence + 0.1);
      continue;
    }

    // Apply corrections
    Object.assign(h, e.cleaned);
    // Update confidence: blend original with AI confidence
    h.confidence = Math.min(1, (h.confidence + e.aiConfidence) / 2);
    // If AI flagged review, mark it
    h.needsReview = h.needsReview || (e.note !== "" && e.aiConfidence < 0.9);
  }

  return Array.from(map.values());
}
