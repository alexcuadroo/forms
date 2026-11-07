export const labels = {
  short: "Texto breve",
  long: "Texto largo",
  single: "Opción única",
  multi: "Selección múltiple",
  select: "Desplegable",
  bool: "Verdadero / falso",
  url: "Enlace",
  file: "Archivo",
};
export const choice = (type) =>
  ["single", "multi", "select", "bool"].includes(type);
export const options = (q) =>
  q.type === "bool" ? ["Verdadero", "Falso"] : q.options;
export const categories = ["Imagen", "Video", "PDF", "Documento"];
export const fonts = ["Inter", "Georgia", "Verdana", "monospace"];
export const blank = () => ({
  title: "Formulario sin título",
  theme: { accent: "#245E4A", background: "#F6F5EF", font: "Inter", image: "" },
  questions: [],
});
export const question = () => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  type: "short",
  required: false,
  options: ["Opción 1", "Opción 2"],
  categories: [...categories],
  media: "",
  mode: "all",
  rules: [],
});
export const operators = (type) =>
  type === "file"
    ? ["respondida"]
    : type === "multi"
      ? ["contiene", "respondida"]
      : choice(type)
        ? ["es", "respondida"]
        : ["es", "contiene", "respondida"];
const filled = (v) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" && !!v.trim();
export function visible(questions, answers) {
  const shown = new Set();
  return questions.filter((q) => {
    const matches = q.rules.map((r) => {
      const v = answers[r.source];
      if (!shown.has(r.source) || !filled(v)) return false;
      if (r.op === "respondida") return true;
      return r.op === "contiene" ? v.includes(r.value) : v === r.value;
    });
    const ok =
      !matches.length ||
      (q.mode === "all" ? matches.every(Boolean) : matches.some(Boolean));
    if (ok) shown.add(q.id);
    return ok;
  });
}
export const uuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
export function checkDraft(d, publishing = false) {
  const str = (v, max) => typeof v === "string" && v.length <= max;
  const asset = (v) => v === "" || uuid(v);
  if (
    !d ||
    !str(d.title, 200) ||
    !Array.isArray(d.questions) ||
    d.questions.length > 200 ||
    !d.theme ||
    !fonts.includes(d.theme.font) ||
    ![d.theme.background, d.theme.accent].every((c) =>
      /^#[a-f0-9]{6}$/i.test(c),
    ) ||
    !asset(d.theme.image)
  )
    return "Revisá el título y el diseño.";
  if (publishing && (!d.title.trim() || !d.questions.length))
    return "Añadí un título y al menos una pregunta.";
  const prior = new Map();
  for (const q of d.questions) {
    if (
      !q ||
      !uuid(q.id) ||
      prior.has(q.id) ||
      !Object.hasOwn(labels, q.type) ||
      !str(q.title, 500) ||
      !str(q.description, 3000) ||
      !asset(q.media) ||
      typeof q.required !== "boolean" ||
      !["all", "any"].includes(q.mode) ||
      !Array.isArray(q.rules) ||
      !Array.isArray(q.options) ||
      !q.options.every((o) => str(o, 250)) ||
      !Array.isArray(q.categories) ||
      !q.categories.every((c) => categories.includes(c))
    )
      return "Hay una pregunta inválida.";
    if (
      publishing &&
      (!q.title.trim() ||
        (choice(q.type) &&
          (!options(q).length ||
            options(q).some((o) => !o.trim()) ||
            new Set(options(q)).size !== options(q).length)) ||
        (q.type === "file" && !q.categories.length))
    )
      return "Completá el título y las opciones de cada pregunta.";
    for (const r of q.rules) {
      const src = prior.get(r.source);
      if (!src || !operators(src.type).includes(r.op) || !str(r.value, 2000))
        return "La condición debe referirse a una pregunta anterior compatible.";
      if (
        publishing &&
        r.op !== "respondida" &&
        (!r.value.trim() ||
          (choice(src.type) && !options(src).includes(r.value)))
      )
        return "Revisá el valor de la condición.";
    }
    prior.set(q.id, q);
  }
}
export function answerError(q, v) {
  if (!filled(v))
    return q.required ? "Respondé esta pregunta para continuar." : undefined;
  if (q.type === "multi")
    return Array.isArray(v) &&
      new Set(v).size === v.length &&
      v.every((o) => options(q).includes(o))
      ? undefined
      : "Selección inválida.";
  if (typeof v !== "string" || v.length > 20000) return "Respuesta inválida.";
  if (choice(q.type) && !options(q).includes(v))
    return "Elegí una de las opciones.";
  if (q.type === "url") {
    try {
      if (!["https:", "http:"].includes(new URL(v).protocol)) throw Error();
    } catch {
      return "Ingresá un enlace que empiece con https:// o http://.";
    }
  }
  if (q.type === "file" && !uuid(v)) return "Archivo inválido.";
}
export const mediaIds = (d) => [
  ...new Set(
    [d.theme.image, ...d.questions.map((q) => q.media)].filter(Boolean),
  ),
];
