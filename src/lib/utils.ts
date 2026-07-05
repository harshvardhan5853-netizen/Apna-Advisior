import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const INR_PRECISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const PCT = new Intl.NumberFormat("en-IN", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatINR(value: number, precise = false): string {
  if (!Number.isFinite(value)) return "—";
  return precise ? INR_PRECISE.format(value) : INR.format(value);
}

export function formatCompactINR(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return "₹" + COMPACT.format(value);
}

export function formatPct(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—";
  return PCT.format(fraction);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return NUM.format(value);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Very small, dependency-free id generator. */
export function uid(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Best-effort numeric parse for OCR / CSV cells that may include ₹, commas, -, brackets. */
export function parseNumberLoose(raw: unknown): number {
  if (raw == null) return NaN;
  if (typeof raw === "number") return raw;
  let s = String(raw).trim();
  if (!s) return NaN;
  // (1,234.56) => -1234.56
  const negParen = /^\((.+)\)$/.exec(s);
  if (negParen) s = "-" + negParen[1];
  s = s.replace(/[₹$,\s]/g, "");
  // handle percent
  const isPct = s.endsWith("%");
  if (isPct) s = s.slice(0, -1);
  const n = Number(s);
  if (Number.isNaN(n)) return NaN;
  return isPct ? n / 100 : n;
}

/** Coerce loose text into an NSE-style symbol (uppercase, alphanumeric). */
export function normalizeSymbol(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9&-]/g, "")
    .slice(0, 24);
}

export function normalizeStockName(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw).replace(/\s+/g, " ").trim().slice(0, 120);
}

/** True if a File looks like an image the browser can decode. */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);
}
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}
export function isCsvFile(file: File): boolean {
  return (
    file.type === "text/csv" ||
    file.type === "application/csv" ||
    /\.csv$/i.test(file.name)
  );
}
export function isExcelFile(file: File): boolean {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    /\.xlsx?$/i.test(file.name)
  );
}
