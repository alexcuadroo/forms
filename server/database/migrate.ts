import { pool } from "./connection.ts";
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
ALTER TABLE forms ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'form' CHECK (kind IN ('form', 'worksheet'));
ALTER TABLE responses ADD COLUMN IF NOT EXISTS student_name text;
CREATE TABLE IF NOT EXISTS worksheet_imports(
  id uuid PRIMARY KEY,
  source text NOT NULL,
  owner text NOT NULL REFERENCES owners,
  worksheet_id uuid NOT NULL,
  snapshot_hash text NOT NULL,
  copy_key text NOT NULL,
  form_id uuid UNIQUE REFERENCES forms ON DELETE SET NULL,
  media jsonb NOT NULL DEFAULT '{}',
  complete boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, owner, worksheet_id, snapshot_hash, copy_key)
);
`);
}
