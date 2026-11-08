import { formFile } from "../repositories/files.ts";
import { pool } from "../database/connection.ts";
import { fail } from "../errors.ts";
import { uuid, mediaIds } from "../../shared/forms.ts";
import type { RequestHandler } from "express";
import { published } from "../repositories/forms.ts";
import { upload, sendFile } from "./files.ts";
import { getPublishedForm as getPublishedFormService } from "../services/get-published-form.ts";
import { deleteUpload as deleteUploadService } from "../services/delete-upload.ts";
import { submitResponse as submitResponseService } from "../services/submit-response.ts";
export const getPublishedForm: RequestHandler<Record<string, string>> = async (req, res) => {
  res.json(await getPublishedFormService(req.params.slug));
};
export const getPublicMedia: RequestHandler<Record<string, string>> = async (req, res) => {
  const { f, v } = await published(req.params.slug, pool, req.params.version);
  if (!mediaIds(v.body).includes(req.params.file))
    fail(404, "Imagen no disponible.");
  sendFile(
    res,
    await formFile(f.id, req.params.file),
    true,
  );
};
export const uploadAnswer: RequestHandler<Record<string, string>> = async (req, res) => {
  const { f, v } = await published(req.params.slug, pool, req.params.version);
  const q = v.body.questions.find(
    (q) => q.id === req.params.question && q.type === "file",
  );
  if (!q || !uuid(req.params.token)) fail(400, "Carga inválida.");
  await upload(req, res, {
    form: f.id,
    owner: f.owner,
    allowed: q.categories,
    question: q.id,
    version: v.version,
    token: req.params.token,
  });
};
export const deleteUpload: RequestHandler<Record<string, string>> = async (req, res) => {
  res.json(await deleteUploadService(req.params.slug, req.params.token, req.params.file));
};
export const submitResponse: RequestHandler<Record<string, string>> = async (req, res) => {
  res.json(await submitResponseService(req.params.slug, req.body));
};
