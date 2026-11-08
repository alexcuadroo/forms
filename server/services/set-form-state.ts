import { setClosed } from "../repositories/form-writes.ts";
import { fail } from "../errors.ts";
import type { User } from "../models/entities.ts";
import { owned } from "../repositories/forms.ts";
export async function setFormState(id: string, user: User, input: { closed: boolean }) {
  const f = await owned(id, user.id);
  if (!f.version || typeof input.closed !== "boolean")
    fail(400, "Publicá el formulario primero.");
  return setClosed(f.id, input.closed);
}
