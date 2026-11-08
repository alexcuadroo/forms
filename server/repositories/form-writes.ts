import { first, pool } from "../database/connection.ts";
import type { Database } from "../database/connection.ts";
import type { Draft } from "../../shared/forms.ts";
import type { FormRow } from "../models/entities.ts";
export function insertForm(id: string, owner: string, draft: Draft) {
  return first<FormRow>(pool, "INSERT INTO forms(id,owner,draft) VALUES($1,$2,$3) RETURNING *", [id, owner, draft]);
}

export async function removeForm(db: Database, form: FormRow) {
  if (form.closed) {
    await db.query("DELETE FROM responses WHERE form=$1", [form.id]);
    await db.query("DELETE FROM versions WHERE form=$1", [form.id]);
  }
  await db.query("DELETE FROM forms WHERE id=$1", [form.id]);
}

export function setClosed(id: string, closed: boolean) {
  return first<FormRow>(pool, "UPDATE forms SET closed=$2 WHERE id=$1 RETURNING *", [id, closed]);
}

export function insertVersion(db: Database, form: FormRow, draft: Draft) {
  return db.query("INSERT INTO versions VALUES($1,$2,$3)", [form.id, form.version, draft]);
}

export function updateDraft(db: Database, form: FormRow, draft: Draft) {
  return first<FormRow>(db, "UPDATE forms SET draft=$2,slug=$3,version=$4,revision=revision+1,updated=now() WHERE id=$1 RETURNING *", [form.id, draft, form.slug, form.version]);
}

export function slugExists(db: Database, slug: string) {
  return first(db, "SELECT id FROM forms WHERE slug=$1", [slug]);
}
