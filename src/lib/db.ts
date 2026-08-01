import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Get a Drizzle database instance backed by Cloudflare D1.
 * Uses getCloudflareContext() from @opennextjs/cloudflare to access
 * the D1 binding from the Workers runtime context.
 */
export function getDb(): Database {
  const { env } = getCloudflareContext();
  return drizzle(env.DB as D1Database, { schema });
}
