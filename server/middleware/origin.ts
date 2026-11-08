import type { RequestHandler } from "express";
import { origin } from "../config.ts";
export const checkOrigin: RequestHandler = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.get("Origin") &&
    req.get("Origin") !== origin
  )
    return res.status(403).json({ error: "Origen no permitido." });
  next();
};
