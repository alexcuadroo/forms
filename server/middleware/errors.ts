import type { ErrorRequestHandler } from "express";
export const handleError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
  if (status >= 500)
    console.error({ method: req.method, path: req.path, error });
  const message =
    error.type === "entity.parse.failed"
      ? "El cuerpo de la solicitud no contiene JSON válido."
      : status === 413
        ? req.is("application/octet-stream")
          ? "El archivo supera los 10 MB."
          : "La solicitud supera el tamaño permitido."
        : status >= 500
          ? "No pudimos completar la operación."
          : error.message;
  res.status(status).json({ error: message });
};
