import { worksheetPath, worksheetSentence } from './worksheet-contract.ts';
import type { WorksheetChoice, WorksheetExercise, WorksheetKey } from './worksheet-contract.ts';

export type ExerciseAnswer = Record<string, string> | string[];
export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const boundedText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const coord = (r: number, c: number) => `${r},${c}`;

function choiceList(value: unknown): value is WorksheetChoice[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && value.every(item => isRecord(item) && id(item.id) && boundedText(item.label, 500) && item.label.trim()) && new Set(value.map(item => item.id)).size === value.length;
}

function validGrid(value: unknown, letters: RegExp): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 64 && value.every(row => boundedText(row, 64) && row.length === value[0]?.length && letters.test(row));
}

type Clue = Extract<WorksheetExercise, { kind: 'crossword' }>['clues'][number];
export function clueCells(clue: Clue) {
  return Array.from({ length: clue.length }, (_, i) => coord(clue.row + (clue.direction === 'down' ? i : 0), clue.col + (clue.direction === 'across' ? i : 0)));
}

function validClue(value: unknown, grid: string[]): value is Clue {
  if (!isRecord(value)) return false;
  const { row, col, length, number, direction, text } = value;
  if (typeof row !== 'number' || !Number.isInteger(row) || typeof col !== 'number' || !Number.isInteger(col) || typeof length !== 'number' || !Number.isInteger(length) || length < 1 || length > 64 || typeof number !== 'number' || !Number.isInteger(number) || number < 1 || !boundedText(text, 500) || !text.trim() || (direction !== 'across' && direction !== 'down')) return false;
  return clueCells({ row, col, length, number, direction, text }).every(cell => {
    const [r, c] = cell.split(',').map(Number);
    return grid[r]?.[c] === '.';
  });
}

export function validExercise(value: unknown): value is WorksheetExercise {
  if (!isRecord(value)) return false;
  const { grid, words, clues, options, parts, left, right, tokens } = value;
  switch (value.kind) {
    case 'word_search': return validGrid(grid, /^[A-ZÑ]+$/) && Array.isArray(words) && words.length > 0 && words.length <= 100 && new Set(words).size === words.length && words.every(word => boundedText(word, 64) && /^[A-ZÑ]+$/.test(word));
    case 'crossword': return validGrid(grid, /^[.#]+$/) && Array.isArray(clues) && clues.length > 0 && clues.length <= 100 && clues.every(clue => validClue(clue, grid));
    case 'fill_blanks': {
      if (!choiceList(options) || !Array.isArray(parts) || parts.length > 250 || !parts.every(part => boundedText(part, 20000) || isRecord(part) && id(part.id))) return false;
      const holes = parts.filter(isRecord);
      return holes.length > 0 && new Set(holes.map(part => part.id)).size === holes.length;
    }
    case 'match_columns': return choiceList(left) && choiceList(right) && left.length >= 2 && left.length === right.length;
    case 'sentence_order': return choiceList(tokens) && tokens.length >= 2;
    default: return false;
  }
}

export function validKey(value: unknown): value is WorksheetKey {
  if (!isRecord(value)) return false;
  if (value.kind === 'items') return isRecord(value.values) && Object.keys(value.values).length > 0 && Object.keys(value.values).length <= 4096 && Object.entries(value.values).every(([key, answer]) => (id(key) || /^[0-9]{1,2},[0-9]{1,2}$/.test(key)) && boundedText(answer, 250));
  return ['exact', 'text', 'reference'].includes(String(value.kind)) && boundedText(value.value, 20000) && !!value.value.trim();
}

export function publicExercise(exercise: WorksheetExercise): WorksheetExercise {
  const choices = (items: WorksheetChoice[]) => items.map(({ id, label }) => ({ id, label }));
  switch (exercise.kind) {
    case 'word_search': return { kind: exercise.kind, grid: exercise.grid, words: exercise.words };
    case 'crossword': return { kind: exercise.kind, grid: exercise.grid, clues: exercise.clues.map(({ row, col, length, number, direction, text }) => ({ row, col, length, number, direction, text })) };
    case 'fill_blanks': return { kind: exercise.kind, parts: exercise.parts.map(part => typeof part === 'string' ? part : { id: part.id }), options: choices(exercise.options) };
    case 'match_columns': return { kind: exercise.kind, left: choices(exercise.left), right: choices(exercise.right) };
    case 'sentence_order': return { kind: exercise.kind, tokens: choices(exercise.tokens) };
  }
}

function answersIn(answer: unknown, addresses: Set<string>, accepts: (value: string) => boolean): boolean {
  return isRecord(answer) && Object.entries(answer).every(([key, value]) => addresses.has(key) && typeof value === 'string' && accepts(value));
}

export function segmentCells(grid: string[], segment: string) {
  const [start, end, extra] = segment.split(':');
  return start && end && extra === undefined ? worksheetPath(grid, start, end) : [];
}

export function exerciseAnswerValid(exercise: WorksheetExercise, answer: unknown): boolean {
  switch (exercise.kind) {
    case 'word_search': return Array.isArray(answer) && answer.length <= exercise.words.length && new Set(answer).size === answer.length && answer.every(segment => typeof segment === 'string' && segmentCells(exercise.grid, segment).length > 0);
    case 'crossword': return answersIn(answer, new Set(exercise.clues.flatMap(clueCells)), value => /^[A-ZÑ]$/i.test(value));
    case 'fill_blanks': return answersIn(answer, new Set(exercise.parts.flatMap(part => typeof part === 'string' ? [] : [part.id])), value => exercise.options.some(option => option.id === value));
    case 'match_columns': return answersIn(answer, new Set(exercise.left.map(item => item.id)), value => exercise.right.some(item => item.id === value)) && new Set(Object.values(answer as Record<string, string>)).size === Object.keys(answer as object).length;
    case 'sentence_order': return Array.isArray(answer) && answer.length <= exercise.tokens.length && new Set(answer).size === answer.length && answer.every(token => exercise.tokens.some(item => item.id === token));
  }
}

export type Score = { correct: number; total: number };
export function gradeExercise(exercise: WorksheetExercise, answer: unknown, key?: WorksheetKey): Score | undefined {
  const sequence = Array.isArray(answer) ? answer.filter((value): value is string => typeof value === 'string') : [];
  const items = isRecord(answer) ? answer : {};
  if (exercise.kind === 'word_search') {
    const found = new Set<string>();
    for (const segment of sequence) {
      const letters = segmentCells(exercise.grid, segment).map(cell => {
        const [r, c] = cell.split(',').map(Number);
        return exercise.grid[r]?.[c];
      });
      const word = [letters.join(''), letters.reverse().join('')].find(value => exercise.words.includes(value) && !found.has(value));
      if (word) found.add(word);
    }
    return { correct: found.size, total: exercise.words.length };
  }
  if (exercise.kind === 'sentence_order' && key?.kind === 'text') {
    const sentence = sequence.map(value => exercise.tokens.find(item => item.id === value)?.label).join(' ');
    return { correct: Number(worksheetSentence(sentence) === worksheetSentence(key.value)), total: 1 };
  }
  if (key?.kind !== 'items') return undefined;
  if (exercise.kind === 'crossword') {
    const correct = exercise.clues.filter(clue => clueCells(clue).every(cell => typeof items[cell] === 'string' && items[cell].toLocaleUpperCase('es') === key.values[cell])).length;
    return { correct, total: exercise.clues.length };
  }
  return { correct: Object.entries(key.values).filter(([id, expected]) => items[id] === expected).length, total: Object.keys(key.values).length };
}

export function validExerciseKey(exercise: WorksheetExercise, key: WorksheetKey | undefined) {
  if (exercise.kind === 'word_search') return key === undefined;
  if (exercise.kind === 'sentence_order') return key?.kind === 'text';
  if (key?.kind !== 'items' || !exerciseAnswerValid(exercise, key.values)) return false;
  const score = gradeExercise(exercise, key.values, key);
  const units = exercise.kind === 'crossword' ? exercise.clues.length : exercise.kind === 'fill_blanks' ? exercise.parts.filter(isRecord).length : exercise.left.length;
  return score?.correct === units && score.total === units;
}

export function cleanStudentName(value: unknown) {
  if (typeof value !== 'string' || /\p{Cc}/u.test(value)) return undefined;
  const name = value.trim();
  return name && Array.from(name).length <= 120 ? name : undefined;
}
