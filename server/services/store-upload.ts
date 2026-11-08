import { storageAccount, insertUpload } from "../repositories/uploads.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { directory, limit, types } from "../storage/files.ts";
import { discard } from "../services/file-lifecycle.ts";
import path from "node:path";
export type UploadTarget = {
  form: string;
  owner: string;
  allowed: string[];
  question?: string | null;
  version?: number | null;
  token?: string | null;
};

export async function storeUpload(
  buffer: Buffer,
  encodedName: string | undefined,
  { form, owner, allowed, question = null, version = null, token = null }: UploadTarget,
) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > limit)
    fail(400, "El archivo debe tener entre 1 byte y 10 MB.");
  let name;
  try {
    name = decodeURIComponent(encodedName || "archivo")
      .split(/[\\/]/)
      .pop()!
      .replace(/[\x00-\x1f]/g, "")
      .slice(0, 200);
  } catch {
    fail(400, "Nombre inválido.");
  }
  let mime = (await fileTypeFromBuffer(buffer).catch(() => null))?.mime;
  if (!mime && /\.txt$/i.test(name) && !buffer.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      mime = "text/plain";
    } catch {}
  }
  if (!allowed.some((c) => mime && types[c]?.includes(mime)))
    fail(415, "Este tipo de archivo no está permitido.");
  const id = randomUUID();
  await tx(async (db) => {
    const { account, usage } = await storageAccount(db, owner);
    if (!account || !usage) fail(404, "Cuenta no encontrada.");
    if (Number(usage.used) + buffer.length > Number(account.quota))
      fail(409, "El creador alcanzó su cuota de almacenamiento.");
    await insertUpload(db, { id, form, bytes: buffer.length, name: name || "archivo", mime: mime!, question, version, token });
  });
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, id), buffer, { flag: "wx" });
  } catch (e) {
    await tx((db) => discard(db, "id=$1", [id]));
    throw e;
  }
  return { id, name };
}
