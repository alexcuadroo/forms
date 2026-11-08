import { useResults } from "./useResults";
import { Attachment } from "./Attachment";
import { ArrowLeft, Download, Trash2, Search } from "lucide-react";
import { choice, options } from "../../../shared/forms.ts";
export function Results({
  id,
  title,
  back,
}: {
  id: string;
  title: string;
  back: () => void;
}) {
  const { ask, data, failed, reload, deleting, search, setSearch, version, setVersion, onlyFiles, setOnlyFiles, files, rows, csv, deleteResponse } = useResults(id);

  return (
    <main className="shell results">
      <button onClick={back}>
        <ArrowLeft />
        Panel
      </button>
      <h1>{title}</h1>
      <div className="bar">
        <div><h2>Respuestas</h2>{data && <p className="results-meta">{data.rows.length} envíos recibidos · {data.files.length} archivos adjuntos</p>}</div>
        <button disabled={!data} onClick={csv}>
          <Download />
          Exportar CSV
        </button>
      </div>
      {failed && <button onClick={reload}>Volver a cargar los resultados</button>}
      {!data && !failed && <p>Cargando resultados…</p>}
      {data && (
        <>
          {data.versions.filter((v) => v.body.questions.some((q) => choice(q.type))).map((v) => (
            <details className="card" key={v.version}>
              <summary>Resumen de opciones · Versión {v.version}</summary>
              {v.body.questions
                .filter((q) => choice(q.type))
                .map((q) => (
                  <div key={q.id}>
                    <h3>{q.title}</h3>
                    {options(q).map((o: string) => (
                      <p key={o}>
                        {o} ·{" "}
                        {
                          data.rows.filter(
                            (r) =>
                              r.version === v.version &&
                              (Array.isArray(r.answers[q.id])
                                ? r.answers[q.id].includes(o)
                                : r.answers[q.id] === o),
                          ).length
                        }
                      </p>
                    ))}
                  </div>
                ))}
            </details>
          ))}
          <div className="results-toolbar">
            <label className="search"><Search aria-hidden="true" /><input aria-label="Buscar en las respuestas" placeholder="Buscar respuestas o archivos" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <select aria-label="Filtrar por versión" value={version} onChange={(e) => setVersion(e.target.value)}><option value="">Todas las versiones</option>{data.versions.map((v) => <option key={v.version} value={v.version}>Versión {v.version}</option>)}</select>
            <label className="results-file-filter"><input type="checkbox" checked={onlyFiles} onChange={(e) => setOnlyFiles(e.target.checked)} />Con archivos</label>
          </div>
          <h2>Envíos ({rows.length})</h2>
          {!data.rows.length && <div className="empty">Todavía no hay envíos.</div>}
          {!!data.rows.length && !rows.length && <div className="empty">No hay respuestas que coincidan con los filtros.</div>}
          {rows.map((r) => (
            <details className="card response-card" key={r.id} open={data.rows.length === 1}>
              <summary>
                {new Date(r.created).toLocaleString("es-UY")} · Versión{" "}
                {r.version}
              </summary>
              {data.versions
                .find((v) => v.version === r.version)
                ?.body.questions.filter((q) => Object.hasOwn(r.answers, q.id))
                .map((q) => (
                  <div className="response-answer" key={q.id}>
                    <h3>{q.title}</h3>
                    {q.type === "file" ? (
                      files.has(String(r.answers[q.id])) ? <Attachment file={files.get(String(r.answers[q.id]))!} /> : <p className="results-meta">Archivo no disponible.</p>
                    ) : (
                      <p className="answer-text">{[r.answers[q.id]].flat().join(", ") || "Sin respuesta"}</p>
                    )}
                  </div>
                ))}
              <button
                className="response-delete"
                disabled={deleting}
                onClick={() => ask({
                  title: "¿Eliminar envío?",
                  description: `Se eliminarán la respuesta del ${new Date(r.created).toLocaleString("es-UY")} y sus archivos de forma permanente.`,
                  acceptLabel: "Eliminar envío",
                  onAccept: () => deleteResponse(r.id),
                })}
              >
                <Trash2 />
                Eliminar envío
              </button>
            </details>
          ))}
        </>
      )}
    </main>
  );
}
