import { deleteResponse as removeResponse } from "../repositories/responses.ts";
import { tx } from "../database/connection.ts";
import type { User } from "../models/entities.ts";
import { discard } from "../services/file-lifecycle.ts";
import { owned } from "../repositories/forms.ts";
export async function deleteResponse(id: string, user: User, response: string) {
  await tx(async (db) => {
    const f = await owned(id, user.id, db, true);
    await discard(db, "form=$1 AND response=$2", [f.id, response]);
    await removeResponse(db, f.id, response);
  });
  return ({ ok: true });
}
