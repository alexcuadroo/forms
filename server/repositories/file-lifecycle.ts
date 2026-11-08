import { pool } from "../database/connection.ts";
import type { Database } from "../database/connection.ts";
import type { Draft } from "../../shared/forms.ts";
export async function discard(db: Database, where: string, args: unknown[]) {
  await db.query(
    "WITH removed AS (DELETE FROM files WHERE " + where + " RETURNING id) INSERT INTO trash SELECT id FROM removed ON CONFLICT DO NOTHING",
    args,
  );
}

export async function pendingTrash() {
  return (await pool.query<{ id: string }>("SELECT id FROM trash LIMIT 500")).rows;
}

export function clearTrash(id: string) {
  return pool.query("DELETE FROM trash WHERE id=$1", [id]);
}

export function keepMedia(db: Database, form: string, ids: string[]) {
  return db.query("UPDATE files SET expires=NULL WHERE form=$1 AND kind='media' AND id=ANY($2::uuid[]) RETURNING id", [form, ids]);
}

export async function versionHistory(db: Database, form: string) {
  return (await db.query<{ body: Draft }>("SELECT body FROM versions WHERE form=$1", [form])).rows;
}
