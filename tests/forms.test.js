import test from "node:test";
import assert from "node:assert/strict";
import {
  blank,
  question,
  checkDraft,
  visible,
  answerError,
} from "../shared/forms.js";
const first = { ...question(), title: "¿Participás?", type: "bool" };
const second = {
  ...question(),
  title: "Detalles",
  rules: [{ source: first.id, op: "es", value: "Verdadero" }],
};
const third = {
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
