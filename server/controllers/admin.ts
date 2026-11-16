import type { RequestHandler } from "express";
import { sendFile } from "./files.ts";
import {
  uploadMedia as uploadMediaService,
  getAdminFile as getAdminFileService,
} from "../services/admin-files.ts";
import { listForms as listFormsService } from "../services/list-forms.ts";
import { createForm as createFormService } from "../services/create-form.ts";
import { getForm as getFormService } from "../services/get-form.ts";
import { deleteForm as deleteFormService } from "../services/delete-form.ts";
import { saveForm as saveFormService } from "../services/save-form.ts";
import { setFormState as setFormStateService } from "../services/set-form-state.ts";
import { getResults as getResultsService } from "../services/get-results.ts";
import { deleteResponse as deleteResponseService } from "../services/delete-response.ts";
export const listForms: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await listFormsService(req.user));
};
export const createForm: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.status(201).json(await createFormService(req.user));
};
export const getForm: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await getFormService(req.params.id, req.user));
};
export const deleteForm: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await deleteFormService(req.params.id, req.user, req.body));
};
export const saveForm: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await saveFormService(req.params.id, req.user, req.body));
};
export const setFormState: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await setFormStateService(req.params.id, req.user, req.body));
};
export const uploadMedia: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res
    .status(201)
    .json(
      await uploadMediaService(
        req.params.id,
        req.user.id,
        req.body,
        req.get("X-File-Name"),
      ),
    );
};
export const getAdminFile: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  const f = await getAdminFileService(req.params.file, req.user.id);
  const previewable =
    f &&
    /^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|webm|quicktime)|application\/pdf|text\/plain)$/.test(
      f.mime,
    );
  res.set("Cache-Control", "private, no-store");
  sendFile(
    res,
    f,
    req.query.download !== "1" && (f?.kind === "media" || !!previewable),
  );
};
export const getResults: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await getResultsService(req.params.id, req.user));
};
export const deleteResponse: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(
    await deleteResponseService(req.params.id, req.user, req.params.response),
  );
};
