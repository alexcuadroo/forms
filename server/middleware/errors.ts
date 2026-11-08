import type { ErrorRequestHandler } from "express";
export const handleError: ErrorRequestHandler = (e, req, res, next) => {
  if (res.headersSent) return next(e);
  if (!e.status) console.error(e);
  res
    .status(e.status || 500)
    .json({
      error:
        e.status === 413
          ? "El archivo supera los 10 MB."
          : e.status
            ? e.message
            : "No pudimos completar la operación.",
    });
};
