import type { Pool, PoolClient, QueryResultRow } from "pg";
import pg from "pg";
export type Database = Pool | PoolClient;
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function tx<T>(fn: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const out = await fn(db);
    await db.query("COMMIT");
    return out;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function first<T extends QueryResultRow = QueryResultRow>(
  db: Database,
  sql: string,
  args: unknown[] = [],
): Promise<T | undefined> {
  return (await db.query<T>(sql, args)).rows[0];
}
