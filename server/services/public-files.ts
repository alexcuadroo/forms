import { published } from "../repositories/forms.ts";
import { formFile } from "../repositories/files.ts";
import { pool } from "../database/connection.ts";
import { fail } from "../errors.ts";
import { mediaIds, uuid } from "../../shared/forms.ts";
import { storeUpload } from "./store-upload.ts";

export async function getPublicMedia(
  slug: string,
  version: string,
  file: string,
) {
  const { f, v } = await published(slug, pool, version);
  if (!mediaIds(v.body).includes(file)) fail(404, "Imagen no disponible.");
  return formFile(f.id, file);
}

export async function uploadAnswer(
  slug: string,
  version: string,
  question: string,
  token: string,
  body: Buffer,
  filename?: string,
) {
  const { f, v } = await published(slug, pool, version);
  const q = v.body.questions.find(
    (q) => q.id === question && q.type === "file",
  );
  if (!q || !uuid(token)) fail(400, "Carga inválida.");
  return storeUpload(body, filename, {
    form: f.id,
    owner: f.owner,
    allowed: q.categories,
    question: q.id,
    version: v.version,
    token,
  });
}
