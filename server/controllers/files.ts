import type { Response } from "express";
import { fail } from "../errors.ts";
import { uuid } from "../../shared/forms.ts";
import { directory } from "../storage/files.ts";
import path from "node:path";
export function sendFile(
  res: Response,
  file: { id: string; mime: string; name: string } | undefined,
  inline = false,
) {
  if (!file || !uuid(file.id)) fail(404, "Archivo no disponible.");
  res.type(file.mime).set("X-Content-Type-Options", "nosniff");
  if (!inline) res.attachment(file.name);
  res.sendFile(path.join(directory, file.id));
}
