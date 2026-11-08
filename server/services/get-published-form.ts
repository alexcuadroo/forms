import { published } from "../repositories/forms.ts";
export async function getPublishedForm(slug: string) {
  const { v } = await published(slug);
  return (v);
}
