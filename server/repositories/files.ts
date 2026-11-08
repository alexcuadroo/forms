import { first, pool } from "../database/connection.ts";
import type { FileRow } from "../models/entities.ts";
export function ownedFile(id: string, owner: string) {
  return first<FileRow>(pool, "SELECT x.* FROM files x JOIN forms f ON f.id=x.form WHERE x.id=$1 AND f.owner=$2", [id, owner]);
}

export function formFile(form: string, id: string) {
  return first<FileRow>(pool, "SELECT * FROM files WHERE form=$1 AND id=$2", [form, id]);
}
