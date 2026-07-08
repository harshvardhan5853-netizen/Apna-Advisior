import type { Holding, ParseResult } from "@/types/portfolio";
import {
  normalizeStockName,
  normalizeSymbol,
  parseNumberLoose,
  uid,
} from "../utils";

/**
 * PDF parsing:
 *   1. Primary: Python pdfplumber + PyMuPDF (+ scanned-page OCR) via /api/extract
 *   2. Fallback: pdfjs-dist in the browser
 *
 * @param password Optional — for password-protected PDFs.
 */
export async function parsePdf(file: File, password?: string): Promise<ParseResult> {
  if (typeof window === "undefined") {
    return {
      holdings: [],
      source: "generic",
      warnings: ["PDF parsing unavailable on server"],
    };
  }

  try {
    const { parseViaExtractApi } = await import("./extract-api");
    const apiResult = await parseViaExtractApi(file, "pdf");
    if (apiResult && apiResult.holdings.length > 0) {
      return apiResult;
    }
    if (apiResult && apiResult.warnings.length > 0) {
      // Service ran but found nothing — still try browser fallback below.
    }
  } catch (err) {
    console.warn("Server PDF extraction failed, falling back to pdfjs:", err);
  }

  return parsePdfBrowser(file, password);
}

async function parsePdfBrowser(file: File, password?: string): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  const version = (pdfjs as { version: string }).version;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf, password }).promise;

  const rowsText: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const yBuckets = new Map<number, { x: number; s: string }[]>();
      for (const item of content.items as {
        str: string;
        transform: number[];
      }[]) {
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];
        if (!yBuckets.has(y)) yBuckets.set(y, []);
        yBuckets.get(y)!.push({ x, s: item.str });
      }
      const ordered = [...yBuckets.entries()].sort((a, b) => b[0] - a[0]);
      for (const [, cells] of ordered) {
        cells.sort((a, b) => a.x - b.x);
        const line = cells
          .map((c) => c.s.trim())
          .filter(Boolean)
          .join("  ");
        if (line) rowsText.push(line);
      }
    }
  } finally {
    (doc as unknown as { destroy: () => void }).destroy();
  }

  const holdings = extractHoldingsFromLines(rowsText, "generic");
  return {
    holdings,
    source: "generic",
    warnings:
      holdings.length === 0
        ? [
            "Could not find holdings in PDF. Install Python extraction (requirements.txt) or upload a screenshot.",
          ]
        : ["Used browser PDF parser — verify rows. For better results run: py -m venv .venv && pip install -r requirements.txt"],
  };
}

/**
 * Row heuristic: a holding line usually has a stock name (letters) followed
 * by 4–8 numbers. We accept ≥ 3 numbers to survive broker variations.
 */
export function extractHoldingsFromLines(
  lines: string[],
  source: Holding["source"],
): Holding[] {
  const holdings: Holding[] = [];
  const numberRe = /-?\(?\d[\d,]*\.?\d*\)?%?/g;

  for (const raw of lines) {
    const line = raw.replace(/\u00a0/g, " ").trim();
    if (!line) continue;
    if (/^(stock|instrument|holdings|total|page|portfolio|summary)\b/i.test(line)) continue;

    const nums = line.match(numberRe) ?? [];
    if (nums.length < 3) continue;

    const firstNumIdx = line.search(numberRe);
    if (firstNumIdx <= 1) continue;
    const namePart = line.slice(0, firstNumIdx).trim();
    if (!/[A-Za-z]/.test(namePart)) continue;

    const parsedNums = nums.map(parseNumberLoose).filter((n) => Number.isFinite(n));
    const [qty, avg, cur, invested, curVal, pnl, pnlPct] = parsedNums;

    const quantity = qty ?? 0;
    const avgBuyPrice = avg ?? 0;
    const currentPrice = cur ?? 0;
    const investedAmount =
      invested && invested > 0 ? invested : quantity * avgBuyPrice;
    const currentValue =
      curVal && curVal > 0 ? curVal : quantity * currentPrice;
    const pnlVal =
      pnl != null && Number.isFinite(pnl) ? pnl : currentValue - investedAmount;
    const pnlPercent =
      pnlPct != null && Number.isFinite(pnlPct)
        ? Math.abs(pnlPct) > 5
          ? pnlPct / 100
          : pnlPct
        : investedAmount > 0
          ? pnlVal / investedAmount
          : 0;

    const confidence = parsedNums.length >= 5 ? 0.85 : 0.55;

    holdings.push({
      id: uid("h"),
      stockName: normalizeStockName(namePart),
      symbol: normalizeSymbol(namePart.split(/\s+/)[0]),
      exchange: "UNKNOWN",
      quantity,
      avgBuyPrice,
      currentPrice,
      investedAmount,
      currentValue,
      pnl: pnlVal,
      pnlPercent,
      confidence,
      needsReview: confidence < 0.8,
      source,
    });
  }
  return holdings;
}
