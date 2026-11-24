import { pool, first } from "../database/connection.ts";
import { fail } from "../errors.ts";
import type { Database } from "../database/connection.ts";
import type { FormRow } from "../models/entities.ts";
import type { Draft, FormKind } from "../../shared/forms.ts";
import { uuid } from "../../shared/forms.ts";
export const owned = async (id: string, owner: string, db: Database = pool, lock = false) => {
  if (!uuid(id)) fail(404, "Formulario no encontrado.");
  const f = await first<FormRow>(
    db,
    "SELECT * FROM forms WHERE id=$1 AND owner=$2 AND NOT EXISTS (SELECT 1 FROM worksheet_imports WHERE form_id=forms.id AND NOT complete)" +
      (lock ? " FOR UPDATE" : ""),
    [id, owner],
  );
  if (!f) fail(404, "Formulario no encontrado.");
  return f;
};
export const published = async (slug: string, db: Database = pool, version: number | string | null = null, lock = false) => {
  const f = await first<FormRow>(
    db,
    "SELECT * FROM forms WHERE slug=$1" + (lock ? " FOR SHARE" : ""),
    [slug],
  );
  if (!f) fail(404, "No encontramos este formulario.");
  if (f.closed) fail(410, "Este formulario ya no recibe respuestas.");
  const v = await first<{ version: number; body: Draft }>(
    db,
    "SELECT * FROM versions WHERE form=$1 AND version=$2",
    [f.id, version || f.version],
  );
  if (!v) fail(404, "Versión no disponible.");
  return { f, v };
};

export async function listOwnedForms(owner: string, kind: FormKind) {
  return (
    await pool.query<{ fileBytes: number }>(
      `SELECT f.id, f.slug, f.closed, f.version, f.updated, f.kind, f.draft->>'title' AS title,
              jsonb_array_length(f.draft->'questions') AS questions,
              (SELECT count(*) FROM responses r WHERE r.form=f.id)::int AS responses,
              (SELECT COALESCE(sum(bytes), 0) FROM files WHERE form=f.id)::float8 AS "fileBytes"
       FROM forms f WHERE owner=$1 AND f.kind=$2
       AND NOT EXISTS (SELECT 1 FROM worksheet_imports WHERE form_id=f.id AND NOT complete)
       ORDER BY updated DESC`,
      [owner, kind],
    )
  ).rows;
}
