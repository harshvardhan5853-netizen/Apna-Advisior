// News feature settings kept in browser localStorage.
// The Gemini API key never leaves the user's machine except when it hits Google's
// endpoint through our /api/news proxy (which passes it through as an Authorization header).

const KEY = "apna-advisor.news-settings.v1";

export interface NewsSettings {
  geminiApiKey: string | null;
  /** Preferred model; default "gemini-2.5-flash" (v1beta supported, generous free tier). */
  model: string;
  /** Whether to auto-refresh news while the tab is open. */
  autoRefresh: boolean;
  /** Auto-refresh interval, minutes. */
  autoRefreshMinutes: number;
}

export const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  geminiApiKey: null,
  model: "gemini-2.5-flash",
  autoRefresh: true,
  autoRefreshMinutes: 20,
};

// Legacy model names that Gemini's v1beta endpoint no longer resolves. Any user
// who saved settings before this migration will silently get bumped to the new
// default so their news feed keeps working without opening the dialog.
const LEGACY_MODEL_PREFIXES = ["gemini-1.0", "gemini-1.5", "gemini-pro"];

function migrateModel(raw: string | undefined): string {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_NEWS_SETTINGS.model;
  const lower = value.toLowerCase();
  if (LEGACY_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return DEFAULT_NEWS_SETTINGS.model;
  }
  return value;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readNewsSettings(): NewsSettings {
  if (!isBrowser()) return { ...DEFAULT_NEWS_SETTINGS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_NEWS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NewsSettings>;
    return {
      ...DEFAULT_NEWS_SETTINGS,
      ...parsed,
      // Sanity-check a couple of fields.
      autoRefreshMinutes: clamp(parsed.autoRefreshMinutes ?? DEFAULT_NEWS_SETTINGS.autoRefreshMinutes, 5, 120),
      geminiApiKey: typeof parsed.geminiApiKey === "string" && parsed.geminiApiKey.trim().length >= 20
        ? parsed.geminiApiKey.trim()
        : null,
      model: migrateModel(parsed.model),
    };
  } catch {
    return { ...DEFAULT_NEWS_SETTINGS };
  }
}

export function writeNewsSettings(next: Partial<NewsSettings>): NewsSettings {
  const current = readNewsSettings();
  const merged: NewsSettings = { ...current, ...next };
  if (!isBrowser()) return merged;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* quota exceeded — ignore, in-memory copy still fine for the session */
  }
  return merged;
}

export function hasGeminiKey(): boolean {
  return readNewsSettings().geminiApiKey !== null;
}

/** Redact the key for display — "AIzaS...xY4z". */
export function maskGeminiKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 5)}${"•".repeat(6)}${key.slice(-4)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
