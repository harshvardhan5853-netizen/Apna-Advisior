/**
 * Browser client for /api/extract — Python OCR/PDF + optional Gemini fallback.
 */

import type { BrokerSource, Holding, ParseResult } from "@/types/portfolio";
import { normalizeStockName, normalizeSymbol, uid } from "@/lib/utils";
import { readNewsSettings } from "@/lib/news/settings";

type ExtractKind = "image" | "pdf" | "xlsx";

interface ApiHolding {
  id?: string;
  stockName?: string;
  symbol?: string;
  exchange?: string;
  quantity?: number;
  avgBuyPrice?: number;
  currentPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  pnl?: number;
  pnlPercent?: number;
  confidence?: number;
  needsReview?: boolean;
  source?: string;
}

interface ApiResponse {
  source?: string;
  layout?: string;
  engine?: string;
  warnings?: string[];
  holdings?: ApiHolding[];
  geminiUsed?: boolean;
  error?: string;
  detail?: string;
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
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function mapHoldings(raw: ApiHolding[], defaultSource: BrokerSource): Holding[] {
  return raw.map((row) => {
    const source = normalizeBrokerSource(row.source ?? defaultSource);
    const stockName = normalizeStockName(String(row.stockName ?? ""));
    const symbolBase = row.symbol ? String(row.symbol) : stockName.split(/\s+/)[0] ?? "";
    const ex = String(row.exchange ?? "UNKNOWN").toUpperCase();
    return {
      id: String(row.id ?? uid("h")),
      stockName,
      symbol: normalizeSymbol(symbolBase),
      exchange: ex === "NSE" || ex === "BSE" ? ex : "UNKNOWN",
      quantity: numberOrZero(row.quantity),
      avgBuyPrice: numberOrZero(row.avgBuyPrice),
      currentPrice: numberOrZero(row.currentPrice),
      investedAmount: numberOrZero(row.investedAmount),
      currentValue: numberOrZero(row.currentValue),
      pnl: numberOrZero(row.pnl),
      pnlPercent: numberOrZero(row.pnlPercent),
      confidence: clamp01(numberOrZero(row.confidence)),
      needsReview: Boolean(row.needsReview),
      source,
    };
  });
}

/**
 * Call the Python extraction service. Returns null when service unavailable (503)
 * so callers can fall back to browser-side parsers.
 */
export async function parseViaExtractApi(
  file: File,
  kind: ExtractKind,
  onProgress?: (pct: number) => void,
  password?: string,
): Promise<ParseResult | null> {
  if (typeof window === "undefined") return null;

  onProgress?.(0.05);
  const settings = readNewsSettings();
  const form = new FormData();
  form.append("file", file, file.name || (kind === "pdf" ? "upload.pdf" : "upload.png"));
  form.append("kind", kind);
  if (password) {
    form.append("password", password);
  }
  if (settings.geminiApiKey) {
    form.append("geminiApiKey", settings.geminiApiKey);
    form.append("geminiModel", settings.model);
  }

  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      res = await fetch("/api/extract", { method: "POST", body: form, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }

  if (res.status === 503) return null;

  onProgress?.(0.85);

  let payload: ApiResponse;
  try {
    payload = (await res.json()) as ApiResponse;
  } catch {
    return null;
  }

  if (!res.ok || payload.error) return null;
  if (!Array.isArray(payload.holdings)) return null;

  const source = normalizeBrokerSource(payload.source);
  const warnings: string[] = Array.isArray(payload.warnings)
    ? payload.warnings.filter((w): w is string => typeof w === "string")
    : [];

  if (payload.engine && payload.engine !== "gemini") {
    warnings.unshift(`Extracted via Python (${payload.engine}${payload.layout ? ` · ${payload.layout}` : ""}).`);
  }
  if (payload.geminiUsed) {
    warnings.unshift("AI-assisted extraction (Gemini) — verify each row before saving.");
  }

  const holdings = mapHoldings(payload.holdings, source);

  if (holdings.length === 0) {
    warnings.push("Extraction ran but found no holdings — try a clearer file or add rows manually.");
  }

  onProgress?.(1);
  return { holdings, source, warnings };
}
