/**
 * Cloudflare D1 Database binding type.
 * We declare this locally rather than including @cloudflare/workers-types globally,
 * since the global workers types override standard Web API types (e.g., Response.json())
 * which breaks client components.
 */
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

/**
 * Extend the global CloudflareEnv interface (from @opennextjs/cloudflare)
 * with the app's D1 database binding.
 */
interface CloudflareEnv {
  DB: D1Database;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(options?: { columnNames?: boolean }): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    last_row_id: number | null;
    changes: number | null;
    served_by: string;
    internal_stats: null;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}
