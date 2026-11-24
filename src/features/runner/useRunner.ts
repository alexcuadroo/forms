import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { visible, answerError } from "../../../shared/forms.ts";
import { cleanStudentName } from '../../../shared/worksheet-exercises.ts';
import { api, upload } from "../../api/client";
import { msg } from "../../utils/errors";
import { type Draft, type Answer, type Answers, type Q } from "../../models/forms";
export function useRunner(
  draft: Draft,
  slug: string | undefined,
  version: number,
  requiresStudentName = false,
) {
  const [answers, setAnswers] = useState<Answers>({}),
    [index, go] = useState(requiresStudentName ? -1 : 0),
    [operation, setOperation] = useState<"" | "upload" | "submit">(""),
    [error, setError] = useState(""),
    [done, finish] = useState(false),
    [names, setNames] = useState<Record<string, string>>({}),
    [studentName, setStudentName] = useState('');
  const [token] = useState(() => crypto.randomUUID()),
    focus = useRef<HTMLHeadingElement>(null),
    lock = useRef(false);
  const busy = operation !== "";
  const list: Q[] = visible(draft.questions, answers),
    q = list[index];
  useEffect(() => {
    focus.current?.focus();
  }, [index, done]);
  const image = (id: string) =>
    slug
      ? "/api/public/" + slug + "/media/" + version + "/" + id
      : "/api/admin/files/" + id;
  const remove = (id: string) => {
    if (slug)
      void api(
        "/public/" + slug + "/upload/" + token + "/" + id,
        "DELETE",
      ).catch(() => {});
  };
  function update(value: Answer) {
    setError("");
    const next = { ...answers, [q.id]: value },
      ids = new Set(visible(draft.questions, next).map((p: Q) => p.id));
    for (const p of draft.questions)
      if (!ids.has(p.id)) {
        if (p.type === "file" && next[p.id]) remove(String(next[p.id]));
        delete next[p.id];
      }
    if (q.type === "file" && answers[q.id] && answers[q.id] !== value)
      remove(String(answers[q.id]));
    setAnswers(next);
    toast.dismiss(q.id);
  }
  async function advance() {
    if (lock.current) return;
    if (index === -1) {
      if (!cleanStudentName(studentName)) { setError('Ingresá un nombre válido para el estudiante (hasta 120 caracteres).'); return; }
      setError('');
      go(0);
      return;
    }
    if (!q) return;
    const issue = answerError(q, answers[q.id]);
    if (issue) {
      setError(issue);
      focus.current?.focus();
      return;
    }
    if (index < list.length - 1) {
      go(index + 1);
      return;
    }
    lock.current = true;
    setOperation("submit");
    try {
      if (slug)
        await api("/public/" + slug + "/responses", "POST", {
          token,
          version,
          answers,
          ...(requiresStudentName ? { studentName: cleanStudentName(studentName) } : {}),
        });
      toast.success(slug ? "Respuesta enviada." : "Vista previa completada.");
      finish(true);
    } catch (e) {
      setError(msg(e));
    } finally {
      lock.current = false;
      setOperation("");
    }
  }
  async function uploadFile(file: File | undefined) {
    if (!file || lock.current || !q) return;
    setOperation("upload");
    lock.current = true;
    try {
      if (file.size > 1e7) throw Error("El archivo supera los 10 MB.");
      update(
        slug
          ? await upload(
              `/public/${slug}/upload/${version}/${q.id}/${token}`,
              file,
            )
          : crypto.randomUUID(),
      );
      setNames({ ...names, [q.id]: file.name });
    } catch (error) {
      setError(msg(error));
    } finally {
      setOperation("");
      lock.current = false;
    }
  }
  function previous() {
    if (lock.current || index <= (requiresStudentName ? -1 : 0)) return;
    setError("");
    go(index - 1);
  }
  return {
    uploadFile,
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
    studentName,
    updateStudentName: (name: string) => { setStudentName(name); setError(''); },
  };
}
