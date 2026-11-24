import type { Draft, FormKind } from "../../shared/forms.ts";
export type User = { id: string; role: string; plan: string; name: string };
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}
export type FormRow = {
  id: string;
  owner: string;
  draft: Draft;
  version: number;
  slug: string | null;
  revision: number;
  closed: boolean;
  kind: FormKind;
};
export type FileRow = { id: string; mime: string; name: string; kind: string };
