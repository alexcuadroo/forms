export type WorksheetChoice = { id: string; label: string };
export type WorksheetExercise =
  | { kind: 'word_search'; grid: string[]; words: string[] }
  | { kind: 'crossword'; grid: string[]; clues: { row: number; col: number; length: number; number: number; direction: 'across' | 'down'; text: string }[] }
  | { kind: 'fill_blanks'; parts: (string | { id: string })[]; options: WorksheetChoice[] }
  | { kind: 'match_columns'; left: WorksheetChoice[]; right: WorksheetChoice[] }
  | { kind: 'sentence_order'; tokens: WorksheetChoice[] };

export type WorksheetKey =
  | { kind: 'exact' | 'text' | 'reference'; value: string }
  | { kind: 'items'; values: Record<string, string> };

export type WorksheetBlock = {
  type: 'info' | 'long' | 'short' | 'single' | 'bool' | 'select' | 'exercise' | 'file';
  title: string;
  description?: string;
  options?: string[];
  exercise?: WorksheetExercise;
  grading?: WorksheetKey;
  condition?: { block: number; value: string };
  media?: { digest: string; bytes: number };
};

export type WorksheetDocument = {
  title: string;
  description?: string;
  activities: { sourceActivityId: string; blocks: WorksheetBlock[] }[];
};

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const sorted = Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return Object.fromEntries(sorted);
  });
}

export function worksheetText(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('es').trim().replace(/[áéíóúü]/g, c => 'aeiouu'['áéíóúü'.indexOf(c)]!).replace(/\s+/g, ' ');
}

export function worksheetSentence(value: string): string {
  return worksheetText(value).split(' ').map(word => word.replace(/[.!?:;,]+$/, '')).filter(Boolean).join(' ');
}

export function worksheetPath(grid: string[], start: string, end: string): string[] {
  const first = /^([0-9]{1,2}),([0-9]{1,2})$/.exec(start);
  const last = /^([0-9]{1,2}),([0-9]{1,2})$/.exec(end);
  if (!first || !last) return [];
  const r = Number(first[1]), c = Number(first[2]);
  const dr = Number(last[1]) - r, dc = Number(last[2]) - c;
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return [];
  const cells = Array.from({ length: Math.max(Math.abs(dr), Math.abs(dc)) + 1 }, (_, i) =>
    [r + Math.sign(dr) * i, c + Math.sign(dc) * i] as const);
  return cells.every(([row, col]) => grid[row]?.[col] !== undefined) ? cells.map(cell => cell.join(',')) : [];
}
