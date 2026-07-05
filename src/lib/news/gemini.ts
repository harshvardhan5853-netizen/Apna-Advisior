import type {
  NewsAnalysis,
  NewsCategory,
  NewsSentiment,
  NewsImpactHorizon,
  RawNewsArticle,
} from "@/types/news";
import {
  getCachedAnalysis,
  setCachedAnalysis,
  setCachedAnalysisError,
} from "./cache";
import { fingerprint } from "./dedupe";

// -----------------------------------------------------------------------------
// Google Gemini API wrapper (server-only)
//   Endpoint: v1beta generateContent with responseMimeType application/json
//   Single call returns: sentiment + confidence + category + affected symbols
//     + hinglishExplanation + whyItMatters + impactHorizon
// -----------------------------------------------------------------------------

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 15_000;

const SENTIMENT_VALUES: NewsSentiment[] = [
  "very-positive",
  "positive",
  "neutral",
  "negative",
  "very-negative",
];
const CATEGORY_VALUES: NewsCategory[] = [
  "earnings",
  "order-win",
  "management-change",
  "regulatory",
  "dividend",
  "buyback",
  "split",
  "bonus-issue",
  "merger-acquisition",
  "product-launch",
  "expansion",
  "guidance",
  "legal",
  "credit-rating",
  "analyst-action",
  "insider-activity",
  "macro-impact",
  "other",
];
const HORIZON_VALUES: NewsImpactHorizon[] = [
  "immediate",
  "short-term",
  "medium-term",
  "long-term",
  "uncertain",
];

const SYSTEM_INSTRUCTION = `You are a bilingual financial analyst helping Indian retail investors understand how a news headline affects a specific stock they own.

Rules:
1. Read the article title + snippet and the list of the user's portfolio stocks.
2. Decide which of the user's stocks (0..N) are truly affected. Never invent a stock not in the list.
3. Score sentiment on 5 tiers from the investor's perspective (very-positive .. very-negative). Neutral only when there is no clear directional impact.
4. Give a confidence 0-100 based on how directly the article speaks about the stock(s). Vague / speculative articles must score below 60.
5. Categorize with ONE label from the enum.
6. Rate impact horizon: immediate / short-term / medium-term / long-term / uncertain.
7. Write "hinglishExplanation" in Latin-script Hinglish, 1-2 sentences, casual retail-investor tone. Example: "TCS ko ek bada naya order mila hai. Isse company ki future income badh sakti hai, aur share price bhi upar ja sakta hai."
8. Write "whyItMatters" in ONE English sentence, investor-first (why should I care as a holder?).
9. Score "importance" 0-100 for materiality to a retail investor holding this stock. 80+ = breaking / must-read (earnings surprise, big order/merger, regulator action, credit downgrade). 50-79 = notable. 20-49 = minor. 0-19 = noise / not directly relevant.
10. Never mention "AI" or "language model" or that you are Gemini. Just answer.

Output MUST be valid JSON matching the provided schema. If truly no user stock is affected, return affectedSymbols: [] and sentiment: "neutral" with low confidence.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sentiment: { type: "STRING", enum: SENTIMENT_VALUES },
    confidence: { type: "INTEGER" },
    category: { type: "STRING", enum: CATEGORY_VALUES },
    affectedSymbols: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    hinglishExplanation: { type: "STRING" },
    whyItMatters: { type: "STRING" },
    impactHorizon: { type: "STRING", enum: HORIZON_VALUES },
    importance: { type: "INTEGER" },
  },
  required: [
    "sentiment",
    "confidence",
    "category",
    "affectedSymbols",
    "hinglishExplanation",
    "whyItMatters",
    "impactHorizon",
    "importance",
  ],
} as const;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: { message?: string; code?: number };
}

interface RawAnalysisJson {
  sentiment?: string;
  confidence?: number;
  category?: string;
  affectedSymbols?: unknown;
  hinglishExplanation?: string;
  whyItMatters?: string;
  impactHorizon?: string;
  importance?: number;
}

function clampConfidence(n: unknown): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return 0.5;
  const bounded = Math.min(100, Math.max(0, num));
  return bounded / 100;
}

function clampImportance(n: unknown): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return 40;
  return Math.round(Math.min(100, Math.max(0, num)));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  const lower = value.toLowerCase().replace(/_/g, "-");
  return (allowed.find((v) => v === lower) as T | undefined) ?? fallback;
}

function normalizeAnalysis(
  raw: RawAnalysisJson,
  model: string,
  portfolioSymbols: string[],
): NewsAnalysis {
  const allowed = new Set(portfolioSymbols.map((s) => s.toUpperCase()));
  const rawSyms = Array.isArray(raw.affectedSymbols) ? raw.affectedSymbols : [];
  const affected = Array.from(
    new Set(
      rawSyms
        .map((s) => (typeof s === "string" ? s.trim().toUpperCase() : ""))
        .filter((s) => s.length > 0 && allowed.has(s)),
    ),
  );

  return {
    sentiment: pickEnum(raw.sentiment, SENTIMENT_VALUES, "neutral"),
    confidence: clampConfidence(raw.confidence),
    category: pickEnum(raw.category, CATEGORY_VALUES, "other"),
    affectedSymbols: affected,
    hinglishExplanation: (raw.hinglishExplanation ?? "").trim(),
    whyItMatters: (raw.whyItMatters ?? "").trim(),
    impactHorizon: pickEnum(raw.impactHorizon, HORIZON_VALUES, "uncertain"),
    importance: clampImportance(raw.importance),
    model,
    analyzedAt: Date.now(),
  };
}

function buildUserPrompt(article: RawNewsArticle, portfolioSymbols: string[]): string {
  const symbolsBlock = portfolioSymbols.length
    ? portfolioSymbols.join(", ")
    : "(no portfolio provided)";
  const snippet = article.snippet ? article.snippet.slice(0, 800) : "(no snippet available)";
  return [
    `User's portfolio stock symbols: ${symbolsBlock}`,
    `Publisher: ${article.publisher ?? "unknown"}`,
    `Published: ${new Date(article.publishedAt).toISOString()}`,
    `Title: ${article.title}`,
    `Snippet: ${snippet}`,
  ].join("\n");
}

async function callGemini(
  apiKey: string,
  model: string,
  userPrompt: string,
): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      // Gemini 2.5 models consume tokens for internal "thinking" from the same
      // budget as the visible response. thinkingBudget: 0 disables reasoning for
      // this structured extraction task so the whole budget stays with the JSON.
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 1024,
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
      const msg = parsed.error?.message ?? response.statusText ?? "unknown";
      throw new Error(`gemini responded ${response.status}: ${msg}`);
    }

    const blockReason = parsed.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`gemini blocked: ${blockReason}`);

    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("gemini returned empty content");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export interface AnalyzeOptions {
  apiKey: string;
  model?: string;
  portfolioSymbols: string[];
  bypassCache?: boolean;
}

export async function analyzeArticle(
  article: RawNewsArticle,
  options: AnalyzeOptions,
): Promise<NewsAnalysis> {
  const model = options.model ?? DEFAULT_MODEL;
  const cacheKey = fingerprint(`${article.canonicalUrl}::${model}`);

  if (!options.bypassCache) {
    const cached = getCachedAnalysis(cacheKey);
    if (cached?.analysis) return cached.analysis;
    if (cached?.error && !options.bypassCache) {
      throw new Error(cached.error);
    }
  }

  const prompt = buildUserPrompt(article, options.portfolioSymbols);

  try {
    const text = await callGemini(options.apiKey, model, prompt);
    let raw: RawAnalysisJson;
    try {
      raw = JSON.parse(text) as RawAnalysisJson;
    } catch {
      throw new Error("gemini returned non-JSON payload");
    }
    const analysis = normalizeAnalysis(raw, model, options.portfolioSymbols);
    setCachedAnalysis(cacheKey, analysis);
    return analysis;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setCachedAnalysisError(cacheKey, message);
    throw err;
  }
}

export interface AnalyzeBatchResult {
  analyzed: number;
  failed: number;
  errors: string[];
}

/**
 * Analyze many articles in parallel with a concurrency cap so we don't blow
 * past Gemini's 15 req/min free-tier limit.  In-flight results are written
 * straight onto the article objects.
 */
export async function analyzeBatch(
  articles: Array<{ article: RawNewsArticle; assign: (analysis: NewsAnalysis | null, error?: string) => void }>,
  options: AnalyzeOptions & { concurrency?: number },
): Promise<AnalyzeBatchResult> {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 6));
  let index = 0;
  let analyzed = 0;
  let failed = 0;
  const errors: string[] = [];

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < articles.length) {
      const current = index++;
      const entry = articles[current];
      try {
        const analysis = await analyzeArticle(entry.article, options);
        entry.assign(analysis);
        analyzed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        entry.assign(null, message);
        failed++;
        if (errors.length < 5) errors.push(message);
      }
    }
  });

  await Promise.all(workers);
  return { analyzed, failed, errors };
}

/**
 * Ping the Gemini API with a tiny request to validate a user-provided key.
 * Returns true when the key is accepted, throws with a human-friendly message otherwise.
 */
export async function pingGemini(apiKey: string, model = DEFAULT_MODEL): Promise<boolean> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: 'Respond with the JSON {"ok":true} and nothing else.' }],
      },
    ],
    generationConfig: {
      temperature: 0,
      // Same reasoning as analyzeArticle: disable thinking so the ping's tiny
      // maxOutputTokens budget isn't eaten by chain-of-thought overhead.
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 32,
      responseMimeType: "application/json",
    },
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
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
      const msg = parsed.error?.message ?? response.statusText;
      throw new Error(`Gemini rejected the key (${response.status}): ${msg}`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}
