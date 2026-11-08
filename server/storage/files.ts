import path from "node:path";
export const directory = path.resolve(process.env.UPLOAD_DIR || "uploads");
export const limit = 10_000_000;
export const types: Record<string, string[]> = {
  Imagen: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
  Video: ["video/mp4", "video/webm", "video/quicktime"],
  PDF: ["application/pdf"],
  Documento: [
    "text/plain",
    ...[
      "wordprocessingml.document",
      "spreadsheetml.sheet",
      "presentationml.presentation",
    ].map((t) => "application/vnd.openxmlformats-officedocument." + t),
    ...["text", "spreadsheet", "presentation"].map(
      (t) => "application/vnd.oasis.opendocument." + t,
    ),
  ],
};
