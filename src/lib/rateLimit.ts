/**
 * Simple in-memory sliding window rate limiter.
 *
 * Like the SSE event bus, this is process-local and resets on restart.
 * For multi-instance deployments, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  timestamps: number[];
}

class RateLimiter {
  private entries: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request is allowed for the given key.
   * Returns { allowed: true } or { allowed: false, retryAfterMs }.
   */
  check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.entries.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { allowed: false, retryAfterMs };
    }

    entry.timestamps.push(now);
    return { allowed: true };
  }

  /** Periodic cleanup of stale entries to prevent memory growth */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const keysToDelete: string[] = [];
    this.entries.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.entries.delete(key);
    }
  }
}

// Guest request rate limiter: 10 requests per 60 seconds per IP
const globalForRateLimit = globalThis as unknown as {
  guestRequestLimiter: RateLimiter | undefined;
};

export const guestRequestLimiter =
  globalForRateLimit.guestRequestLimiter ?? new RateLimiter(60_000, 10);

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.guestRequestLimiter = guestRequestLimiter;
}

// Cleanup stale entries every 5 minutes
setInterval(() => guestRequestLimiter.cleanup(), 5 * 60_000).unref?.();
