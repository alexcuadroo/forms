import { toast } from "sonner";
import { useRef, useState } from "react";
import {
  checkDraft,
  draftIssue,
  publicationDraft,
} from "../../../shared/forms.ts";
import { api, upload } from "../../api/client";
import { msg } from "../../utils/errors";
import { imagePalette } from "../../utils/imagePalette";
import { compressBackground } from "../../utils/compressBackground";
import { type Form, type Draft, type Q, type Rule } from "../../models/forms";
import { useDecision } from "../../components/DecisionDialog";
export function useEditor(form: Form, back: () => void) {
  const ask = useDecision();
  const [saved, save] = useState(form),
    [d, set] = useState<Draft>(form.draft),
    [at, select] = useState(0),
    [tab, view] = useState("Preguntas"),
    [mobile, device] = useState(false),
    [operation, setOperation] = useState("");
  const busy = operation !== "";
  const lock = useRef(false);
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
    if (lock.current) return;
    const issue = draftIssue(d, publish);
    if (issue) {
      if (issue.index !== undefined) {
        view("Preguntas");
        select(issue.index);
      }
      toast.warning(issue.message, { id: "draft-validation" });
      return;
    }
    setOperation(publish ? "Publicando…" : "Guardando…");
    lock.current = true;
    try {
      const f = await api<Form>("/admin/forms/" + form.id, "PUT", {
        draft: publish ? publicationDraft(d) : d,
        revision: saved.revision,
        publish,
      });
      toast.dismiss("draft-validation");
      if (!publish) {
        save(f);
        set(f.draft);
        toast.success("Borrador guardado.");
        return;
      }
      back();
      const notice = toast.success("Formulario publicado.");
      if (f.slug) {
        const link = new URL("/" + f.slug, location.origin).href;
        try {
          await navigator.clipboard.writeText(link);
          toast.success("Formulario publicado. Enlace copiado.", {
            id: notice,
            description: link,
          });
        } catch {
          toast.warning("Formulario publicado. No se pudo copiar el enlace.", {
            id: notice,
            description: "Usá «Copiar enlace» en el panel.",
          });
        }
      }
    } catch (e) {
      toast.error(msg(e));
    } finally {
      lock.current = false;
      setOperation("");
    }
  }
  async function asset(file: File | undefined, background: boolean) {
    if (!file || lock.current) return;
    setOperation(background ? "Optimizando fondo…" : "Subiendo imagen…");
    lock.current = true;
    try {
      const optimized = background ? await compressBackground(file) : file;
      setOperation("Subiendo imagen…");
      const id = await upload("/admin/forms/" + form.id + "/media", optimized);
      if (background) {
        setOperation("Adaptando colores…");
        let palette: Awaited<ReturnType<typeof imagePalette>>;
        try {
          palette = await imagePalette(optimized);
        } catch {
          // A decoding failure must not discard an already uploaded image.
        }
        set((current) => ({
          ...current,
          theme: { ...current.theme, ...palette, image: id },
        }));
        if (palette)
          toast.success("Colores del fondo y acento adaptados a la imagen.");
        else
          toast.warning(
            "Imagen subida. No se pudieron detectar sus colores; podés ajustarlos manualmente.",
          );
      } else {
        edit({ media: id });
        toast.success("Imagen subida.");
      }
    } catch (e) {
      toast.error(msg(e));
    } finally {
      lock.current = false;
      setOperation("");
    }
  }
  return {
    ask,
    saved,
    d,
    at,
    tab,
    mobile,
    busy,
    operation,
    q,
    prior,
    patch,
    replace,
    edit,
    move,
    rule,
    persist,
    asset,
    select,
    view,
    device,
  };
}
