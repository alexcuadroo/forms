import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PanelsTopLeft,
  Plus,
  Search,
  FileText,
  ChartNoAxesColumn,
  Globe,
  PenLine,
  Link,
  LockKeyhole,
  FolderOpen,
  Database,
  LockKeyholeOpen,
  Trash2,
} from "lucide-react";
import { api, msg, type Form, type Draft } from "./model";
import { DecisionProvider, useDecision } from "./DecisionDialog";
import { Editor } from "./Editor";
import { Results } from "./Results";
import { Runner } from "./Runner";
import { Toaster, toast } from "sonner";
import { useResource } from "./useResource";
import "./style.css";
type Row = {
  id: string;
  slug: string;
  title: string;
  closed: boolean;
  version: number;
  questions: number;
  responses: number;
  fileBytes: number;
  updated: string;
};
type Dashboard = {
  forms: Row[];
  storage: { quota: number; used: number };
  user: { name: string; plan: string };
};
function Public({ slug }: { slug: string }) {
  const { data: v, failed, reload } = useResource<{ body: Draft; version: number }>("/public/" + slug);
  return v ? (
    <Runner draft={v.body} slug={slug} version={v.version} />
  ) : (
    <main className="shell">
      {failed ? <button onClick={reload}>Volver a cargar el formulario</button> : <p>Cargando formulario…</p>}
    </main>
  );
}
function Panel() {
  const ask = useDecision();
  const { data, failed, reload } = useResource<Dashboard>("/admin/forms");
  const [hiddenFormIds, setHiddenFormIds] = useState<ReadonlySet<string>>(() => new Set());
  const [form, edit] = useState<Form>(),
    [result, results] = useState<Row>(),
    [search, find] = useState(""),
    [filter, filterBy] = useState("Todos"),
    [busy, wait] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    wait(true);
    try {
      await fn();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      wait(false);
    }
  }
  const back = () => {
    edit(undefined);
    results(undefined);
    reload();
  };
  async function deleteForm(row: Row) {
    setHiddenFormIds(ids => new Set(ids).add(row.id));
    try {
      await api("/admin/forms/" + row.id, "DELETE", { closed: row.closed });
      toast.success(`Formulario «${row.title || "Formulario sin título"}» eliminado.`);
    } catch (error) {
      setHiddenFormIds(ids => {
        const remaining = new Set(ids);
        remaining.delete(row.id);
        return remaining;
      });
      toast.error(`No se pudo eliminar «${row.title || "Formulario sin título"}».`, {
        description: msg(error),
      });
    }
  }
  if (form) return <Editor form={form} back={back} />;
  if (result)
    return <Results id={result.id} title={result.title} back={back} />;
  const rows = data?.forms.filter(row => !hiddenFormIds.has(row.id)) || [],
    status = (r: Row) =>
      !r.version ? "Borrador" : r.closed ? "Cerrado" : "Publicado";
  const hiddenBytes = data?.forms.reduce(
    (total, row) => total + (hiddenFormIds.has(row.id) ? row.fileBytes ?? 0 : 0), 0,
  ) ?? 0;
  const usedBytes = Math.max(0, Number(data?.storage.used ?? 0) - hiddenBytes);
  const found = rows.filter(
    (r) =>
      r.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (filter === "Todos" || status(r) === filter),
  );
  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="mark">
            <PanelsTopLeft />
          </span>
          EduAlex <em>Forms</em>
        </div>
        {data && (
          <div className="profile">
            <span>{data.user.name}</span>
            <b>{data.user.name?.slice(0, 1) || "E"}</b>
          </div>
        )}
      </header>
      <main className="shell dashboard">
        <div className="bar heading">
          <div>
            <small>Espacio docente</small>
            <h1>Mis formularios</h1>
          </div>
          <button
            className="primary"
            disabled={busy || !data}
            onClick={() =>
              void run(async () => edit(await api("/admin/forms", "POST")))
            }
          >
            <Plus />
            Crear formulario
          </button>
        </div>
        <div className="stats">
          {([
            [FileText, "Formularios", rows.length],
            [
              Globe,
              "En recepción",
              rows.filter((r) => r.version && !r.closed).length,
            ],
            [
              ChartNoAxesColumn,
              "Respuestas",
              rows.reduce((n, r) => n + r.responses, 0),
            ],
          ] as const).map(([Icon, title, value]) => (
            <div key={title}>
              <Icon />
              <span>{title}</span>
              <strong>{data ? value : "—"}</strong>
            </div>
          ))}
        </div>
        <div className="bar library">
          <h2>Biblioteca</h2>
          <label className="search">
            <Search />
            <input
              placeholder="Buscar formulario"
              aria-label="Buscar formulario"
              value={search}
              onChange={(e) => find(e.target.value)}
            />
          </label>
        </div>
        <nav aria-label="Filtrar formularios">
          {["Todos", "Publicado", "Borrador", "Cerrado"].map((s, i) => (
            <button
              key={s}
              aria-pressed={s === filter}
              className={s === filter ? "active" : ""}
              onClick={() => filterBy(s)}
            >
              {["Todos", "Publicados", "Borradores", "Cerrados"][i]}
            </button>
          ))}
        </nav>
        {failed && <button onClick={reload}>Volver a cargar la biblioteca</button>}
        {!data && !failed && <p>Cargando formularios…</p>}
        {data && !found.length && (
          <div className="empty">
            <FolderOpen size={38} />
            <h2>
              {rows.length ? "Sin coincidencias" : "Tu biblioteca está vacía"}
            </h2>
            <p>
              {rows.length
                ? "Probá con otra búsqueda o filtro."
                : "Creá tu primer formulario para empezar a recibir respuestas."}
            </p>
          </div>
        )}
        <div className="form-list">
          {found.map((r) => (
            <article className="form-row" key={r.id}>
              <span className="form-icon"><FileText /></span>
              <div className="form-info">
                <h3>{r.title || "Formulario sin título"}</h3>
                <span>{r.questions} {r.questions === 1 ? "pregunta" : "preguntas"} · {r.responses} {r.responses === 1 ? "respuesta" : "respuestas"}</span>
              </div>
              <span className={"form-status " + status(r)}>{status(r)}</span>
              <div className="actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      edit(await api("/admin/forms/" + r.id)),
                    )
                  }
                >
                  <PenLine />
                  Editar
                </button>
                {r.version > 0 && <button disabled={busy} onClick={() => results(r)}>
                  <ChartNoAxesColumn />
                  Resultados
                </button>}
              </div>
              {r.slug && (
                <div className="actions">
                  <button disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await navigator.clipboard.writeText(
                          location.origin + "/" + r.slug,
                        );
                        toast.success("Enlace copiado.");
                      })
                    }
                  >
                    <Link />
                    Copiar enlace
                  </button>
                  <button disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api("/admin/forms/" + r.id + "/state", "POST", {
                          closed: !r.closed,
                        });
                        toast.success(r.closed ? "Formulario reabierto." : "Formulario cerrado.");
                        reload();
                      })
                    }
                  >
                    {r.closed ? <LockKeyholeOpen /> : <LockKeyhole />}
                    {r.closed ? "Reabrir" : "Cerrar"}
                  </button>
                </div>
              )}
              {(!r.version || r.closed) && (
                <button className="danger" disabled={busy} onClick={() => ask({
                  title: r.closed ? "¿Eliminar formulario cerrado?" : "¿Eliminar borrador?",
                  description: r.closed
                    ? `Se eliminarán permanentemente «${r.title || "Formulario sin título"}», sus versiones, sus archivos y todas sus respuestas (${r.responses}).`
                    : `Se eliminarán «${r.title || "Formulario sin título"}» y sus archivos de forma permanente.`,
                  acceptLabel: r.closed ? "Eliminar formulario" : "Eliminar borrador",
                  onAccept: () => void deleteForm(r),
                })}>
                  <Trash2 /> {r.closed ? "Eliminar formulario" : "Eliminar borrador"}
                </button>
              )}
            </article>
          ))}
        </div>
        {data && (
          <footer className="storage">
            <Database />
            <strong>Almacenamiento</strong>
            <progress
              value={usedBytes}
              max={Number(data.storage.quota)}
            />
            <span>
              {(usedBytes / 1e6).toLocaleString("es-UY", {
                maximumFractionDigits: 1,
              })}{" "}
              MB de {data.storage.quota / 1e6} MB
            </span>
          </footer>
        )}
      </main>
    </>
  );
}
const pathname = location.pathname.replace(/^\/|\/$/g, "");
createRoot(document.getElementById("root")!).render(
  <DecisionProvider>
    {pathname ? <Public slug={encodeURIComponent(pathname)} /> : <Panel />}
    <Toaster position="bottom-right" richColors />
  </DecisionProvider>,
);
