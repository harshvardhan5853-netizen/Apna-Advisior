import type { MarketStatus } from "./types";

/**
 * NSE regular session: Monday-Friday 09:15-15:30 IST.
 * Pre-open: 09:00-09:15. Post-close: 15:30-16:00.
 * Everything else = "closed".
 */

const IST_OFFSET_MIN = 330; // UTC+5:30

/** Get "now" as {y, m, d, weekday, minutesSinceMidnight} in IST. */
function istParts(now: Date = new Date()) {
  // Shift the wall clock to IST by adding the offset in ms, then read UTC fields
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60 * 1000);
  const weekday = shifted.getUTCDay(); // 0=Sun ... 6=Sat
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { weekday, minutes };
}

const OPEN = 9 * 60 + 15;   // 09:15
const CLOSE = 15 * 60 + 30; // 15:30
const PRE_OPEN = 9 * 60;    // 09:00
const POST_CLOSE = 16 * 60; // 16:00

/** Returns 'open' | 'pre-open' | 'post-close' | 'closed'. */
export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const { weekday, minutes } = istParts(now);
  if (weekday === 0 || weekday === 6) return "closed"; // weekend
  if (minutes >= OPEN && minutes < CLOSE) return "open";
  if (minutes >= PRE_OPEN && minutes < OPEN) return "pre-open";
  if (minutes >= CLOSE && minutes < POST_CLOSE) return "post-close";
  return "closed";
}

/** Convenience: is the market in the live 9:15-15:30 window? */
export function isMarketOpen(now: Date = new Date()): boolean {
  return getMarketStatus(now) === "open";
}

/** Human label for the pill. */
export function marketStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "open": return "Market open";
    case "pre-open": return "Pre-open";
    case "post-close": return "Post-close";
    case "closed": return "Market closed";
  }
}

/** Normalize Yahoo marketState -> our enum. Falls back to time-based check. */
export function normalizeMarketState(yahooState: string | null | undefined, now: Date = new Date()): MarketStatus {
  const s = (yahooState ?? "").toUpperCase();
  if (s === "REGULAR") return "open";
  if (s === "PRE" || s === "PREPRE") return "pre-open";
  if (s === "POST" || s === "POSTPOST") return "post-close";
  if (s === "CLOSED") return "closed";
  return getMarketStatus(now);
}
