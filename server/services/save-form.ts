import { lockKey } from "../database/locks.ts";
import { insertVersion, updateDraft, slugExists } from "../repositories/form-writes.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import type { User } from "../models/entities.ts";
import type { Draft } from "../../shared/forms.ts";
import { checkDraft, publicationDraft } from "../../shared/forms.ts";
import { randomInt } from "node:crypto";
import { retainMedia } from "../services/file-lifecycle.ts";
import { owned } from "../repositories/forms.ts";
export async function saveForm(id: string, user: User, input: { revision: number; publish?: boolean; draft: Draft }) {
  const { revision, publish } = input;
  const error = checkDraft(input.draft, publish);
  if (error) fail(400, error);
  const draft: Draft = publish ? publicationDraft(input.draft) : input.draft;
  return (
    await tx(async (db) => {
      const f = await owned(id, user.id, db, true);
      if (f.revision !== revision)
        fail(409, "Otro editor guardó cambios. Volvé a abrir el formulario.");
      await retainMedia(db, f.id, draft);
      if (publish) {
        if (!f.slug) {
          const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
          for (;;) {
            const slug = Array.from(
              { length: 4 },
              () => alphabet[randomInt(36)],
            ).join("");
            await lockKey(db, slug);
            if (
              !(await slugExists(db, slug))
            ) {
              f.slug = slug;
              break;
            }
          }
        }
        f.version++;
        await insertVersion(db, f, draft);
      }
      return updateDraft(db, f, draft);
    }));
}
