import { owned } from "../repositories/forms.ts";
import { ownedFile } from "../repositories/files.ts";
import { uuid } from "../../shared/forms.ts";
import { storeUpload } from "./store-upload.ts";

export async function uploadMedia(
  form: string,
  owner: string,
  body: Buffer,
  filename?: string,
) {
  const f = await owned(form, owner);
  return storeUpload(body, filename, {
    form: f.id,
    owner: f.owner,
    allowed: ["Imagen"],
  });
}

export async function getAdminFile(file: string, owner: string) {
  return uuid(file) ? ownedFile(file, owner) : undefined;
}
