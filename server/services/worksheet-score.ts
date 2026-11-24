import { visible } from '../../shared/forms.ts';
import type { Answers, Draft } from '../../shared/forms.ts';
import { worksheetText } from '../../shared/worksheet-contract.ts';
import { gradeExercise, type Score } from '../../shared/worksheet-exercises.ts';

export function gradeWorksheet(draft: Draft, answers: Answers) {
  const scores: Record<string, Score | null> = {};
  let correct = 0, total = 0;
  for (const q of visible(draft.questions, answers)) {
    if (q.type === 'info') continue;
    const answer = answers[q.id];
    let score: Score | undefined;
    if (q.type === 'exercise' && q.exercise) score = gradeExercise(q.exercise, answer, q.grading);
    if (q.grading?.kind === 'exact') score = { correct: Number(answer === q.grading.value), total: 1 };
    if (q.type !== 'exercise' && q.grading?.kind === 'text') score = { correct: Number(typeof answer === 'string' && worksheetText(answer) === worksheetText(q.grading.value)), total: 1 };
    scores[q.id] = score ?? null;
    correct += score?.correct ?? 0;
    total += score?.total ?? 0;
  }
  return { correct, total, scores };
}
