export type Row = {
  id: string;
  slug: string;
  title: string;
  closed: boolean;
  version: number;
  questions: number;
  responses: number;
  fileBytes: number;
  updated: string;
};
export type Dashboard = {
  forms: Row[];
  storage: { quota: number; used: number };
  user: { name: string; plan: string };
};
