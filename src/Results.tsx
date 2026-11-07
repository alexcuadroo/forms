import { useState } from "react";
import { toast } from "sonner";
import { useDecision } from "./DecisionDialog";
import { useResource } from "./useResource";
import { ArrowLeft, Download, Trash2, FileText, ExternalLink, Eye, Search } from "lucide-react";
import { api, msg, type Draft, type Answers } from "./model";
import { choice, options } from "../shared/forms.ts";
type ResultFile = { id: string; name: string; mime: string; bytes: number };
function Attachment({ file }: { file: ResultFile }) {
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = "/api/admin/files/" + encodeURIComponent(file.id);
  const image = file.mime.startsWith("image/");
  const video = file.mime.startsWith("video/");
  const document = file.mime === "application/pdf" || file.mime === "text/plain";
  const canPreview = image || video || document;
  return <div className="attachment">
    <div className="attachment-heading">
      <FileText aria-hidden="true" />
      <div className="attachment-info"><strong>{file.name}</strong><span>{file.mime.split("/").pop()} · {new Intl.NumberFormat("es-UY", { maximumFractionDigits: 1 }).format(file.bytes / 1024)} KB</span></div>
      <div className="actions">
        {canPreview && <button aria-expanded={preview} onClick={() => setPreview(!preview)}><Eye />{preview ? "Ocultar" : "Vista previa"}</button>}
        {canPreview && <a className="file-action" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Abrir</a>}
        <a className="file-action" href={url + "?download=1"}><Download />Descargar</a>
      </div>
    </div>
    {!canPreview && <p className="attachment-note">Este formato no tiene vista previa. Descargalo para abrirlo.</p>}
    {preview && <div className="attachment-preview">
      {failed ? <p role="status">No se pudo mostrar el archivo. Probá abrirlo en otra pestaña o descargarlo.</p> : image ? <img src={url} alt={file.name} onError={() => setFailed(true)} /> : video ? <video controls preload="metadata" src={url} onError={() => setFailed(true)} /> : <iframe title={"Vista previa de " + file.name} src={url} />}
      {document && <p className="attachment-note">Si tu navegador no muestra el documento, usá Abrir o Descargar.</p>}
    </div>}
  </div>;
}
type Data = {
  rows: { id: string; created: string; version: number; answers: Answers }[];
  versions: { version: number; body: Draft }[];
  files: ResultFile[];
};
export function Results({
  id,
  title,
  back,
}: {
  id: string;
  title: string;
  back: () => void;
}) {
  const ask = useDecision();
  const base = "/admin/forms/" + id + "/results";
  const { data, failed, reload } = useResource<Data>(base);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState("");
  const [onlyFiles, setOnlyFiles] = useState(false);
  const files = new Map(data?.files.map((f) => [f.id, f]));
  const rows = data?.rows.filter((r) =>
    (!version || r.version === Number(version)) &&
    (!onlyFiles || Object.values(r.answers).some((a) => typeof a === "string" && files.has(a))) &&
    (!search.trim() || Object.values(r.answers).flat().some((a) =>
      (files.get(String(a))?.name || String(a)).toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))),
  ) || [];
  const filename = (id: string) =>
    data?.files.find((f) => f.id === id)?.name || id;
  function csv() {
    if (!data) return;
    const cols = data.versions.flatMap((v) =>
      v.body.questions.map((q) => ({ version: v.version, q })),
    );
    const table = [
      [
        "Fecha",
        "Versión",
        ...cols.map((c) => "v" + c.version + " · " + c.q.title),
      ],
      ...data.rows.map((r) => [
        r.created,
        String(r.version),
        ...cols.map(({ version, q }) => {
          const val = r.answers[q.id];
          return version !== r.version || !val
            ? ""
            : q.type === "file"
              ? filename(String(val))
              : Array.isArray(val)
                ? val.join(", ")
                : val;
        }),
      ]),
    ];
    const quote = (s: string) =>
      '"' +
      (/^[\s]*[=+@-]|^[\t\r]/.test(s) ? "'" : "") +
      s.replaceAll('"', '""') +
      '"';
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + table.map((row) => row.map(quote).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "respuestas.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
                  onAccept: async () => {
                    try {
                      setDeleting(true);
                      await api(base + "/" + r.id, "DELETE");
                      toast.success("Envío eliminado.");
                      reload();
                    } catch (e) {
                      toast.error(msg(e));
                    } finally {
                      setDeleting(false);
                    }
                  },
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
