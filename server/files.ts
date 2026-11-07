import type { Request, Response } from "express";
import type { Database } from "./db.ts";
import type { Draft } from "../shared/forms.ts";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { pool, first, tx, fail } from "./db.ts";
import { mediaIds, uuid } from "../shared/forms.ts";
export const directory = path.resolve(process.env.UPLOAD_DIR || "uploads");
export const limit = 10_000_000;
const types: Record<string, string[]> = {
  Imagen: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
  Video: ["video/mp4", "video/webm", "video/quicktime"],
  PDF: ["application/pdf"],
  Documento: [
    "text/plain",
    ...[
      "wordprocessingml.document",
      "spreadsheetml.sheet",
      "presentationml.presentation",
    ].map((t) => "application/vnd.openxmlformats-officedocument." + t),
    ...["text", "spreadsheet", "presentation"].map(
      (t) => "application/vnd.oasis.opendocument." + t,
    ),
  ],
};
export async function discard(db: Database, where: string, args: unknown[]) {
  await db.query(
    "WITH removed AS (DELETE FROM files WHERE " +
      where +
      " RETURNING id) INSERT INTO trash SELECT id FROM removed ON CONFLICT DO NOTHING",
    args,
  );
}
export async function cleanup() {
  await tx((db) => discard(db, "expires < now()", []));
  for (const { id } of (await pool.query("SELECT id FROM trash LIMIT 500"))
    .rows) {
    await rm(path.join(directory, id), { force: true });
    await pool.query("DELETE FROM trash WHERE id=$1", [id]);
  }
}
export async function retainMedia(db: Database, form: string, draft: Draft) {
  const ids = mediaIds(draft);
  const kept = await db.query(
    "UPDATE files SET expires=NULL WHERE form=$1 AND kind='media' AND id=ANY($2::uuid[]) RETURNING id",
    [form, ids],
  );
  if (kept.rowCount !== ids.length)
    fail(400, "Hay un recurso multimedia vencido o inválido.");
  const history = (
    await db.query<{ body: Draft }>("SELECT body FROM versions WHERE form=$1", [form])
  ).rows.flatMap((v) => mediaIds(v.body));
  await discard(
    db,
    "form=$1 AND kind='media' AND expires IS NULL AND NOT(id=ANY($2::uuid[]))",
    [form, [...ids, ...history]],
  );
}
type UploadTarget = {
  form: string;
  owner: string;
  allowed: string[];
  question?: string | null;
  version?: number | null;
  token?: string | null;
};

export async function upload(
  req: Request,
  res: Response,
  { form, owner, allowed, question = null, version = null, token = null }: UploadTarget,
) {
  if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > limit)
    fail(400, "El archivo debe tener entre 1 byte y 10 MB.");
  let name;
  try {
    name = decodeURIComponent(req.get("X-File-Name") || "archivo")
      .split(/[\\/]/)
      .pop()!
      .replace(/[\x00-\x1f]/g, "")
      .slice(0, 200);
  } catch {
    fail(400, "Nombre inválido.");
  }
  let mime = (await fileTypeFromBuffer(req.body).catch(() => null))?.mime;
  if (!mime && /\.txt$/i.test(name) && !req.body.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(req.body);
      mime = "text/plain";
    } catch {}
  }
  if (!allowed.some((c) => mime && types[c]?.includes(mime)))
    fail(415, "Este tipo de archivo no está permitido.");
  const id = randomUUID();
  await tx(async (db) => {
    const account = await first<{ quota: string }>(
      db,
      "SELECT quota FROM owners WHERE id=$1 FOR UPDATE",
      [owner],
    );
    const usage = await first<{ used: string }>(
      db,
      "SELECT COALESCE(sum(bytes),0) used FROM files JOIN forms ON forms.id=files.form WHERE forms.owner=$1",
      [owner],
    );
    if (!account || !usage) fail(404, "Cuenta no encontrada.");
    if (Number(usage.used) + req.body.length > Number(account.quota))
      fail(409, "El creador alcanzó su cuota de almacenamiento.");
    await db.query(
      "INSERT INTO files(id,form,bytes,name,mime,kind,question,version,token,expires) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '24 hours')",
      [
        id,
        form,
        req.body.length,
        name || "archivo",
        mime,
        token ? "answer" : "media",
        question,
        version,
        token,
      ],
    );
  });
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, id), req.body, { flag: "wx" });
  } catch (e) {
    await tx((db) => discard(db, "id=$1", [id]));
    throw e;
  }
  res.status(201).json({ id, name });
}
export function sendFile(res: Response, file: { id: string; mime: string; name: string } | undefined, inline = false) {
  if (!file || !uuid(file.id)) fail(404, "Archivo no disponible.");
  res.type(file.mime).set("X-Content-Type-Options", "nosniff");
  if (!inline) res.attachment(file.name);
  res.sendFile(path.join(directory, file.id));
}
