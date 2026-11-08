import { insertForm } from "../repositories/form-writes.ts";
import type { User } from "../models/entities.ts";
import { blank } from "../../shared/forms.ts";
import { randomUUID } from "node:crypto";
export async function createForm(user: User) {
 return insertForm(randomUUID(), user.id, blank());
}
