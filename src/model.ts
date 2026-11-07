import type { Draft } from "../shared/forms.ts";
export type { Answers, Draft, Kind, Question as Q, Rule } from "../shared/forms.ts";

export type Form = {
  id: string;
  slug: string | null;
  draft: Draft;
  version: number;
  revision: number;
  closed: boolean;
};
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T = unknown>(
  url: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch("/api" + url, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) {
    if (data.login) location.assign(data.login);
    throw new ApiError(data.error || "Falló la conexión.", r.status);
  }
  return data;
}
export async function upload(url: string, file: File) {
  if (file.size > 10000000) throw Error("El archivo supera los 10 MB.");
  const r = await fetch("/api" + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data.id as string;
}
export const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Falló la operación.";
