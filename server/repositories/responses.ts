import { pool, first } from "../database/connection.ts";
import type { Database } from "../database/connection.ts";
import type { Answers } from "../../shared/forms.ts";
export async function resultsFor(form: string) {
  const versions = (await pool.query("SELECT version,body FROM versions WHERE form=$1 ORDER BY version DESC", [form])).rows;
  const rows = (await pool.query("SELECT * FROM responses WHERE form=$1 ORDER BY created DESC", [form])).rows;
  const files = (await pool.query("SELECT id,name,mime,bytes FROM files WHERE form=$1 AND response IS NOT NULL", [form])).rows;
  return { versions, rows, files };
}

export function deleteResponse(db: Database, form: string, response: string) {
  return db.query("DELETE FROM responses WHERE form=$1 AND id=$2", [form, response]);
}

export function previousSubmission(db: Database, token: string) {
  return first<{ slug: string }>(db, "SELECT f.slug FROM responses r JOIN forms f ON f.id=r.form WHERE r.id=$1", [token]);
}

export function insertResponse(db: Database, token: string, form: string, version: number, answers: Answers, studentName?: string) {
  return db.query("INSERT INTO responses(id,form,version,answers,student_name) VALUES($1,$2,$3,$4,$5)", [token, form, version, answers, studentName ?? null]);
}

export function attachAnswerFile(db: Database, token: string, file: string, form: string, version: number, question: string) {
  return db.query("UPDATE files SET response=$1,expires=NULL WHERE token=$1 AND id=$2 AND form=$3 AND version=$4 AND question=$5 AND response IS NULL AND expires>now()", [token, file, form, version, question]);
}
