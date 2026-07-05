import type { ParseResult } from "@/types/portfolio";
import { detectHeaderMap, rowToHolding } from "./column-map";

export async function parseExcel(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const warnings: string[] = [];

  // Try each sheet; pick the one that yields the most holdings.
  let best: ParseResult = { holdings: [], source: "generic", warnings: [] };

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    if (rows.length === 0) continue;

    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const map = detectHeaderMap(rows[i]);
      if (map.stockName >= 0 || map.symbol >= 0 || map.quantity >= 0) {
        headerIdx = i;
        break;
      }
    }
    const map = detectHeaderMap(rows[headerIdx]);
    const holdings = rows
      .slice(headerIdx + 1)
      .map((r) => rowToHolding(r, map, "generic"))
      .filter(Boolean) as NonNullable<ReturnType<typeof rowToHolding>>[];

    if (holdings.length > best.holdings.length) {
      best = { holdings, source: "generic", warnings };
    }
  }

  if (best.holdings.length === 0) {
    warnings.push("No recognizable holdings columns found in workbook");
  }
  best.warnings = warnings;
  return best;
}
