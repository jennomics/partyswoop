import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Get a Drizzle database instance backed by Cloudflare D1.
 * On Cloudflare Workers with @opennextjs/cloudflare, the D1 binding is
 * exposed via process.env.DB.
 */
export function getDb(d1?: D1Database): Database {
  const binding = d1 || (process.env as unknown as { DB: D1Database }).DB;
  return drizzle(binding, { schema });
}
