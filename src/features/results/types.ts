import type { Draft, Answers } from "../../models/forms";
import type { ResultFile } from "./Attachment";
export type ResultsData = {
  kind?: 'worksheet';
  rows: { id: string; created: string; version: number; answers: Answers; student_name?: string; score?: { correct: number; total: number; scores: Record<string, { correct: number; total: number } | null> } }[];
  versions: { version: number; body: Draft }[];
  files: ResultFile[];
};
