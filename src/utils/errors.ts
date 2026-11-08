export const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Falló la operación.";
