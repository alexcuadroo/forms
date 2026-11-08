import type { Draft, Answers } from "../../models/forms";
import type { ResultFile } from "./Attachment";
export type ResultsData = {
  rows: { id: string; created: string; version: number; answers: Answers }[];
  versions: { version: number; body: Draft }[];
  files: ResultFile[];
};
