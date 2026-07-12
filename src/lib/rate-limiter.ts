/**
 * Simple in-memory token-bucket rate limiter.
 *
 * NOTE: In-memory is fine for single-instance deployments (Vercel, a single
 * server). If the app is ever scaled to multiple instances, swap this with a
 * Redis-based solution (e.g. upstash/ratelimit).
 */

export interface BucketConfig {
  /** Max requests in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

// Cleanup stale entries every 5 minutes to avoid memory leaks.
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

/**
 * Check if a request should be rate-limited.
 *
 * @returns `{ allowed: true }` or `{ allowed: false, retryAfter: number }`
 *          where `retryAfter` is the number of milliseconds to wait.
 */
export function checkRateLimit(
  key: string,
  config: BucketConfig,
): { allowed: true } | { allowed: false; retryAfter: number } {
  cleanup();

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  existing.count++;
  if (existing.count > config.limit) {
    return { allowed: false, retryAfter: existing.resetAt - now };
  }

  return { allowed: true };
}

/** Create a per-IP rate-limit key from a request (forwarded-for aware). */
export function ipKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `ip:${ip}`;
}
