import type { Draft } from "../../models/forms";
import { useResource } from "../../hooks/useResource";
import { Runner } from "./Runner";
export function PublicForm({ slug }: { slug: string }) {
  const {
    data: v,
    failed,
    status,
    reload,
  } = useResource<{ body: Draft; version: number }>("/public/" + slug, 410);
  if (status === 410)
    return (
      <main className="runner runner-closed">
        <section>
          <h1>Este formulario ya no acepta respuestas</h1>
        </section>
      </main>
    );
  return v ? (
    <Runner
      key={`${slug}:${v.version}`}
      draft={v.body}
      slug={slug}
      version={v.version}
    />
  ) : (
    <main className="shell">
      {failed ? (
        <div className="empty">
          <h1>No pudimos abrir el formulario</h1>
          <p>Comprobá el enlace y tu conexión e intentá de nuevo.</p>
          <button onClick={reload}>Volver a cargar el formulario</button>
        </div>
      ) : (
        <p role="status">Cargando formulario…</p>
      )}
    </main>
  );
}
