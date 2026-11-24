import { lockKey } from "../database/locks.ts";
import { previousSubmission, insertResponse, attachAnswerFile } from "../repositories/responses.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import type { Answers } from "../../shared/forms.ts";
import { uuid, questionVisible, answerError } from "../../shared/forms.ts";
import { cleanStudentName } from '../../shared/worksheet-exercises.ts';
import { discard } from "../services/file-lifecycle.ts";
import { published } from "../repositories/forms.ts";
export async function submitResponse(slug: string, input: { token: string; version: number; answers: Answers; studentName?: unknown }) {
  if (!input || typeof input !== 'object') fail(400, 'Envío inválido.');
  const { token, version, answers } = input;
  if (
    !uuid(token) ||
    !Number.isInteger(version) ||
    version < 1 ||
    !answers ||
    Array.isArray(answers) ||
    typeof answers !== "object"
  )
    fail(400, "Envío inválido.");
  await tx(async (db) => {
    await lockKey(db, token);
    const previous = await previousSubmission(db, token);
    if (previous?.slug === slug) return;
    if (previous) fail(409, 'El identificador de envío ya está en uso.');
    const { f, v } = await published(slug, db, version, true);
    const studentName = f.kind === 'worksheet' ? cleanStudentName(input.studentName) : undefined;
    if (f.kind === 'worksheet' && !studentName) fail(400, 'Ingresá un nombre válido para el estudiante (hasta 120 caracteres).');
    const clean: Answers = {};
    const shown = new Set<string>();
    for (const q of v.body.questions) {
      if (!questionVisible(q, shown, clean)) continue;
      shown.add(q.id);
      if (q.type === 'info') continue;
      const val = answers[q.id];
      if (
        val !== undefined &&
        typeof val !== "string" &&
        !(q.type === "multi" && Array.isArray(val)) && q.type !== 'exercise'
      )
        fail(400, "Respuesta inválida.");
      const err = answerError(q, val);
      if (err) fail(400, err);
      if (val !== undefined && val !== "") clean[q.id] = val;
    }
    await insertResponse(db, token, f.id, version, clean, studentName);
    for (const q of v.body.questions.filter(
      (q) => q.type === "file" && clean[q.id],
    )) {
      const file = clean[q.id];
      if (typeof file !== 'string') fail(400, 'Archivo inválido.');
      const r = await attachAnswerFile(db, token, file, f.id, version, q.id);
      if (!r.rowCount) fail(400, "Volvé a cargar el archivo.");
    }
    await discard(db, "token=$1 AND form=$2 AND response IS NULL", [
      token,
      f.id,
    ]);
  });
  return ({ ok: true });
}
