import type { FinancialTable, TableRow, TopRatio } from "screener-india";
import { parseNumberLoose } from "@/lib/utils";

/**
 * Screener.in returns everything as strings ("₹1,868 Cr.", "24.35", "8.2%",
 * "(1,234)" for negatives). These helpers normalize into number|null.
 *
 * Key parser insight: `FinancialTable.rows[i]` is a plain object keyed by
 * column header. The metric name lives under an empty key `""` OR the first
 * header. Example: `{ "": "Sales", "Mar 2020": "100", "Mar 2021": "150", ... }`.
 */

const DASH_RE = /^[\s\-\u2013\u2014.]*$/; // matches "-", "--", "—", ".", spaces

/**
 * Wrapper around parseNumberLoose that returns null for empty/dash strings.
 * parseNumberLoose already handles ₹, commas, parens negatives, percent.
 */
export function parseValue(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || DASH_RE.test(trimmed)) return null;
  const n = parseNumberLoose(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * If the raw source is a percent string ("8.2%"), returns fraction (0.082).
 * If it's already a numeric string ("8.2"), returns as-is.
 * Uses parseNumberLoose which already divides by 100 for % strings.
 */
export function parsePercent(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || DASH_RE.test(trimmed)) return null;
  const hasPercent = trimmed.includes("%");
  const n = parseNumberLoose(trimmed);
  if (!Number.isFinite(n)) return null;
  // parseNumberLoose already handles trailing % → divides by 100.
  // If caller passes a "raw" number without % but semantically meant to be a
  // percentage in Screener land (Screener sometimes strips the %), we still
  // return as-is; scoring code normalizes downstream.
  return hasPercent ? n : n;
}

/**
 * Case-insensitive substring match on TopRatio.name.
 * Returns the first matching ratio parsed as number, or null.
 * Pass multiple aliases in preference order.
 *
 * Example: getTopRatio(topRatios, "Stock P/E", "P/E") →
 *   finds { name: "Stock P/E", value: "24.35" } → 24.35
 */
export function getTopRatio(
  topRatios: TopRatio[] | undefined,
  ...names: string[]
): number | null {
  if (!topRatios || topRatios.length === 0) return null;
  for (const name of names) {
    const needle = name.toLowerCase();
    const hit = topRatios.find((r) =>
      r.name && r.name.toLowerCase().includes(needle),
    );
    if (hit) {
      const parsed = parseValue(hit.value);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

/**
 * Find a row in a FinancialTable by matching the metric name.
 * The metric name lives in row[""] OR row[headers[0]].
 * Case-insensitive substring match, tries each name in order.
 */
export function getRowByName(
  table: FinancialTable | undefined,
  ...names: string[]
): TableRow | null {
  if (!table || !table.rows || table.rows.length === 0) return null;
  const firstHeader = table.headers?.[0] ?? "";
  for (const name of names) {
    const needle = name.toLowerCase();
    const hit = table.rows.find((row) => {
      const label = String(row[""] ?? row[firstHeader] ?? "").toLowerCase();
      return label.includes(needle);
    });
    if (hit) return hit;
  }
  return null;
}

/**
 * Extract all per-period numeric values from a row, skipping the first header
 * column (which holds the metric name). Returns array parallel to
 * headers.slice(1).
 */
export function getRowValues(
  row: TableRow | null,
  headers: string[],
): Array<number | null> {
  if (!row || !headers || headers.length === 0) return [];
  // Skip the first header (metric-name column, often "")
  return headers.slice(1).map((h) => parseValue(row[h]));
}

/**
 * Latest (rightmost) non-null value in a row.
 */
export function getLatestValue(
  row: TableRow | null,
  headers: string[],
): number | null {
  const values = getRowValues(row, headers);
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) return values[i];
  }
  return null;
}

/**
 * Latest year-over-year growth: compare the last two non-null values.
 * Returns fraction: (last - prev) / |prev|.
 * Handles negative prev correctly (uses abs in denominator so sign of growth
 * follows delta direction).
 */
export function computeYoyGrowth(
  values: Array<number | null>,
): number | null {
  const clean: number[] = [];
  for (const v of values) if (v != null && Number.isFinite(v)) clean.push(v);
  if (clean.length < 2) return null;
  const last = clean[clean.length - 1];
  const prev = clean[clean.length - 2];
  if (prev === 0) return null;
  return (last - prev) / Math.abs(prev);
}

/**
 * Compound annual growth rate over N years.
 * (last/first)^(1/years) - 1.
 * Only valid when both endpoints positive.
 */
export function computeCagr(
  values: Array<number | null>,
  years: number,
): number | null {
  const clean: number[] = [];
  for (const v of values) if (v != null && Number.isFinite(v)) clean.push(v);
  if (clean.length < 2 || years <= 0) return null;
  const first = clean[0];
  const last = clean[clean.length - 1];
  if (first <= 0 || last <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}
