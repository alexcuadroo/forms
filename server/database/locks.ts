import type { Database } from "./connection.ts";
export function lockKey(db: Database, key: string) {
  return db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
}
