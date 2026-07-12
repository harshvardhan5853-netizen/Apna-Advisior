/**
 * Gemini Vision — structured holdings extraction from broker screenshots.
 * Calls Gemini Pro Vision API with inline image data, returns structured JSON.
 * Server-only (called from /api/extract).
 */

import type { BrokerSource } from "@/types/portfolio";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

const SYSTEM_INSTRUCTION = `You are an expert financial document extraction engine.

The image contains an Indian stock broker portfolio screenshot. It may show:
- Holdings tables
- Card layouts (Groww-style cards with stock name, quantity, value)
- Combined summary-and-holdings views
- Dark mode or light mode
- Partial or cropped screenshots

Extract EVERY visible holding from the image. Pay close attention to table structure — preserve row/column relationships.

Rules:
1. Never invent holdings. Only extract what is clearly visible.
2. If a field is not visible, use null (never guess).
3. Indian number formats: handle lakhs (1,23,456.78), crores, ₹ symbols, commas. Convert to plain numbers.
4. Read table layouts AND card layouts equally well.
5. For card layouts: each card typically contains a stock name, quantity, average price, and invested value.
6. Detect broker if possible: groww | zerodha | angelone | upstox | dhan | other.
7. Output ONLY valid JSON matching the schema. No markdown, no explanations.
8. If no holdings clearly appear in the image, return {"holdings": []}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    broker: { type: "STRING" },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "NUMBER" },
    holdings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          symbol: { type: "STRING" },
          companyName: { type: "STRING" },
          quantity: { type: "NUMBER" },
          averagePrice: { type: "NUMBER" },
          investedAmount: { type: "NUMBER" },
          currentPrice: { type: "NUMBER" },
          currentValue: { type: "NUMBER" },
          pnl: { type: "NUMBER" },
        },
        required: ["symbol", "quantity"],
      },
    },
  },
  required: ["holdings"],
};

/* ─── Interfaces ─── */

export interface VisionExtractionResult {
  holdings: VisionHolding[];
  broker?: BrokerSource;
  /** Overall confidence 0–100 */
  confidence: number;
  warnings: string[];
  extractionMethod: "gemini-vision";
  rawResponse?: string;
}

export interface VisionHolding {
  symbol: string;
  companyName?: string;
  quantity: number;
  averagePrice?: number | null;
  investedAmount?: number | null;
  currentPrice?: number | null;
  currentValue?: number | null;
  pnl?: number | null;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

interface RawGeminiVisionPayload {
  broker?: string;
  warnings?: string[];
  confidence?: number;
  holdings?: VisionHolding[];
}

/* ─── Helpers ─── */

function normalizeBrokerSource(s: unknown): BrokerSource {
  const t = String(s ?? "").toLowerCase();
  if (t === "groww" || t === "zerodha" || t === "angelone" || t === "upstox" || t === "dhan" || t === "manual") {
    return t;
  }
  return "generic";
}

/* ─── Gemini Vision API Call ─── */

async function callGeminiVision(
  apiKey: string,
  model: string,
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: "Extract all stock holdings visible in this broker portfolio screenshot." },
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 8192,
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
      const msg = parsed.error?.message ?? response.statusText ?? "Gemini Vision request failed";
      if (response.status === 429) throw new Error("rate-limited");
      if (response.status === 400 && msg.includes("API_KEY")) throw new Error("invalid-api-key");
      throw new Error(msg);
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

/* ─── Main Export ─── */

export type VisionExtractorError =
  | "no-api-key"
  | "invalid-api-key"
  | "rate-limited"
  | "timeout"
  | "blocked"
  | "empty-response"
  | "parse-failed"
  | "unknown";

export interface VisionExtractorErrorResult {
  holdings: [];
  broker?: BrokerSource;
  confidence: 0;
  warnings: string[];
  extractionMethod: "gemini-vision";
  error: VisionExtractorError;
}

/**
 * Extract holdings from an image using Gemini Vision.
 *
 * Always returns a valid result object — never throws.
 * On failure, returns empty holdings with appropriate warnings.
 */
export async function extractHoldingsFromImage(
  imageBuffer: Uint8Array,
  mimeType: string,
  apiKey: string,
  model = DEFAULT_MODEL,
): Promise<VisionExtractionResult | VisionExtractorErrorResult> {
  /* Guard: no API key */
  if (!apiKey || apiKey.trim().length < 20) {
    return {
      holdings: [],
      confidence: 0,
      warnings: ["Gemini API key not configured. Using local extraction."],
      extractionMethod: "gemini-vision",
      error: "no-api-key",
    };
  }

  /* Convert to base64 */
  let base64Image: string;
  try {
    const binary = String.fromCodePoint(...new Uint8Array(imageBuffer));
    base64Image = btoa(binary);
  } catch {
    return {
      holdings: [],
      confidence: 0,
      warnings: ["Failed to encode image for Gemini Vision."],
      extractionMethod: "gemini-vision",
      error: "unknown",
    };
  }

  /* Call Gemini Vision API */
  let rawText: string;
  try {
    rawText = await callGeminiVision(apiKey.trim(), model, base64Image, mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const errorType: VisionExtractorError =
      message === "rate-limited" ? "rate-limited"
      : message === "invalid-api-key" ? "invalid-api-key"
      : message.includes("timed out") || message.includes("abort") ? "timeout"
      : message.includes("blocked") ? "blocked"
      : message.includes("empty") ? "empty-response"
      : "unknown";

    const warning =
      errorType === "invalid-api-key" ? "Invalid Gemini API key. Please update AI Extraction Settings."
      : errorType === "rate-limited" ? "Gemini rate limit reached. Please try again later."
      : errorType === "timeout" ? "Gemini request timed out. Using local extraction."
      : errorType === "blocked" ? "Gemini blocked the request. The image may contain inappropriate content."
      : `Gemini Vision failed: ${message}. Using local extraction.`;

    return {
      holdings: [],
      confidence: 0,
      warnings: [warning],
      extractionMethod: "gemini-vision",
      error: errorType,
    };
  }

  /* Parse JSON response */
  let payload: RawGeminiVisionPayload;
  try {
    payload = JSON.parse(rawText) as RawGeminiVisionPayload;
  } catch {
    return {
      holdings: [],
      confidence: 0,
      warnings: ["Gemini returned invalid JSON. Using local extraction."],
      extractionMethod: "gemini-vision",
      rawResponse: rawText.slice(0, 2000),
      error: "parse-failed",
    };
  }

  const rawHoldings = Array.isArray(payload.holdings) ? payload.holdings : [];
  const rawConfidence = typeof payload.confidence === "number" && Number.isFinite(payload.confidence) ? payload.confidence : 0;
  // Gemini returns 0-1 scale; normalize to 0-100
  const geminiConfidence = rawConfidence > 0 && rawConfidence < 1 ? rawConfidence * 100 : rawConfidence;
  const clampedConfidence = Math.max(0, Math.min(100, geminiConfidence));

  /* No holdings found */
  if (rawHoldings.length === 0) {
    return {
      holdings: [],
      broker: normalizeBrokerSource(payload.broker),
      confidence: clampedConfidence,
      warnings: [
        "Gemini Vision could not find any holdings in this image. Try a clearer screenshot.",
        ...(Array.isArray(payload.warnings) ? payload.warnings.filter((w): w is string => typeof w === "string") : []),
      ],
      extractionMethod: "gemini-vision",
      rawResponse: rawText.slice(0, 2000),
    };
  }

  /* Return raw Gemini data — mapping to Holding happens in server-extract.ts */
  const broker = normalizeBrokerSource(payload.broker);
  const warnings: string[] = [
    "Holdings extracted via Gemini Vision — verify each row before saving.",
    ...(Array.isArray(payload.warnings) ? payload.warnings.filter((w): w is string => typeof w === "string") : []),
  ];

  return {
    holdings: rawHoldings,
    broker,
    confidence: clampedConfidence,
    warnings,
    extractionMethod: "gemini-vision",
    rawResponse: rawText.slice(0, 2000),
  };
}
