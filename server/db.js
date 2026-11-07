import pg from "pg";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function tx(fn) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const out = await fn(db);
    await db.query("COMMIT");
    return out;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export const first = async (db, sql, args = []) =>
  (await db.query(sql, args)).rows[0];
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export async function migrate() {
  await pool.query(`
CREATE TABLE IF NOT EXISTS owners(id text PRIMARY KEY, quota bigint NOT NULL);
CREATE TABLE IF NOT EXISTS forms(id uuid PRIMARY KEY, owner text NOT NULL REFERENCES owners, slug text UNIQUE, draft jsonb NOT NULL, revision int NOT NULL DEFAULT 0, version int NOT NULL DEFAULT 0, closed boolean NOT NULL DEFAULT false, updated timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS versions(form uuid REFERENCES forms, version int NOT NULL, body jsonb NOT NULL, PRIMARY KEY(form,version));
CREATE TABLE IF NOT EXISTS responses(id uuid PRIMARY KEY, form uuid NOT NULL, version int NOT NULL, answers jsonb NOT NULL, created timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(form,version) REFERENCES versions);
CREATE TABLE IF NOT EXISTS files(id uuid PRIMARY KEY, form uuid NOT NULL REFERENCES forms, bytes int NOT NULL, name text NOT NULL, mime text NOT NULL, kind text NOT NULL, question uuid, version int, token uuid, response uuid REFERENCES responses, expires timestamptz);
CREATE INDEX IF NOT EXISTS forms_owner ON forms(owner);
CREATE INDEX IF NOT EXISTS files_form ON files(form);
CREATE INDEX IF NOT EXISTS responses_form ON responses(form);
CREATE TABLE IF NOT EXISTS trash(id uuid PRIMARY KEY);
`);
}
