import type { Draft, FormKind } from "../../shared/forms.ts";
export type { Answer, Answers, Draft, FormKind, Kind, Question as Q, Rule } from "../../shared/forms.ts";

export type Form = {
  id: string;
  slug: string | null;
  draft: Draft;
  version: number;
  revision: number;
  closed: boolean;
  kind: FormKind;
};
