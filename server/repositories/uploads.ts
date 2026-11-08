import { first } from "../database/connection.ts";
import type { Database } from "../database/connection.ts";
export async function storageAccount(db: Database, owner: string) {
  const account = await first<{ quota: string }>(db, "SELECT quota FROM owners WHERE id=$1 FOR UPDATE", [owner]);
  const usage = await first<{ used: string }>(db, "SELECT COALESCE(sum(bytes),0) used FROM files JOIN forms ON forms.id=files.form WHERE forms.owner=$1", [owner]);
  return { account, usage };
}

export type UploadRecord = {
  id: string;
  form: string;
  bytes: number;
  name: string;
  mime: string;
  question: string | null;
  version: number | null;
  token: string | null;
};

export function insertUpload(db: Database, file: UploadRecord) {
  return db.query(
    "INSERT INTO files(id,form,bytes,name,mime,kind,question,version,token,expires) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '24 hours')",
    [file.id, file.form, file.bytes, file.name, file.mime, file.token ? "answer" : "media", file.question, file.version, file.token],
  );
}
