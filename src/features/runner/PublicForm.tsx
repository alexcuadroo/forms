import type { Draft } from "../../models/forms";
import { useResource } from "../../hooks/useResource";
import { Runner } from "./Runner";
export function PublicForm({ slug }: { slug: string }) {
  const { data: v, failed, status, reload } = useResource<{ body: Draft; version: number }>("/public/" + slug, 410);
  if (status === 410) return (
    <main className="runner runner-closed">
      <section>
        <h1>Este formulario ya no acepta respuestas</h1>
      </section>
    </main>
  );
  return v ? (
    <Runner draft={v.body} slug={slug} version={v.version} />
  ) : (
    <main className="shell">
      {failed ? <button onClick={reload}>Volver a cargar el formulario</button> : <p>Cargando formulario…</p>}
    </main>
  );
}
