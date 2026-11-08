import { tx } from "../database/connection.ts";
import { discard } from "../services/file-lifecycle.ts";
import { published } from "../repositories/forms.ts";
export async function deleteUpload(slug: string, tokenParam: string, file: string) {
  const { f } = await published(slug);
  await tx((db) =>
    discard(db, "form=$1 AND token=$2 AND id=$3 AND response IS NULL", [
      f.id,
      tokenParam,
      file,
    ]));
  return ({ ok: true });
}
