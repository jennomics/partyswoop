import { rateLimits } from './schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { generateId } from './id';
import type { Database } from './db';

/**
 * D1-backed sliding window rate limiter.
 *
 * Stores rate limit records in the rate_limits table. Each call checks
 * how many unexpired records exist for the given key within the time window.
 * If under the limit, inserts a new record and returns allowed: true.
 * Otherwise returns allowed: false with a retryAfterMs value.
 *
 * Periodically cleans up expired records on each call to prevent table growth.
 */
export async function checkRateLimit(
  db: Database,
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  const now = Date.now();
  const expiresAt = new Date(now + windowMs).toISOString();
  const window = String(Math.floor(now / windowMs));

  // Clean up expired records (fire-and-forget style, one in ~10 calls)
  if (Math.random() < 0.1) {
    await db
      .delete(rateLimits)
      .where(gt(sql`datetime('now')`, rateLimits.expiresAt))
      .catch(() => {
        // Non-critical cleanup, ignore errors
      });
  }

  // Count unexpired records for this key
  const existing = await db
    .select({ count: sql<number>`count(*)`, oldest: sql<string>`min(${rateLimits.expiresAt})` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.key, key),
        gt(rateLimits.expiresAt, new Date(now).toISOString())
      )
    );

  const count = existing[0]?.count ?? 0;

  if (count >= maxRequests) {
    // Calculate retry-after from the oldest record's expiry
    const oldest = existing[0]?.oldest;
    const retryAfterMs = oldest
      ? Math.max(0, new Date(oldest).getTime() - now)
      : windowMs;
    return { allowed: false, retryAfterMs };
  }

  // Insert a new rate limit record
  await db.insert(rateLimits).values({
    id: generateId(),
    key,
    window,
    count: 1,
    expiresAt,
  });

  return { allowed: true };
}
