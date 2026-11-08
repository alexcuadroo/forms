import { useRunner } from "./useRunner";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, Upload } from "lucide-react";
import { options } from "../../../shared/forms.ts";
import { type Draft } from "../../models/forms";
function contrast(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.179
    ? "#000"
    : "#fff";
}
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
  const { answers, index, go, busy, done, names, focus, list, q, image, update, advance, uploadFile } = useRunner(draft, slug, version);
  const bg = draft.theme.image
    ? "linear-gradient(#ffffffdb,#ffffffdb),url(" +
      image(draft.theme.image) +
      ")"
    : undefined;
  return (
    <main
      className={"runner " + (slug ? "runner-protected " : "") + (mobile ? "mobile" : "")}
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
        <span className="mark">F</span>
        {draft.title}
      </header>
      {done ? (
        <section>
          <Check />
          <h1 tabIndex={-1} ref={focus}>
            {slug ? "Gracias por participar." : "Fin de la vista previa"}
          </h1>
          {!slug && <p>Podés volver al editor.</p>}
        </section>
      ) : q ? (
        <section>
          <small>
            Pregunta {index + 1} de {list.length}
          </small>
          {q.media && (
            <img
              className="qmedia"
              src={image(q.media)}
              alt="Imagen de la pregunta"
            />
          )}
          <h1 id="question" tabIndex={-1} ref={focus}>
            {q.title || "Pregunta sin título"}
            {q.required && " *"}
          </h1>
          <p>{q.description}</p>
          <form
            aria-labelledby="question"
            onSubmit={(e) => {
              e.preventDefault();
              void advance();
            }}
          >
            {["short", "url"].includes(q.type) ? (
              <input
                key={q.id}
                aria-labelledby="question"
                className="line"
                placeholder={
                  q.type === "url" ? "https://" : "Escribí tu respuesta…"
                }
                value={answers[q.id] || ""}
                onChange={(e) => update(e.target.value)}
              />
            ) : q.type === "long" ? (
              <textarea
                aria-labelledby="question"
                className="line"
                placeholder="Escribí tu respuesta…"
                value={answers[q.id] || ""}
                onChange={(e) => update(e.target.value)}
              />
            ) : q.type === "select" ? (
              <select
                aria-labelledby="question"
                value={answers[q.id] || ""}
                onChange={(e) => update(e.target.value)}
              >
                <option value="">Elegí una opción</option>
                {options(q).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : q.type === "file" ? (
              <label className="upload">
                <Upload />
                {names[q.id] && answers[q.id]
                  ? names[q.id]
                  : "Seleccionar archivo"}
                <small>{q.categories.join(" · ")} · Máx. 10 MB</small>
                <input
                  disabled={busy}
                  type="file"
                  onChange={(e) => void uploadFile(e.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="choices">
                {options(q).map((o: string, i: number) => {
                  const val = answers[q.id],
                    multi = q.type === "multi",
                    selected = multi
                      ? Array.isArray(val) && val.includes(o)
                      : val === o;
                  return (
                    <button
                      type="button"
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      key={o}
                      onClick={() => {
                        const prior = Array.isArray(val) ? val : [];
                        update(
                          multi
                            ? selected
                              ? prior.filter((x) => x !== o)
                              : [...prior, o]
                            : o,
                        );
                      }}
                    >
                      <b>{i + 1}</b>
                      {o}
                      {selected && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="actions">
              <button type="submit" className="primary" disabled={busy}>
                {busy
                  ? "Procesando…"
                  : index === list.length - 1
                    ? "Enviar"
                    : "Continuar"}
                <ArrowRight size={16} />
              </button>
              {index > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    go(index - 1);
                    toast.dismiss(q.id);
                  }}
                >
                  <ArrowLeft size={16} />
                  Volver
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section>Añadí una pregunta para ver el recorrido.</section>
      )}
      <footer>
        EduForms
        <progress max={list.length || 1} value={done ? list.length : index} />
      </footer>
    </main>
  );
}
