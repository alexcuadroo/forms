import type { Draft } from "../../shared/forms.ts";
export type { Answers, Draft, Kind, Question as Q, Rule } from "../../shared/forms.ts";

export type Form = {
  id: string;
  slug: string | null;
  draft: Draft;
  version: number;
  revision: number;
  closed: boolean;
};
