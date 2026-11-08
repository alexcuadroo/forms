import { status } from "./formStatus";
import { FileText, ChartNoAxesColumn, PenLine, Link, LockKeyhole, LockKeyholeOpen, Trash2 } from "lucide-react";
import type { Row } from "./types";
import type { useDashboard } from "./useDashboard";
type Actions = Pick<ReturnType<typeof useDashboard>,
  "busy" | "openForm" | "copyLink" | "toggleClosed" | "results" | "ask" | "deleteForm"
>;
export function FormRow({ r, actions }: { r: Row; actions: Actions }) {
  const { busy, openForm, copyLink, toggleClosed, results, ask, deleteForm } = actions;
  return (
    <article className="form-row">
      <span className="form-icon"><FileText /></span>
      <div className="form-info">
        <h3>{r.title || "Formulario sin título"}</h3>
        <span>{r.questions} {r.questions === 1 ? "pregunta" : "preguntas"} · {r.responses} {r.responses === 1 ? "respuesta" : "respuestas"}</span>
      </div>
      <span className={"form-status " + status(r)}>{status(r)}</span>
      <div className="actions">
        <button
          disabled={busy}
          onClick={() => void openForm(r.id)}
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
            onClick={() => void copyLink(r)}
          >
            <Link />
            Copiar enlace
          </button>
          <button disabled={busy}
            onClick={() => void toggleClosed(r)}
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
);
}
