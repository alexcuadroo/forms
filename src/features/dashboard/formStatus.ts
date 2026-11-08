import type { Row } from "./types";
export const status = (row: Row) => !row.version ? "Borrador" : row.closed ? "Cerrado" : "Publicado";
