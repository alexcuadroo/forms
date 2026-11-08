import type { User } from "../models/entities.ts";
import { owned } from "../repositories/forms.ts";
export async function getForm(id: string, user: User) { return (await owned(id, user.id)); }
