import { resultsFor } from "../repositories/responses.ts";
import type { User } from "../models/entities.ts";
import { owned } from "../repositories/forms.ts";
import { gradeWorksheet } from './worksheet-score.ts';
import type { Answers, Draft } from '../../shared/forms.ts';
export async function getResults(id: string, user: User) {
  const f = await owned(id, user.id);
  const results = await resultsFor(f.id);
  if (f.kind !== 'worksheet') return results;
  const versions = new Map<number, Draft>(results.versions.map(version => [version.version, version.body]));
  return { ...results, kind: f.kind, rows: results.rows.map(row => {
    const draft = versions.get(row.version);
    return draft ? { ...row, score: gradeWorksheet(draft, row.answers as Answers) } : row;
  }) };
}
