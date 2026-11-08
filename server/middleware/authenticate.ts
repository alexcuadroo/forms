import { syncOwner } from "../repositories/owners.ts";
import { fail } from "../errors.ts";
import type { User } from "../models/entities.ts";
import type { RequestHandler } from "express";
import { auth, origin } from "../config.ts";
export const authenticate: RequestHandler = async (req, res, next) => {
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
  await syncOwner(u);
  next();
};
