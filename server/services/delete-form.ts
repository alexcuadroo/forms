import { removeForm } from "../repositories/form-writes.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import type { User } from "../models/entities.ts";
import { discard } from "../services/file-lifecycle.ts";
import { owned } from "../repositories/forms.ts";
export async function deleteForm(id: string, user: User, input: { closed?: boolean } | undefined) {
  await tx(async (db) => {
    const form = await owned(id, user.id, db, true);
    if (form.version !== 0 && !form.closed)
      fail(409, "Cerrá el formulario antes de eliminarlo.");
    if (form.closed && input?.closed !== true)
      fail(409, "El formulario cambió de estado. Confirmá el borrado desde Cerrados.");
    await discard(db, "form=$1", [form.id]);
    await removeForm(db, form);
  });
  return ({ ok: true });
}
