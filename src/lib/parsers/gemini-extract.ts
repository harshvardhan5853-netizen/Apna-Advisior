/**
 * Gemini Flash — structured holdings extraction from raw OCR/PDF text.
 * Server-only (called from /api/extract when heuristic parsing finds no rows).
 */

import type { BrokerSource, Holding } from "@/types/portfolio";
import { normalizeStockName, normalizeSymbol, uid } from "@/lib/utils";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

const SYSTEM_INSTRUCTION = `You extract Indian stock portfolio holdings from messy OCR or PDF text (broker screenshots: Groww, Zerodha, Angel One, Upstox, Dhan).

Rules:
1. Return ONLY holdings that clearly appear in the text. Never invent stocks.
2. Each holding needs: stockName, quantity (>0), avgBuyPrice, investedAmount when possible.
3. Also extract currentPrice, currentValue, pnl, pnlPercent when visible.
4. Detect broker into source: groww|zerodha|angelone|upstox|dhan|generic.
5. Set confidence 0..1 based on how clear the row is. needsReview=true if any key field is uncertain.
6. Indian number formats: ₹, commas, lakhs. Fix obvious OCR errors (279390 → 2793.90 when qty×avg≈invested).
7. Output valid JSON matching the schema. Empty array if nothing reliable found.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    source: { type: "STRING" },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    holdings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          stockName: { type: "STRING" },
          symbol: { type: "STRING" },
          quantity: { type: "NUMBER" },
          avgBuyPrice: { type: "NUMBER" },
          currentPrice: { type: "NUMBER" },
          investedAmount: { type: "NUMBER" },
          currentValue: { type: "NUMBER" },
          pnl: { type: "NUMBER" },
          pnlPercent: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
          needsReview: { type: "BOOLEAN" },
        },
        required: ["stockName", "quantity"],
      },
    },
  },
  required: ["holdings"],
};

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

interface RawGeminiHolding {
  stockName?: string;
  symbol?: string;
  quantity?: number;
  avgBuyPrice?: number;
  currentPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  pnl?: number;
  pnlPercent?: number;
  confidence?: number;
  needsReview?: boolean;
}

interface RawGeminiPayload {
  source?: string;
  warnings?: string[];
  holdings?: RawGeminiHolding[];
}

function normalizeBrokerSource(s: unknown): BrokerSource {
  const t = String(s ?? "").toLowerCase();
  if (t === "groww" || t === "zerodha" || t === "angelone" || t === "upstox" || t === "dhan" || t === "manual") {
    return t;
  }
  return "generic";
}

function numberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function mapGeminiHoldings(raw: RawGeminiHolding[], source: BrokerSource): Holding[] {
  return raw.map((row) => {
    const stockName = normalizeStockName(String(row.stockName ?? ""));
    const symbolBase = row.symbol ? String(row.symbol) : stockName.split(/\s+/)[0] ?? "";
    const quantity = numberOrZero(row.quantity);
    const avgBuyPrice = numberOrZero(row.avgBuyPrice);
    const currentPrice = numberOrZero(row.currentPrice);
    const investedAmount =
      numberOrZero(row.investedAmount) > 0 ? numberOrZero(row.investedAmount) : quantity * avgBuyPrice;
    const currentValue =
      numberOrZero(row.currentValue) > 0 ? numberOrZero(row.currentValue) : quantity * currentPrice;
    const pnl = numberOrZero(row.pnl) || currentValue - investedAmount;
    const pnlPercent =
      numberOrZero(row.pnlPercent) ||
      (investedAmount > 0 ? pnl / investedAmount : 0);
    const confidence = clamp01(numberOrZero(row.confidence) || 0.75);
    return {
      id: uid("h"),
      stockName,
      symbol: normalizeSymbol(symbolBase),
      exchange: "UNKNOWN",
      quantity,
      avgBuyPrice,
      currentPrice,
      investedAmount,
      currentValue,
      pnl,
      pnlPercent: Math.abs(pnlPercent) > 3 ? pnlPercent / 100 : pnlPercent,
      confidence,
      needsReview: row.needsReview ?? confidence < 0.8,
      source,
    };
  });
}

async function callGemini(apiKey: string, model: string, rawText: string): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: `Extract holdings from this broker export text:\n\n${rawText.slice(0, 14000)}` }] }],
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
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
      throw new Error(parsed.error?.message ?? response.statusText ?? "Gemini request failed");
    }
    if (parsed.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked: ${parsed.promptFeedback.blockReason}`);
    }
    const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned empty content");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export interface GeminiExtractResult {
  holdings: Holding[];
  source: BrokerSource;
  warnings: string[];
}

export async function extractHoldingsWithGemini(
  rawText: string,
  apiKey: string,
  model = DEFAULT_MODEL,
): Promise<GeminiExtractResult> {
  const text = await callGemini(apiKey, model, rawText);
  let payload: RawGeminiPayload;
  try {
    payload = JSON.parse(text) as RawGeminiPayload;
  } catch {
    throw new Error("Gemini returned non-JSON holdings payload");
  }
  const source = normalizeBrokerSource(payload.source);
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((w): w is string => typeof w === "string")
    : [];
  const holdings = mapGeminiHoldings(Array.isArray(payload.holdings) ? payload.holdings : [], source);
  if (holdings.length === 0) {
    warnings.push("Gemini could not extract reliable holdings — add rows manually.");
  } else {
    warnings.push("Holdings extracted via Gemini AI — please verify each row before saving.");
  }
  return { holdings, source, warnings };
}
