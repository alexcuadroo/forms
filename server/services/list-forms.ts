import { listOwnedForms } from "../repositories/forms.ts";
import { ownerQuota, ownerStorage } from "../repositories/owners.ts";
import type { User } from "../models/entities.ts";
import type { FormKind } from '../../shared/forms.ts';
export async function listForms(user: User, kind: FormKind) {
  const [forms, owner, storage] = await Promise.all([listOwnedForms(user.id, kind), ownerQuota(user.id), ownerStorage(user.id)]);
  return ({ forms, storage: { quota: owner?.quota, used: storage?.used ?? 0 }, user });
}
