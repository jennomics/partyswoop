import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/schema';
import * as fs from 'fs';
import * as path from 'path';

export type TestDatabase = BetterSQLite3Database<typeof schema> & {
  batch: <T extends readonly unknown[]>(queries: T) => Promise<{ [K in keyof T]: Awaited<T[K]> }>;
};

/**
 * Creates an in-memory SQLite database with all migrations applied.
 * Adds a `batch` method to simulate D1's batch functionality for testing.
 */
export function createTestDb(): TestDatabase {
  const sqlite = new Database(':memory:');

  // Apply all migrations in order
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();

  for (const file of migrationFiles) {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      // Execute each statement separately (SQLite doesn't support multiple statements in one exec sometimes)
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        sqlite.exec(statement + ';');
      }
    }
  }

  const db = drizzle(sqlite, { schema }) as unknown as TestDatabase;

  // Add batch method to simulate D1's batch API.
  // D1's batch executes queries sequentially and returns their results.
  db.batch = async <T extends readonly unknown[]>(queries: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
    const results = [];
    for (const query of queries) {
      const result = await (query as Promise<unknown>);
      results.push(result);
    }
    return results as { [K in keyof T]: Awaited<T[K]> };
  };

  return db;
}
