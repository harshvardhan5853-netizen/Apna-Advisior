import type { Holding, ParseResult } from "@/types/portfolio";
import { isCsvFile, isExcelFile, isImageFile, isPdfFile } from "../utils";
import { parseCsv } from "./csv";
import { parseExcel } from "./excel";
import { parsePdf } from "./pdf";
import { parseViaExtractApi } from "./extract-api";

export interface ParseFilesProgress {
  fileName: string;
  index: number;
  total: number;
  phase: "start" | "progress" | "done" | "error";
  pct?: number;
  message?: string;
}

/**
 * Parse a batch of user-uploaded files into a single flat list of holdings.
 * Errors from individual files bubble up as warnings — never fatal.
 *
 * @param passwords Optional map of file-index → document password for
 *   password-protected PDFs / Excel files.
 */
export async function parseFiles(
  files: File[],
  onProgress?: (p: ParseFilesProgress) => void,
  passwords?: Map<number, string>,
): Promise<ParseResult> {
  const allHoldings: Holding[] = [];
  const warnings: string[] = [];
  let dominantSource: ParseResult["source"] = "generic";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pw = passwords?.get(i);
    onProgress?.({ fileName: file.name, index: i, total: files.length, phase: "start" });
    try {
      let result: ParseResult;
      if (isCsvFile(file)) {
        result = await parseCsv(file);
      } else if (isExcelFile(file)) {
        result = await parseExcel(file, pw);
      } else if (isPdfFile(file)) {
        result = await parsePdf(file, pw);
      } else if (isImageFile(file)) {
        // Server-side extraction (Gemini Vision → PaddleOCR fallback)
        const serverResult = await parseViaExtractApi(file, "image", (pct) =>
          onProgress?.({
            fileName: file.name,
            index: i,
            total: files.length,
            phase: "progress",
            pct,
          }),
        );
        if (serverResult) {
          result = serverResult;
        } else {
          throw new Error("Extraction service unavailable. Check that Python is configured.");
        }
      } else {
        warnings.push(`Unsupported file type: ${file.name}`);
        onProgress?.({
          fileName: file.name,
          index: i,
          total: files.length,
          phase: "error",
          message: "Unsupported file type",
        });
        continue;
      }
      allHoldings.push(...result.holdings);
      warnings.push(...result.warnings);
      if (result.source !== "generic") dominantSource = result.source;
      onProgress?.({
        fileName: file.name,
        index: i,
        total: files.length,
        phase: "done",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      warnings.push(`Failed to parse ${file.name}: ${message}`);
      onProgress?.({
        fileName: file.name,
        index: i,
        total: files.length,
        phase: "error",
        message,
      });
    }
  }

  return { holdings: allHoldings, source: dominantSource, warnings };
}

export { parseCsv, parseExcel, parsePdf };
