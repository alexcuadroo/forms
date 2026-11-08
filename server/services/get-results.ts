import { resultsFor } from "../repositories/responses.ts";
import type { User } from "../models/entities.ts";
import { owned } from "../repositories/forms.ts";
export async function getResults(id: string, user: User) {
  const f = await owned(id, user.id);
  return resultsFor(f.id);
}
