import { published } from "../repositories/forms.ts";
import { publicDraft } from '../../shared/forms.ts';
export async function getPublishedForm(slug: string) {
  const { f, v } = await published(slug);
  return { version: v.version, body: publicDraft(v.body), ...(f.kind === 'worksheet' ? { requiresStudentName: true } : {}) };
}
