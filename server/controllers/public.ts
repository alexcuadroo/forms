import type { RequestHandler } from "express";
import { sendFile } from "./files.ts";
import { getPublishedForm as getPublishedFormService } from "../services/get-published-form.ts";
import { deleteUpload as deleteUploadService } from "../services/delete-upload.ts";
import { submitResponse as submitResponseService } from "../services/submit-response.ts";
import {
  getPublicMedia as getPublicMediaService,
  uploadAnswer as uploadAnswerService,
} from "../services/public-files.ts";

export const getPublishedForm: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await getPublishedFormService(req.params.slug));
};
export const getPublicMedia: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  sendFile(
    res,
    await getPublicMediaService(
      req.params.slug,
      req.params.version,
      req.params.file,
    ),
    true,
  );
};
export const uploadAnswer: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res
    .status(201)
    .json(
      await uploadAnswerService(
        req.params.slug,
        req.params.version,
        req.params.question,
        req.params.token,
        req.body,
        req.get("X-File-Name"),
      ),
    );
};
export const deleteUpload: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(
    await deleteUploadService(
      req.params.slug,
      req.params.token,
      req.params.file,
    ),
  );
};
export const submitResponse: RequestHandler<Record<string, string>> = async (
  req,
  res,
) => {
  res.json(await submitResponseService(req.params.slug, req.body));
};
