import { pool } from "./database/connection.ts";
import { router as admin } from "./routes/admin.ts";
import { router as publicForms } from "./routes/public.ts";
import { checkOrigin } from "./middleware/origin.ts";
import { handleError } from "./middleware/errors.ts";
import express from "express";
import path from "node:path";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use("/api", checkOrigin);
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  });
  app.use("/api/admin", admin);
  app.use("/api/public/:slug", publicForms);
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Ruta desconocida." }),
  );
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
  app.use(handleError);
  return app;
}
