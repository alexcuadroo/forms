import { listOwnedForms } from "../repositories/forms.ts";
import { ownerQuota } from "../repositories/owners.ts";
import type { User } from "../models/entities.ts";
export async function listForms(user: User) {
  const forms = await listOwnedForms(user.id);
  const owner = await ownerQuota(user.id);
  const used = forms.reduce((total, row) => total + row.fileBytes, 0);
  return ({ forms, storage: { quota: owner?.quota, used }, user: user });
}
