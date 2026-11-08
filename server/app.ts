import express, { type Request, type ErrorRequestHandler } from "express";
import type { Database } from "./db.ts";
import type { Draft, Answers } from "../shared/forms.ts";

import path from "node:path";
import { randomUUID, randomInt } from "node:crypto";
import { pool, first, tx, fail, migrate } from "./db.ts";
import {
  limit,
  upload,
  sendFile,
  discard,
  cleanup,
  retainMedia,
} from "./files.ts";
import {
  blank,
  uuid,
  checkDraft,
  publicationDraft,
  visible,
  answerError,
  mediaIds,
} from "../shared/forms.ts";
type User = { id: string; role: string; plan: string; name: string };
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}
type FormRow = {
  id: string;
  owner: string;
  draft: Draft;
  version: number;
  slug: string | null;
  revision: number;
  closed: boolean;
};
type FileRow = { id: string; mime: string; name: string; kind: string };

const app = express();
const origin = process.env.PUBLIC_ORIGIN || "https://forms.edualex.uy";
const auth = process.env.AUTH_URL || "https://auth.edualex.uy";
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.get("Origin") &&
    req.get("Origin") !== origin
  )
    return res.status(403).json({ error: "Origen no permitido." });
  next();
});
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});
const adm = express.Router();
app.use("/api/admin", adm);
adm.use(async (req, res, next) => {
  let data: { authenticated: boolean; allowed: boolean; user?: User };
  try {
    const r = await fetch(auth + "/api/access/check?app=forms", {
      headers: { cookie: req.headers.cookie || "" },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error();
    data = await r.json();
    for (const c of r.headers.getSetCookie()) res.append("Set-Cookie", c);
  } catch {
    fail(503, "Auth central no está disponible.");
  }
  if (!data.authenticated)
    return res
      .status(401)
      .json({
        error: "Iniciá sesión.",
        login: auth + "/login?redirect=" + encodeURIComponent(origin + "/"),
      });
  const u = data.user;
  if (
    !data.allowed ||
    !u?.id ||
    !(u.role === "admin" || u.role === "docente")
  )
    fail(403, "Se requiere rol docente o admin y acceso habilitado en auth central.");
  req.user = u;
  await pool.query(
    "INSERT INTO owners VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET quota=excluded.quota WHERE owners.quota<>excluded.quota",
    [u.id, ({ pro: 5e9, plus: 1e9 } as Record<string, number>)[u.plan] || 250e6],
  );
  next();
});
const owned = async (req: Request, db: Database = pool, lock = false) => {
  if (!uuid(req.params.id)) fail(404, "Formulario no encontrado.");
  const f = await first<FormRow>(
    db,
    "SELECT * FROM forms WHERE id=$1 AND owner=$2" +
      (lock ? " FOR UPDATE" : ""),
    [req.params.id, req.user.id],
  );
  if (!f) fail(404, "Formulario no encontrado.");
  return f;
};
adm.get("/forms", async (req, res) => {
  const forms = (
    await pool.query<{ fileBytes: number }>(
      `SELECT f.id, f.slug, f.closed, f.version, f.updated, f.draft->>'title' AS title,
              jsonb_array_length(f.draft->'questions') AS questions,
              (SELECT count(*) FROM responses r WHERE r.form=f.id)::int AS responses,
              (SELECT COALESCE(sum(bytes), 0) FROM files WHERE form=f.id)::float8 AS "fileBytes"
       FROM forms f WHERE owner=$1 ORDER BY updated DESC`,
      [req.user.id],
    )
  ).rows;
  const owner = await first<{ quota: string }>(
    pool,
    "SELECT quota FROM owners WHERE id=$1",
    [req.user.id],
  );
  const used = forms.reduce((total, row) => total + row.fileBytes, 0);
  res.json({ forms, storage: { quota: owner?.quota, used }, user: req.user });
});
adm.post("/forms", async (req, res) =>
  res
    .status(201)
    .json(
      await first(
        pool,
        "INSERT INTO forms(id,owner,draft) VALUES($1,$2,$3) RETURNING *",
        [randomUUID(), req.user.id, blank()],
      ),
    ),
);
adm.get("/forms/:id", async (req, res) => res.json(await owned(req)));
adm.delete("/forms/:id", async (req, res) => {
  await tx(async (db) => {
    const form = await owned(req, db, true);
    if (form.version !== 0 && !form.closed)
      fail(409, "Cerrá el formulario antes de eliminarlo.");
    if (form.closed && req.body?.closed !== true)
      fail(409, "El formulario cambió de estado. Confirmá el borrado desde Cerrados.");
    await discard(db, "form=$1", [form.id]);
    if (form.closed) {
      await db.query("DELETE FROM responses WHERE form=$1", [form.id]);
      await db.query("DELETE FROM versions WHERE form=$1", [form.id]);
    }
    await db.query("DELETE FROM forms WHERE id=$1", [form.id]);
  });
  res.json({ ok: true });
});
adm.put("/forms/:id", async (req, res) => {
  const { revision, publish } = req.body;
  const error = checkDraft(req.body.draft, publish);
  if (error) fail(400, error);
  const draft: Draft = publish ? publicationDraft(req.body.draft) : req.body.draft;
  res.json(
    await tx(async (db) => {
      const f = await owned(req, db, true);
      if (f.revision !== revision)
        fail(409, "Otro editor guardó cambios. Volvé a abrir el formulario.");
      await retainMedia(db, f.id, draft);
      if (publish) {
        if (!f.slug) {
          const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
          for (;;) {
            const slug = Array.from(
              { length: 4 },
              () => alphabet[randomInt(36)],
            ).join("");
            await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
              slug,
            ]);
            if (
              !(await first(db, "SELECT id FROM forms WHERE slug=$1", [slug]))
            ) {
              f.slug = slug;
              break;
            }
          }
        }
        f.version++;
        await db.query("INSERT INTO versions VALUES($1,$2,$3)", [
          f.id,
          f.version,
          draft,
        ]);
      }
      return first(
        db,
        "UPDATE forms SET draft=$2,slug=$3,version=$4,revision=revision+1,updated=now() WHERE id=$1 RETURNING *",
        [f.id, draft, f.slug, f.version],
      );
    }),
  );
});
adm.post("/forms/:id/state", async (req, res) => {
  const f = await owned(req);
  if (!f.version || typeof req.body.closed !== "boolean")
    fail(400, "Publicá el formulario primero.");
  res.json(
    await first(pool, "UPDATE forms SET closed=$2 WHERE id=$1 RETURNING *", [
      f.id,
      req.body.closed,
    ]),
  );
});
const raw = express.raw({ type: "application/octet-stream", limit });
adm.post("/forms/:id/media", raw, async (req, res) => {
  const f = await owned(req);
  await upload(req, res, { form: f.id, owner: f.owner, allowed: ["Imagen"] });
});
adm.get("/files/:file", async (req, res) => {
  const f = uuid(req.params.file)
    ? await first<FileRow>(
        pool,
        "SELECT x.* FROM files x JOIN forms f ON f.id=x.form WHERE x.id=$1 AND f.owner=$2",
        [req.params.file, req.user.id],
      )
    : undefined;
  const previewable = f && /^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|webm|quicktime)|application\/pdf|text\/plain)$/.test(f.mime);
  res.set("Cache-Control", "private, no-store");
  sendFile(res, f, req.query.download !== "1" && (f?.kind === "media" || !!previewable));
});
adm.get("/forms/:id/results", async (req, res) => {
  const f = await owned(req);
  const versions = (
    await pool.query(
      "SELECT version,body FROM versions WHERE form=$1 ORDER BY version DESC",
      [f.id],
    )
  ).rows;
  const rows = (
    await pool.query(
      "SELECT * FROM responses WHERE form=$1 ORDER BY created DESC",
      [f.id],
    )
  ).rows;
  const files = (
    await pool.query(
      "SELECT id,name,mime,bytes FROM files WHERE form=$1 AND response IS NOT NULL",
      [f.id],
    )
  ).rows;
  res.json({ versions, rows, files });
});
adm.delete("/forms/:id/results/:response", async (req, res) => {
  await tx(async (db) => {
    const f = await owned(req, db, true);
    await discard(db, "form=$1 AND response=$2", [f.id, req.params.response]);
    await db.query("DELETE FROM responses WHERE form=$1 AND id=$2", [
      f.id,
      req.params.response,
    ]);
  });
  res.json({ ok: true });
});
const pub = express.Router({ mergeParams: true });
app.use("/api/public/:slug", pub);
const published = async (req: Request, db: Database = pool, version: number | string | null = null, lock = false) => {
  const f = await first<FormRow>(
    db,
    "SELECT * FROM forms WHERE slug=$1" + (lock ? " FOR SHARE" : ""),
    [req.params.slug],
  );
  if (!f) fail(404, "No encontramos este formulario.");
  if (f.closed) fail(410, "Este formulario ya no recibe respuestas.");
  const v = await first<{ version: number; body: Draft }>(
    db,
    "SELECT * FROM versions WHERE form=$1 AND version=$2",
    [f.id, version || f.version],
  );
  if (!v) fail(404, "Versión no disponible.");
  return { f, v };
};
pub.get("/", async (req, res) => {
  const { v } = await published(req);
  res.json(v);
});
pub.get("/media/:version/:file", async (req, res) => {
  const { f, v } = await published(req, pool, req.params.version);
  if (!mediaIds(v.body).includes(req.params.file))
    fail(404, "Imagen no disponible.");
  sendFile(
    res,
    await first<FileRow>(pool, "SELECT * FROM files WHERE form=$1 AND id=$2", [
      f.id,
      req.params.file,
    ]),
    true,
  );
});
pub.post("/upload/:version/:question/:token", raw, async (req, res) => {
  const { f, v } = await published(req, pool, req.params.version);
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
});
pub.delete("/upload/:token/:file", async (req, res) => {
  const { f } = await published(req);
  await tx((db) =>
    discard(db, "form=$1 AND token=$2 AND id=$3 AND response IS NULL", [
      f.id,
      req.params.token,
      req.params.file,
    ]),
  );
  res.json({ ok: true });
});
pub.post("/responses", async (req: Request<{ slug: string }>, res) => {
  const { token, version, answers } = req.body;
  if (
    !uuid(token) ||
    !Number.isInteger(version) ||
    !answers ||
    Array.isArray(answers) ||
    typeof answers !== "object"
  )
    fail(400, "Envío inválido.");
  await tx(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [token]);
    const previous = await first<{ slug: string }>(
      db,
      "SELECT f.slug FROM responses r JOIN forms f ON f.id=r.form WHERE r.id=$1",
      [token],
    );
    if (previous?.slug === req.params.slug) return;
    const { f, v } = await published(req, db, version, true);
    const clean: Answers = {};
    for (const q of visible(v.body.questions, answers)) {
      const val = answers[q.id];
      if (
        val !== undefined &&
        typeof val !== "string" &&
        !(q.type === "multi" && Array.isArray(val))
      )
        fail(400, "Respuesta inválida.");
      const err = answerError(q, val);
      if (err) fail(400, err);
      if (val !== undefined && val !== "") clean[q.id] = val;
    }
    await db.query(
      "INSERT INTO responses(id,form,version,answers) VALUES($1,$2,$3,$4)",
      [token, f.id, version, clean],
    );
    for (const q of v.body.questions.filter(
      (q) => q.type === "file" && clean[q.id],
    )) {
      const r = await db.query(
        "UPDATE files SET response=$1,expires=NULL WHERE token=$1 AND id=$2 AND form=$3 AND version=$4 AND question=$5 AND response IS NULL AND expires>now()",
        [token, clean[q.id], f.id, version, q.id],
      );
      if (!r.rowCount) fail(400, "Volvé a cargar el archivo.");
    }
    await discard(db, "token=$1 AND form=$2 AND response IS NULL", [
      token,
      f.id,
    ]);
  });
  res.json({ ok: true });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Ruta desconocida." }),
);
app.use(express.static(path.resolve("dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.resolve("dist/index.html")),
);
const handleError: ErrorRequestHandler = (e, req, res, next) => {
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
app.use(handleError);
await migrate();
await cleanup();
setInterval(() => cleanup().catch(console.error), 60000).unref();
app.listen(Number(process.env.PORT || 3000));
