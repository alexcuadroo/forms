import { useState } from "react";
import { FileText, ExternalLink, Eye, Download } from "lucide-react";
export type ResultFile = { id: string; name: string; mime: string; bytes: number };
export function Attachment({ file }: { file: ResultFile }) {
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = "/api/admin/files/" + encodeURIComponent(file.id);
  const image = file.mime.startsWith("image/");
  const video = file.mime.startsWith("video/");
  const document = file.mime === "application/pdf" || file.mime === "text/plain";
  const canPreview = image || video || document;
  return <div className="attachment">
    <div className="attachment-heading">
      <FileText aria-hidden="true" />
      <div className="attachment-info"><strong>{file.name}</strong><span>{file.mime.split("/").pop()} · {new Intl.NumberFormat("es-UY", { maximumFractionDigits: 1 }).format(file.bytes / 1024)} KB</span></div>
      <div className="actions">
        {canPreview && <button aria-expanded={preview} onClick={() => setPreview(!preview)}><Eye />{preview ? "Ocultar" : "Vista previa"}</button>}
        {canPreview && <a className="file-action" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Abrir</a>}
        <a className="file-action" href={url + "?download=1"}><Download />Descargar</a>
      </div>
    </div>
    {!canPreview && <p className="attachment-note">Este formato no tiene vista previa. Descargalo para abrirlo.</p>}
    {preview && <div className="attachment-preview">
      {failed ? <p role="status">No se pudo mostrar el archivo. Probá abrirlo en otra pestaña o descargarlo.</p> : image ? <img src={url} alt={file.name} onError={() => setFailed(true)} /> : video ? <video controls preload="metadata" src={url} onError={() => setFailed(true)} /> : <iframe title={"Vista previa de " + file.name} src={url} />}
      {document && <p className="attachment-note">Si tu navegador no muestra el documento, usá Abrir o Descargar.</p>}
    </div>}
  </div>;
}
