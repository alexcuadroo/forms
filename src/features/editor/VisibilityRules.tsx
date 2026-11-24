import { Plus, Trash2 } from "lucide-react";
import { choice, options, operators } from "../../../shared/forms.ts";
import type { Q, Rule } from "../../models/forms";
export function VisibilityRules({ q, prior, edit, rule }: { q: Q; prior: Q[]; edit: (patch: Partial<Q>) => void; rule: (index: number, patch: Partial<Rule>) => void }) {
 const sources = prior.map((question, index) => ({ question, number: index + 1 })).filter(({ question }) => operators(question.type).length > 0);
 const first = sources[0]?.question;
 return <>
              {first && (
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
                          {sources.map(({ question, number }) => (
                            <option value={question.id} key={question.id}>
                              {number}. {question.title}
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
                            source: first.id,
                            op: operators(first.type)[0],
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
</>;
}
