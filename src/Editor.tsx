import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus,
  Eye,
  Send,
  Save,
  Monitor,
  Smartphone,
  Palette,
  List,
  ImagePlus,
} from "lucide-react";
import {
  labels,
  question,
  choice,
  options,
  operators,
  categories,
  fonts,
  checkDraft,
} from "../shared/forms.ts";
import {
  api,
  upload,
  msg,
  type Form,
  type Draft,
  type Q,
  type Kind,
  type Rule,
} from "./model";
import { useDecision } from "./DecisionDialog";
import { Runner } from "./Runner";
export function Editor({ form, back }: { form: Form; back: () => void }) {
  const ask = useDecision();
  const [saved, save] = useState(form),
    [d, set] = useState<Draft>(form.draft),
    [at, select] = useState(0),
    [tab, view] = useState("Preguntas"),
    [mobile, device] = useState(false),
    [busy, wait] = useState(false);
  const q = d.questions[at],
    prior = d.questions.slice(0, at);
  const patch = (p: Partial<Draft>) => {
    set({ ...d, ...p });
  };
  function replace(list: Q[], i = at) {
    const error = checkDraft({ ...d, questions: list });
    if (error) {
      toast.warning(error);
      return;
    }
    patch({ questions: list });
    select(Math.min(i, Math.max(0, list.length - 1)));
  }
  function edit(p: Partial<Q>) {
    replace(d.questions.map((x, i) => (i === at ? { ...x, ...p } : x)));
  }
  function move(by: number) {
    const list = [...d.questions];
    [list[at], list[at + by]] = [list[at + by], list[at]];
    replace(list, at + by);
  }
  function rule(i: number, p: Partial<Rule>) {
    edit({ rules: q.rules.map((r, n) => (n === i ? { ...r, ...p } : r)) });
  }
  async function persist(publish: boolean) {
    const error = checkDraft(d, publish);
    if (error) {
      toast.warning(error);
      return;
    }
    wait(true);
    try {
      const f = await api<Form>("/admin/forms/" + form.id, "PUT", {
        draft: d,
        revision: saved.revision,
        publish,
      });
      save(f);
      toast.success(
        publish
          ? "Publicado en " + location.origin + "/" + f.slug
          : "Borrador guardado.",
      );
    } catch (e) {
      toast.error(msg(e));
    } finally {
      wait(false);
    }
  }
  async function asset(file: File | undefined, background: boolean) {
    if (!file) return;
    wait(true);
    try {
      const id = await upload("/admin/forms/" + form.id + "/media", file);
      if (background) patch({ theme: { ...d.theme, image: id } });
      else edit({ media: id });
    } catch (e) {
      toast.error(msg(e));
    } finally {
      wait(false);
    }
  }
  const mediaPicker = (bg: boolean, id: string) => (
    <div>
      {id && (
        <img
          className="thumb"
          src={"/api/admin/files/" + id}
          alt="Imagen seleccionada"
        />
      )}
      <label className="upload">
        <ImagePlus size={18} />
        {bg ? "Imagen de fondo" : "Imagen o GIF"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          onChange={(e) => void asset(e.target.files?.[0], bg)}
        />
      </label>
      {id && (
        <button
          onClick={() =>
            bg
              ? patch({ theme: { ...d.theme, image: "" } })
              : edit({ media: "" })
          }
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
  return (
    <fieldset disabled={busy} className="editor shell">
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
          <button onClick={() => void persist(false)}>
            <Save />
            Guardar
          </button>
          <button className="primary" onClick={() => void persist(true)}>
            <Send />
            Publicar
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
          <div className="actions">
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
        <div className="card fields">
          <h2>Diseño del formulario</h2>
          <label>
            Fuente
            <select
              value={d.theme.font}
              onChange={(e) =>
                patch({ theme: { ...d.theme, font: e.target.value } })
              }
            >
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {(["accent", "background"] as const).map((k) => (
            <label key={k}>
              {k === "accent" ? "Color de acento" : "Color de fondo"}
              <input
                type="color"
                value={d.theme[k]}
                onChange={(e) =>
                  patch({ theme: { ...d.theme, [k]: e.target.value } })
                }
              />
            </label>
          ))}
          {mediaPicker(true, d.theme.image)}
        </div>
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
              <label>
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
              {mediaPicker(false, q.media)}
              {!!prior.length && (
                <details open={q.rules.length > 0}>
                  <summary>Condiciones de visibilidad</summary>
                  <label>
                    Mostrar cuando se cumplan
                    <select
                      value={q.mode}
                      onChange={(e) => edit({ mode: e.target.value })}
                    >
                      <option value="all">Todas las condiciones</option>
                      <option value="any">Alguna condición</option>
                    </select>
                  </label>
                  {q.rules.map((r, i) => {
                    const src = prior.find((p) => p.id === r.source)!;
                    return (
                      <div className="rule" key={i}>
                        <select
                          aria-label="Pregunta anterior"
                          value={r.source}
                          onChange={(e) => {
                            const p = prior.find(
                              (x) => x.id === e.target.value,
                            )!;
                            rule(i, {
                              source: p.id,
                              op: operators(p.type)[0],
                              value: "",
                            });
                          }}
                        >
                          {prior.map((p, n) => (
                            <option value={p.id} key={p.id}>
                              {n + 1}. {p.title}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Operador"
                          value={r.op}
                          onChange={(e) => rule(i, { op: e.target.value })}
                        >
                          {operators(src.type).map((op) => (
                            <option key={op}>{op}</option>
                          ))}
                        </select>
                        {r.op !== "respondida" &&
                          (choice(src.type) ? (
                            <select
                              aria-label="Valor"
                              value={r.value}
                              onChange={(e) =>
                                rule(i, { value: e.target.value })
                              }
                            >
                              <option value="">Elegí un valor</option>
                              {options(src).map((o: string) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-label="Valor"
                              value={r.value}
                              onChange={(e) =>
                                rule(i, { value: e.target.value })
                              }
                            />
                          ))}
                        <button
                          aria-label="Quitar condición"
                          onClick={() =>
                            edit({ rules: q.rules.filter((_, j) => j !== i) })
                          }
                        >
                          <Trash2 />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() =>
                      edit({
                        rules: [
                          ...q.rules,
                          {
                            source: prior[0].id,
                            op: operators(prior[0].type)[0],
                            value: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus />
                    Añadir condición
                  </button>
                </details>
              )}
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
