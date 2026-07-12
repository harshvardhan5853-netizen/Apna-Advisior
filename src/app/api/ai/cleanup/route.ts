import { NextRequest, NextResponse } from "next/server";
import type { Holding } from "@/types/portfolio";

/**
 * POST /api/ai/cleanup
 *
 * Calls Gemini to CLEAN / REPAIR parsed holdings data (Phase 7: AI Enhancement).
 * Gemini is NOT used for OCR — only to fix OCR noise and validate symbols.
 *
 * Body:
 *   holdings:  Parsed Holding[] (from CSV/Excel/PDF/OCR pipeline)
 *   apiKey:    User's Gemini API key
 *   model?:    Gemini model name (default: gemini-2.5-flash)
 *
 * Returns:
 *   { enhanced: AiEnhancedHolding[], model, batchConfidence }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { holdings, apiKey, model } = body as {
      holdings: unknown[];
      apiKey: string;
      model?: string;
    };

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "Gemini API key is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: "Holdings array is required and must not be empty" },
        { status: 400 },
      );
    }

    const { enhanceHoldings } = await import("@/lib/ai-enhancer");
    const result = await enhanceHoldings(
      holdings as Holding[],
      apiKey,
      model ?? "gemini-2.5-flash",
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai/cleanup] error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
