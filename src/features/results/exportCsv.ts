import type { ResultsData } from "./types";
import { answerText } from '../worksheets/answerText';
export function createCsvExport(data: ResultsData | undefined) {
  const filename = (id: string) =>
    data?.files.find((f) => f.id === id)?.name || id;
  return function csv() {
    if (!data) return;
    const cols = data.versions.flatMap((v) =>
      v.body.questions.filter(q => q.type !== 'info').map((q) => ({ version: v.version, q })),
    );
    const table = [
      [
        ...(data.kind === 'worksheet' ? ['Estudiante', 'Aciertos', 'Total corregible'] : []),
        "Fecha",
        "Versión",
        ...cols.map((c) => "v" + c.version + " · " + c.q.title),
      ],
      ...data.rows.map((r) => [
        ...(data.kind === 'worksheet' ? [r.student_name ?? '', r.score?.total ? String(r.score.correct) : '', r.score?.total ? String(r.score.total) : ''] : []),
        r.created,
        String(r.version),
        ...cols.map(({ version, q }) => {
          const val = r.answers[q.id];
          return version !== r.version || !val
            ? ""
            : q.type === "file"
              ? filename(String(val))
              : answerText(q, val);
        }),
      ]),
    ];
    const quote = (s: string) =>
      '"' +
      (/^[\s]*[=+@-]|^[\t\r]/.test(s) ? "'" : "") +
      s.replaceAll('"', '""') +
      '"';
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + table.map((row) => row.map(quote).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "respuestas.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
