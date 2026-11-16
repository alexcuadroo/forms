import { useId } from "react";
import { ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { type Draft } from "../../models/forms";
import { contrast } from "../../utils/contrast";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AnswerInput } from "./AnswerInput";
import { useRunner } from "./useRunner";

export function Runner({
  draft,
  slug,
  version = 0,
  mobile = false,
}: {
  draft: Draft;
  slug?: string;
  version?: number;
  mobile?: boolean;
}) {
  const {
    answers,
    index,
    previous,
    busy,
    operation,
    error,
    done,
    names,
    focus,
    list,
    q,
    image,
    update,
    advance,
    uploadFile,
  } = useRunner(draft, slug, version);
  const id = useId();
  const titleId = id + "-question",
    descriptionId = id + "-description",
    errorId = id + "-error";
  const bg = draft.theme.image
    ? `linear-gradient(${draft.theme.background}db,${draft.theme.background}db),url(${image(draft.theme.image)})`
    : undefined;
  return (
    <main
      className={
        "runner " + (slug ? "runner-protected " : "") + (mobile ? "mobile" : "")
      }
      onContextMenu={slug ? (e) => e.preventDefault() : undefined}
      onCopy={slug ? (e) => e.preventDefault() : undefined}
      onCut={slug ? (e) => e.preventDefault() : undefined}
      onDragStart={slug ? (e) => e.preventDefault() : undefined}
      style={
        {
          backgroundColor: draft.theme.background,
          backgroundImage: bg,
          fontFamily: draft.theme.font + ", sans-serif",
          "--accent": draft.theme.accent,
          "--ink": bg ? "#202e29" : contrast(draft.theme.background),
          "--button-text": contrast(draft.theme.accent),
        } as React.CSSProperties
      }
    >
      <header>
        <span className="mark" aria-hidden="true">
          F
        </span>
        <span>{draft.title}</span>
        {!slug && <span className="preview-badge">Vista previa</span>}
      </header>
      {done ? (
        <section className="runner-complete" key="complete">
          <span className="completion-mark">
            <Check size={28} aria-hidden="true" />
          </span>
          <h1 tabIndex={-1} ref={focus}>
            {slug ? "Gracias por participar." : "Fin de la vista previa"}
          </h1>
          <p>
            {slug
              ? "Tu respuesta se envió correctamente. Ya podés cerrar esta página."
              : "Este recorrido fue de prueba. No se envió ninguna respuesta."}
          </p>
        </section>
      ) : q ? (
        <section key={q.id} className="runner-question">
          <div className="question-meta">
            <span>
              Pregunta {index + 1} de {list.length}
            </span>
            <span>{q.required ? "Obligatoria" : "Opcional"}</span>
          </div>
          {q.media && (
            <img
              className="qmedia"
              src={image(q.media)}
              alt="Imagen de la pregunta"
            />
          )}
          <h1 id={titleId} tabIndex={-1} ref={focus}>
            {q.title || "Pregunta sin título"}
          </h1>
          <p id={descriptionId}>
            {q.description ||
              (q.type === "multi" ? "Podés elegir más de una opción." : "")}
          </p>
          <form
            aria-labelledby={titleId}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void advance();
            }}
          >
            <fieldset className="answer-fieldset" disabled={busy}>
              <legend className="visually-hidden">Tu respuesta</legend>
              <AnswerInput
                q={q}
                value={answers[q.id]}
                filename={names[q.id]}
                error={error}
                uploading={operation === "upload"}
                labelledBy={titleId}
                describedBy={`${descriptionId} ${errorId}`}
                update={update}
                uploadFile={uploadFile}
              />
            </fieldset>
            <div id={errorId} role="alert" className="answer-error">
              {error && (
                <>
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </>
              )}
            </div>
            <div className="actions">
              <button type="submit" className="primary" disabled={busy}>
                {busy ? (
                  <LoadingSpinner
                    label={
                      operation === "upload"
                        ? "Subiendo archivo"
                        : "Enviando respuesta"
                    }
                  />
                ) : null}
                {operation === "upload"
                  ? "Subiendo archivo…"
                  : operation === "submit"
                    ? "Enviando…"
                    : index === list.length - 1
                      ? slug
                        ? "Enviar respuesta"
                        : "Finalizar prueba"
                      : "Continuar"}
                {!busy && <ArrowRight size={16} aria-hidden="true" />}
              </button>
              {index > 0 && (
                <button type="button" disabled={busy} onClick={previous}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Volver
                </button>
              )}
              {!q.required && !answers[q.id] && (
                <span className="answer-hint">
                  Podés continuar sin responder.
                </span>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section>Añadí una pregunta para ver el recorrido.</section>
      )}
      <footer>
        <span>EduForms</span>
        <span>
          {done ? "Completado" : `${index} de ${list.length} completadas`}
        </span>
        <progress
          aria-label="Preguntas completadas"
          max={list.length || 1}
          value={done ? list.length : index}
        />
      </footer>
    </main>
  );
}
