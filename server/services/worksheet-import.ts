import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { blank, checkDraft, question, uuid } from '../../shared/forms.ts';
import type { Draft } from '../../shared/forms.ts';
import { canonicalJson } from '../../shared/worksheet-contract.ts';
import type { WorksheetBlock } from '../../shared/worksheet-contract.ts';
import { boundedText, isRecord } from '../../shared/worksheet-exercises.ts';
import { tx, first } from '../database/connection.ts';
import type { Database } from '../database/connection.ts';
import { lockKey } from '../database/locks.ts';
import { allowedRoles } from '../config.ts';
import { fail } from '../errors.ts';
import { syncOwner } from '../repositories/owners.ts';
import { insertForm } from '../repositories/form-writes.ts';
import { insertUpload, storageAccount } from '../repositories/uploads.ts';
import { discard, keepMedia } from '../repositories/file-lifecycle.ts';
import { directory, types, limit } from '../storage/files.ts';

const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
type Media = Record<string, { id: string; bytes: number }>;
type ImportRow = { id: string; owner: string; form_id: string | null; complete: boolean; media: Media };

function buildDraft(worksheet: Record<string, unknown>) {
  const { title, description, activities } = worksheet;
  if (!boundedText(title, 200) || !title.trim() || (description !== undefined && !boundedText(description, 2000)) || !Array.isArray(activities) || activities.length < 1 || activities.length > 200) fail(422, 'El documento de la ficha es inválido.');
  const draft: Draft = { ...blank(), title, worksheetVersion: 1 };
  const media: Media = {};
  const seen = new Set<string>();
  if (description) draft.questions.push({ ...question(), type: 'info', title: 'Presentación', description });

  for (const activity of activities) {
    if (!isRecord(activity) || !uuid(activity.sourceActivityId) || seen.has(activity.sourceActivityId) || !Array.isArray(activity.blocks) || !activity.blocks.length || draft.questions.length + activity.blocks.length > 200) fail(422, 'La ficha contiene una actividad inválida o supera los 200 pasos.');
    seen.add(activity.sourceActivityId);
    const prior: string[] = [];
    for (const entry of activity.blocks) {
      if (!isRecord(entry) || !['info', 'long', 'short', 'single', 'bool', 'select', 'exercise', 'file'].includes(String(entry.type))) fail(422, 'La ficha contiene una actividad inválida.');
      const item = entry as WorksheetBlock;
      const q = { ...question(), type: item.type, title: item.title, description: item.description ?? '', options: item.options ?? [], required: item.type === 'file', exercise: item.exercise, grading: item.grading };
      if (item.condition !== undefined) {
        const { block, value } = item.condition ?? {};
        if (!Number.isInteger(block) || !prior[block] || !boundedText(value, 250)) fail(422, 'La ficha contiene una condición inválida.');
        q.rules = [{ source: prior[block]!, op: 'es', value }];
      }
      if (item.media !== undefined) {
        if (!isRecord(item.media) || !hash(item.media.digest) || !Number.isInteger(item.media.bytes) || item.media.bytes < 1 || item.media.bytes > limit) fail(422, 'La ficha contiene una referencia de imagen inválida.');
        const previous = media[item.media.digest];
        if (previous && previous.bytes !== item.media.bytes) fail(422, 'La imagen se repite con distinto tamaño.');
        media[item.media.digest] ??= { id: randomUUID(), bytes: item.media.bytes };
        q.media = media[item.media.digest]!.id;
      }
      if (item.type === 'file') q.categories = ['Imagen'];
      prior.push(q.id);
      draft.questions.push(q);
    }
  }
  if (Object.keys(media).length > 12) fail(422, 'Una ficha puede contener hasta 12 imágenes.');
  const issue = checkDraft(draft, true, 'worksheet');
  if (issue) fail(422, issue);
  return { draft, media };
}

export async function importWorksheet(body: unknown) {
  if (!isRecord(body) || body.schemaVersion !== 1 || !isRecord(body.source) || !isRecord(body.actor) || !isRecord(body.worksheet)) fail(422, 'Contrato de importación inválido.');
  const { source, actor, worksheet, copyId } = body;
  if (source.app !== 'decabeza' || !uuid(source.worksheetId) || !hash(source.snapshotHash) || (copyId !== undefined && !uuid(copyId))) fail(422, 'Origen de la ficha inválido.');
  if (!boundedText(actor.id, 200) || !actor.id.trim() || !boundedText(actor.role, 100) || !boundedText(actor.plan, 100)) fail(422, 'La cuenta del docente es inválida.');
  if (!allowedRoles.includes(actor.role)) fail(403, 'Tu rol no puede importar fichas.');
  const snapshot = digest(canonicalJson({ schemaVersion: 1, worksheet }));
  if (snapshot !== source.snapshotHash) fail(422, 'El contenido de la ficha cambió.');
  const { draft, media } = buildDraft(worksheet);
  const owner = { id: actor.id, plan: actor.plan };
  const identity = [source.app, owner.id, source.worksheetId, snapshot, copyId ?? 'default'];

  return tx(async db => {
    await lockKey(db, `worksheet:${canonicalJson(identity)}`);
    const old = await first<ImportRow>(db, 'SELECT * FROM worksheet_imports WHERE source=$1 AND owner=$2 AND worksheet_id=$3 AND snapshot_hash=$4 AND copy_key=$5', identity);
    if (old) {
      if (!old.form_id) fail(410, 'El borrador fue eliminado.');
      return { importId: old.id, formId: old.form_id, complete: old.complete, reused: true };
    }
    await syncOwner(owner, db);
    const formId = randomUUID();
    const importId = randomUUID();
    const complete = !Object.keys(media).length;
    await insertForm(formId, owner.id, draft, 'worksheet', db);
    await db.query('INSERT INTO worksheet_imports(id,source,owner,worksheet_id,snapshot_hash,copy_key,form_id,media,complete) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [importId, ...identity, formId, media, complete]);
    return { importId, formId, complete, reused: false };
  });
}

async function importForUpdate(db: Database, importId: string) {
  if (!uuid(importId)) fail(404, 'Importación no encontrada.');
  const row = await first<ImportRow>(db, 'SELECT * FROM worksheet_imports WHERE id=$1 FOR UPDATE', [importId]);
  if (!row) fail(404, 'Importación no encontrada.');
  if (!row.form_id) fail(410, 'El borrador fue eliminado.');
  return { ...row, form_id: row.form_id };
}

export async function importWorksheetMedia(importId: string, checksum: string, buffer: unknown) {
  if (!hash(checksum) || !Buffer.isBuffer(buffer) || !buffer.length || buffer.length > limit || digest(buffer) !== checksum) fail(422, 'La imagen no coincide con el archivo anunciado.');
  const detected = await fileTypeFromBuffer(buffer).catch(() => undefined);
  if (!detected || !types.Imagen?.includes(detected.mime)) fail(415, 'El archivo debe ser una imagen compatible.');
  return tx(async db => {
    const row = await importForUpdate(db, importId);
    const media = row.media[checksum];
    if (!media || media.bytes !== buffer.length) fail(422, 'La imagen no pertenece a la ficha.');
    if (row.complete || await first(db, "SELECT id FROM files WHERE id=$1 AND form=$2 AND kind='media'", [media.id, row.form_id])) return;
    const { account, usage } = await storageAccount(db, row.owner);
    if (!account || !usage || Number(usage.used) + buffer.length > Number(account.quota)) fail(409, 'La cuenta alcanzó su cuota de almacenamiento.');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, media.id), buffer);
    await insertUpload(db, { id: media.id, form: row.form_id, bytes: media.bytes, name: `actividad.${detected.ext}`, mime: detected.mime, token: null, question: null, version: null });
  });
}

export async function finishWorksheetImport(importId: string) {
  await tx(async db => {
    const row = await importForUpdate(db, importId);
    if (row.complete) return;
    const ids = Object.values(row.media).map(media => media.id);
    const kept = await keepMedia(db, row.form_id, ids);
    if (kept.rowCount !== ids.length) fail(409, 'Todavía faltan imágenes por transferir.');
    await db.query('UPDATE worksheet_imports SET complete=true WHERE id=$1', [row.id]);
  });
}

export async function cleanupWorksheetImports() {
  await tx(async db => {
    const pending = await db.query<ImportRow>("SELECT * FROM worksheet_imports WHERE NOT complete AND created_at < now() - interval '24 hours' ORDER BY created_at LIMIT 25 FOR UPDATE SKIP LOCKED");
    for (const row of pending.rows) {
      await discard(db, 'form=$1', [row.form_id]);
      await db.query('INSERT INTO trash SELECT unnest($1::uuid[]) ON CONFLICT DO NOTHING', [Object.values(row.media).map(media => media.id)]);
      await db.query('DELETE FROM worksheet_imports WHERE id=$1', [row.id]);
      if (row.form_id) await db.query('DELETE FROM forms WHERE id=$1 AND version=0', [row.form_id]);
    }
  });
}
