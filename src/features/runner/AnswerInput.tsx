import { useId } from "react";
import { Upload } from "lucide-react";
import { options } from "../../../shared/forms.ts";
import type { Answer, Q } from "../../models/forms";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ExerciseInput } from '../worksheets/ExerciseInput';

type Props = {
  q: Q;
  value: Answer | undefined;
  filename?: string;
  error: string;
  uploading: boolean;
  labelledBy: string;
  describedBy: string;
  update: (value: Answer) => void;
  uploadFile: (file: File | undefined) => Promise<void>;
};
export function AnswerInput({
  q,
  value,
  filename,
  error,
  uploading,
  labelledBy,
  describedBy,
  update,
  uploadFile,
}: Props) {
  const name = useId();
  const a11y = {
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": !!error,
    "aria-required": q.required,
  };
  if (q.type === 'info') return null;
  if (q.type === 'exercise' && q.exercise) return <div aria-describedby={describedBy}><ExerciseInput exercise={q.exercise} value={value} update={update} /></div>;
  if (q.type === "short" || q.type === "url")
    return (
      <input
        {...a11y}
        name={q.id}
        type={q.type === "url" ? "url" : "text"}
        autoCapitalize={q.type === "url" ? "none" : "sentences"}
        spellCheck={q.type !== "url"}
        className="line"
        placeholder={q.type === "url" ? "https://" : "Escribí tu respuesta…"}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => update(e.target.value)}
      />
    );
  if (q.type === "long")
    return (
      <textarea
        {...a11y}
        name={q.id}
        className="line"
        placeholder="Escribí tu respuesta…"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => update(e.target.value)}
      />
    );
  if (q.type === "select")
    return (
      <select
        {...a11y}
        name={q.id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => update(e.target.value)}
      >
        <option value="">Elegí una opción</option>
        {options(q).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (q.type === "file")
    return (
      <div>
        <label className="upload">
          {uploading ? (
            <LoadingSpinner label="Subiendo archivo" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          <span>
            {uploading
              ? "Subiendo archivo…"
              : filename && value
                ? filename
                : "Seleccionar archivo"}
          </span>
          <input
            {...a11y}
            name={q.id}
            disabled={uploading}
            type="file"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              void uploadFile(file);
            }}
          />
        </label>
        <p className="answer-hint">{q.categories.join(" · ")} · Máx. 10 MB</p>
        <p role="status" className="answer-hint">
          {uploading
            ? "Esperá a que termine la subida para continuar."
            : filename && value
              ? "Archivo listo para enviar."
              : ""}
        </p>
      </div>
    );
  return (
    <fieldset
      className="answer-choices"
      aria-describedby={describedBy}
      aria-invalid={!!error}
    >
      <legend className="visually-hidden">
        {q.title || "Elegí tu respuesta"}
        {q.required ? " (obligatoria)" : " (opcional)"}
      </legend>
      {options(q).map((o) => {
        const multi = q.type === "multi";
        const selected = multi
          ? Array.isArray(value) && value.includes(o)
          : value === o;
        return (
          <label
            className={selected ? "answer-choice selected" : "answer-choice"}
            key={o}
          >
            <input
              type={multi ? "checkbox" : "radio"}
              required={!multi && q.required}
              name={name}
              value={o}
              checked={selected}
              onChange={() => {
                const previous = Array.isArray(value) ? value : [];
                update(
                  multi
                    ? selected
                      ? previous.filter((x) => x !== o)
                      : [...previous, o]
                    : o,
                );
              }}
            />
            <span>{o}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
