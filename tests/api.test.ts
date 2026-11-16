import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.ts";
import { pool } from "../server/database/connection.ts";
import { auth, origin } from "../server/config.ts";
import { blank, question } from "../shared/forms.ts";
import type { FormRow } from "../server/models/entities.ts";

test("API conserva autenticación, publicación, resultados y reglas de borrado", async (t) => {
  const forms = new Map<string, FormRow>();
  const versions = new Map<
    string,
    { version: number; body: ReturnType<typeof blank> }
  >();
  const statements: string[] = [];
  const user = { id: "teacher", role: "docente", name: "Docente", plan: "pro" };
  let authenticated = true;
  const query = async (sql: string, args: any[] = []) => {
    statements.push(sql);
    let rows: any[] = [];
    if (sql.startsWith("INSERT INTO forms")) {
      const form = {
        id: args[0],
        owner: args[1],
        draft: args[2],
        revision: 0,
        version: 0,
        closed: false,
        slug: null,
      };
      forms.set(form.id, form);
      rows = [form];
    } else if (sql.startsWith("SELECT * FROM forms WHERE id")) {
      const form = forms.get(args[0]);
      rows = form?.owner === args[1] ? [{ ...form }] : [];
    } else if (sql.startsWith("SELECT * FROM forms WHERE slug")) {
      rows = [...forms.values()].filter((f) => f.slug === args[0]);
    } else if (sql.startsWith("SELECT * FROM versions")) {
      const version = versions.get(`${args[0]}:${args[1]}`);
      rows = version ? [version] : [];
    } else if (sql.startsWith("INSERT INTO versions")) {
      versions.set(`${args[0]}:${args[1]}`, {
        version: args[1],
        body: args[2],
      });
    } else if (sql.startsWith("UPDATE forms SET draft")) {
      const form = forms.get(args[0])!;
      Object.assign(form, {
        draft: args[1],
        slug: args[2],
        version: args[3],
        revision: form.revision + 1,
      });
      rows = [form];
    } else if (sql.startsWith("UPDATE forms SET closed")) {
      const form = forms.get(args[0])!;
      form.closed = args[1];
      rows = [form];
    } else if (sql.startsWith("SELECT version,body FROM versions")) {
      rows = [...versions.entries()]
        .filter(([key]) => key.startsWith(args[0] + ":"))
        .map(([, v]) => v);
    } else if (sql.startsWith("SELECT body FROM versions")) {
      rows = [...versions.entries()]
        .filter(([key]) => key.startsWith(args[0] + ":"))
        .map(([, v]) => ({ body: v.body }));
    } else if (sql.startsWith("DELETE FROM forms")) {
      forms.delete(args[0]);
    }
    return { rows, rowCount: rows.length };
  };
  // Replace only external dependencies; requests still traverse real routes,
  // middleware, controllers, services and repositories.
  t.mock.method(pool, "query", query);
  t.mock.method(pool, "connect", async () => ({ query, release() {} }));
  const realFetch = globalThis.fetch;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).startsWith(auth + "/api/access/check")) {
        return Response.json({ authenticated, allowed: true, user });
      }
      return realFetch(url, init);
    },
  );
  const server = createApp().listen(0, "127.0.0.1");
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}/api`;
  async function request(
    url: string,
    method = "GET",
    body?: unknown,
    requestOrigin = origin,
  ) {
    const response = await fetch(base + url, {
      method,
      headers: { Origin: requestOrigin, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await request("/health")).status, 200);
  assert.equal((await request("/unknown")).status, 404);
  const malformed = await fetch(base + "/admin/forms", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: '{"broken":',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), {
    error: "El cuerpo de la solicitud no contiene JSON válido.",
  });
  assert.equal(
    (await request("/admin/forms", "POST", {}, "https://other.example")).status,
    403,
  );
  authenticated = false;
  const denied = await request("/admin/forms");
  assert.equal(denied.status, 401);
  assert.match(denied.body.login, /login\?redirect=/);
  authenticated = true;

  const created = await request("/admin/forms", "POST");
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await request(`/admin/forms/${id}`)).body.id, id);
  assert.equal((await request("/admin/forms/not-a-uuid")).status, 404);
  const draft = {
    ...blank(),
    questions: [{ ...question(), title: "Pregunta" }],
  };
  const published = await request(`/admin/forms/${id}`, "PUT", {
    draft,
    revision: 0,
    publish: true,
  });
  assert.equal(published.status, 200);
  assert.equal(published.body.version, 1);
  assert.equal(published.body.slug.length, 4);
  const slug = published.body.slug;
  assert.deepEqual((await request(`/public/${slug}`)).body.body, draft);
  assert.equal(
    (await request(`/admin/forms/${id}`, "PUT", { draft, revision: 0 })).status,
    409,
  );
  assert.equal((await request(`/admin/forms/${id}`, "DELETE")).status, 409);
  assert.equal(
    (await request(`/admin/forms/${id}/results`)).body.versions.length,
    1,
  );
  assert.equal(
    (
      await request(`/public/${slug}/responses`, "POST", {
        token: randomUUID(),
        version: 1,
        answers: {},
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/admin/forms/${id}/state`, "POST", { closed: true })).body
      .closed,
    true,
  );
  assert.equal((await request(`/public/${slug}`)).status, 410);
  assert.equal((await request(`/admin/forms/${id}`, "DELETE", {})).status, 409);
  assert.equal(
    (await request(`/admin/forms/${id}`, "DELETE", { closed: true })).status,
    200,
  );
  assert.equal((await request(`/admin/forms/${id}`)).status, 404);
  assert.ok(statements.includes("ROLLBACK"));
  assert.ok(statements.includes("COMMIT"));
});
