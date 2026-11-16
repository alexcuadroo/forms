import { useEditor } from "./useEditor";
import { MediaPicker } from "./MediaPicker";
import { VisibilityRules } from "./VisibilityRules";
import { ThemeEditor } from "./ThemeEditor";
import { ArrowLeft, ArrowUp, ArrowDown, Copy, Trash2, Plus, Eye, Send, Save, Monitor, Smartphone, Palette, List } from "lucide-react";
import { labels, question, choice, categories } from "../../../shared/forms.ts";
import { type Form, type Kind } from "../../models/forms";
import { Runner } from "../runner/Runner";
import { LoadingSpinner } from "../../components/LoadingSpinner";
export function Editor({ form, back }: { form: Form; back: () => void }) {
  const { ask, saved, d, at, tab, mobile, busy, operation, q, prior, patch, replace, edit, move, rule, persist, asset, select, view, device } = useEditor(form, back);
  const dirty = JSON.stringify(d) !== JSON.stringify(saved.draft);
  return (
    <fieldset disabled={busy} className="editor shell">
      <legend className="visually-hidden">Editor del formulario</legend>
      <div className="bar">
        <button
          onClick={() => {
            if (JSON.stringify(d) === JSON.stringify(saved.draft)) return back();
            ask({
              title: "¿Salir del editor?",
              description: "Si volvés al panel, se perderán los cambios sin guardar.",
              acceptLabel: "Descartar y salir",
              onAccept: back,
            });
          }}
        >
          <ArrowLeft />
          Panel
        </button>
        <div className="actions">
          <span className="save-status" role="status">{busy ? <><LoadingSpinner label={operation} />{operation}</> : dirty ? "Cambios sin guardar" : "Cambios guardados"}</span>
          <button onClick={() => void persist(false)}>
            <Save />
            {operation === "Guardando…" ? operation : "Guardar"}
          </button>
          <button className="primary" onClick={() => void persist(true)}>
            <Send />
            {operation === "Publicando…" ? operation : "Publicar"}
          </button>
        </div>
      </div>
      <input
        className="editorTitle"
        aria-label="Título del formulario"
        value={d.title}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <nav aria-label="Secciones del editor">
        {([
          [List, "Preguntas"],
          [Palette, "Diseño"],
          [Eye, "Vista previa"],
        ] as const).map(([Icon, name]) => (
          <button
            className={tab === name ? "active" : ""}
            aria-pressed={tab === name}
            key={name}
            onClick={() => view(name)}
          >
            <Icon />
            {name}
          </button>
        ))}
      </nav>
      {tab === "Vista previa" ? (
        <>
          <div className="actions preview-devices" role="group" aria-label="Tamaño de vista previa">
            <button onClick={() => device(false)} aria-pressed={!mobile}>
              <Monitor />
              Escritorio
            </button>
            <button onClick={() => device(true)} aria-pressed={mobile}>
              <Smartphone />
              Móvil
            </button>
          </div>
          <Runner draft={d} mobile={mobile} />
        </>
      ) : tab === "Diseño" ? (
        <ThemeEditor d={d} patch={patch} asset={asset} />
      ) : (
        <div className="editGrid">
          <aside className="card">
            <h3>Preguntas <span>{d.questions.length}</span></h3>
            {d.questions.map((p, i) => (
              <button
                className={at === i ? "active" : ""}
                aria-current={at === i ? "step" : undefined}
                key={p.id}
                onClick={() => select(i)}
              >
                <span className="question-number">{i + 1}</span>
                <span>{p.title || labels[p.type]}</span>
              </button>
            ))}
            <button
              onClick={() =>
                replace([...d.questions, question()], d.questions.length)
              }
            >
              <Plus />
              Añadir pregunta
            </button>
          </aside>
          {q ? (
            <article key={q.id} className="card fields">
              <div className="bar">
                <h2>Pregunta {at + 1}</h2>
                <div className="actions">
                  {([
                    [ArrowUp, "Subir", () => move(-1), at === 0],
                    [
                      ArrowDown,
                      "Bajar",
                      () => move(1),
                      at === d.questions.length - 1,
                    ],
                    [
                      Copy,
                      "Duplicar",
                      () => {
                        const a = [...d.questions];
                        a.splice(at + 1, 0, {
                          ...structuredClone(q),
                          id: crypto.randomUUID(),
                        });
                        replace(a, at + 1);
                      },
                      false,
                    ],
                    [
                      Trash2,
                      "Eliminar",
                      () => replace(d.questions.filter((p) => p.id !== q.id)),
                      false,
                    ],
                  ] as const).map(([Icon, title, fn, disabled]) => (
                    <button
                      key={title}
                      aria-label={title}
                      title={title}
                      onClick={fn}
                      disabled={disabled}
                    >
                      <Icon />
                    </button>
                  ))}
                </div>
              </div>
              <label>
                Pregunta
                <input
                  value={q.title}
                  placeholder="¿Qué te gustaría preguntar?"
                  onChange={(e) => edit({ title: e.target.value })}
                />
              </label>
              <label>
                Descripción
                <textarea
                  value={q.description}
                  onChange={(e) => edit({ description: e.target.value })}
                />
              </label>
              <label className="response-type">
                Tipo de respuesta
                <select
                  value={q.type}
                  onChange={(e) => edit({ type: e.target.value as Kind })}
                >
                  {Object.entries(labels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              {choice(q.type) && q.type !== "bool" && (
                <label>
                  Opciones (una por línea)
                  <textarea
                    value={q.options.join("\n")}
                    onChange={(e) =>
                      edit({ options: e.target.value.split("\n") })
                    }
                  />
                </label>
              )}
              {q.type === "file" && (
                <div>
                  Archivos permitidos
                  {categories.map((c) => (
                    <label className="check" key={c}>
                      <input
                        type="checkbox"
                        checked={q.categories.includes(c)}
                        onChange={(e) =>
                          edit({
                            categories: e.target.checked
                              ? [...q.categories, c]
                              : q.categories.filter((x) => x !== c),
                          })
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => edit({ required: e.target.checked })}
                />
                Respuesta obligatoria
              </label>
              <MediaPicker bg={false} id={q.media} asset={asset} remove={() => edit({ media: "" })} />
              <VisibilityRules q={q} prior={prior} edit={edit} rule={rule} />
            </article>
          ) : (
            <article className="card">
              <h2>Primera pregunta</h2>
              <button onClick={() => replace([question()])}>
                <Plus />
                Añadir pregunta
              </button>
            </article>
          )}
        </div>
      )}
    </fieldset>
  );
}
