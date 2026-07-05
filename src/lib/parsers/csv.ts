import Papa from "papaparse";
import type { ParseResult } from "@/types/portfolio";
import { detectHeaderMap, rowToHolding } from "./column-map";

export async function parseCsv(file: File): Promise<ParseResult> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });
  const rows = parsed.data as unknown[][];
  const warnings: string[] = parsed.errors.map((e) => `CSV: ${e.message}`);

  if (rows.length === 0) {
    return { holdings: [], source: "generic", warnings: ["Empty CSV file"] };
  }

  // Some broker CSVs prefix with "Holdings — as of..." metadata rows. Find the
  // first row that looks like a header (contains a known synonym).
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const map = detectHeaderMap(rows[i]);
    if (map.stockName >= 0 || map.symbol >= 0 || map.quantity >= 0) {
      headerIdx = i;
      break;
    }
  }
  const header = rows[headerIdx];
  const map = detectHeaderMap(header);
  const holdings = rows
    .slice(headerIdx + 1)
    .map((r) => rowToHolding(r, map, "generic"))
    .filter(Boolean) as ReturnType<typeof rowToHolding>[];

  return {
    holdings: holdings as NonNullable<(typeof holdings)[number]>[],
    source: "generic",
    warnings,
  };
}
