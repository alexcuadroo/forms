import { discard, pendingTrash, clearTrash, keepMedia, versionHistory } from "../repositories/file-lifecycle.ts";
import type { Database } from "../database/connection.ts";
import type { Draft } from "../../shared/forms.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import { mediaIds } from "../../shared/forms.ts";
import { rm } from "node:fs/promises";
import { directory } from "../storage/files.ts";
import path from "node:path";
export { discard } from "../repositories/file-lifecycle.ts";
export async function cleanup() {
  await tx((db) => discard(db, "expires < now()", []));
  for (const { id } of await pendingTrash()) {
    await rm(path.join(directory, id), { force: true });
    await clearTrash(id);
  }
}
export async function retainMedia(db: Database, form: string, draft: Draft) {
  const ids = mediaIds(draft);
  const kept = await keepMedia(db, form, ids);
  if (kept.rowCount !== ids.length)
    fail(400, "Hay un recurso multimedia vencido o inválido.");
  const history = (await versionHistory(db, form)).flatMap((v) => mediaIds(v.body));
  await discard(
    db,
    "form=$1 AND kind='media' AND expires IS NULL AND NOT(id=ANY($2::uuid[]))",
    [form, [...ids, ...history]],
  );
}
