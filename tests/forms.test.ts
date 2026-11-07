import test from "node:test";
import assert from "node:assert/strict";
import {
  type Question,
  blank,
  question,
  checkDraft,
  draftIssue,
  publicationDraft,
  visible,
  answerError,
} from "../shared/forms.ts";
const first: Question = { ...question(), title: "¿Participás?", type: "bool" };
const second = {
  ...question(),
  title: "Detalles",
  rules: [{ source: first.id, op: "es", value: "Verdadero" }],
};
const third: Question = {
  ...question(),
  title: "Adjunto",
  type: "file",
  rules: [{ source: second.id, op: "respondida", value: "" }],
};
const questions = [first, second, third];
test("oculta respuestas de ramas abandonadas incluso en condiciones encadenadas", () => {
  assert.equal(
    visible(questions, { [first.id]: "Verdadero", [second.id]: "Sí" }).length,
    3,
  );
  assert.deepEqual(
    visible(questions, { [first.id]: "Falso", [second.id]: "Sí" }),
    [first],
  );
});
test("valida el orden de las dependencias y los borradores al publicar", () => {
  assert.ok(checkDraft(blank(), true));
  assert.equal(checkDraft({ ...blank(), questions }, true), undefined);
  assert.ok(checkDraft({ ...blank(), questions: [second, first] }));
});
test("valida URL, opciones y obligatoriedad", () => {
  assert.ok(answerError({ ...first, type: "url" }, "javascript:alert(1)"));
  assert.equal(
    answerError({ ...first, type: "url" }, "https://example.org"),
    undefined,
  );
  assert.ok(answerError({ ...first, required: true }, " "));
  assert.ok(answerError(first, "Otro"));
  assert.ok(answerError({ ...first, type: "multi" }, ["Opción 1", "Opción 1"]));
});

test("publica la selección múltiple con líneas vacías y conserva las opciones y reglas", () => {
  const multi: Question = { ...second, type: "multi", options: ["Opción 1", "", "Opción 2", "OTRA OPCION", " "] };
  const draft = { ...blank(), questions: [first, multi, third] };
  assert.equal(checkDraft(draft, true), undefined);
  const published = publicationDraft(draft);
  assert.deepEqual(published.questions[1].options, ["Opción 1", "Opción 2", "OTRA OPCION"]);
  assert.deepEqual(published.questions[1].rules, multi.rules);
  assert.equal(multi.options.length, 5);
  for (const invalid of [[" "], ["Uno", "", "Uno"]]) {
    const issue = draftIssue({ ...draft, questions: [first, { ...multi, options: invalid }] }, true);
    assert.equal(issue?.index, 1);
    assert.match(issue!.message, /opción/);
  }
});
