import { lockKey } from "../database/locks.ts";
import { previousSubmission, insertResponse, attachAnswerFile } from "../repositories/responses.ts";
import { tx } from "../database/connection.ts";
import { fail } from "../errors.ts";
import type { Answers } from "../../shared/forms.ts";
import { uuid, visible, answerError } from "../../shared/forms.ts";
import { discard } from "../services/file-lifecycle.ts";
import { published } from "../repositories/forms.ts";
export async function submitResponse(slug: string, input: { token: string; version: number; answers: Answers }) {
  const { token, version, answers } = input;
  if (
    !uuid(token) ||
    !Number.isInteger(version) ||
    !answers ||
    Array.isArray(answers) ||
    typeof answers !== "object"
  )
    fail(400, "Envío inválido.");
  await tx(async (db) => {
    await lockKey(db, token);
    const previous = await previousSubmission(db, token);
    if (previous?.slug === slug) return;
    const { f, v } = await published(slug, db, version, true);
    const clean: Answers = {};
    for (const q of visible(v.body.questions, answers)) {
      const val = answers[q.id];
      if (
        val !== undefined &&
        typeof val !== "string" &&
        !(q.type === "multi" && Array.isArray(val))
      )
        fail(400, "Respuesta inválida.");
      const err = answerError(q, val);
      if (err) fail(400, err);
      if (val !== undefined && val !== "") clean[q.id] = val;
    }
    await insertResponse(db, token, f.id, version, clean);
    for (const q of v.body.questions.filter(
      (q) => q.type === "file" && clean[q.id],
    )) {
      const r = await attachAnswerFile(db, token, clean[q.id], f.id, version, q.id);
      if (!r.rowCount) fail(400, "Volvé a cargar el archivo.");
    }
    await discard(db, "token=$1 AND form=$2 AND response IS NULL", [
      token,
      f.id,
    ]);
  });
  return ({ ok: true });
}
