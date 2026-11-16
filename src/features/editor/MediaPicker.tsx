import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { LoadingSpinner } from "../../components/LoadingSpinner";
export function MediaPicker({ bg, id, asset, remove }: { bg: boolean; id: string; asset: (file: File | undefined, background: boolean) => Promise<void>; remove: () => void }) {
 const helpId = useId();
 const [uploading, setUploading] = useState(false);
 const [filename, setFilename] = useState("");
 return (
    <div className="media-picker">
      {id && (
        <img
          className="thumb"
          src={"/api/admin/files/" + id}
          alt="Imagen seleccionada"
        />
      )}
      <label className="upload" aria-busy={uploading}>
        {uploading ? <LoadingSpinner label="Subiendo imagen" /> : <ImagePlus size={20} aria-hidden="true" />}
        <span>{uploading ? "Subiendo imagen…" : id ? "Cambiar imagen" : bg ? "Subir imagen de fondo" : "Añadir imagen o GIF"}</span>
        <input
          type="file"
          disabled={uploading}
          aria-describedby={helpId}
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            setFilename(file.name);
            setUploading(true);
            try { await asset(file, bg); }
            finally { setUploading(false); }
          }}
        />
      </label>
      <p id={helpId} className="field-hint">JPG, PNG, GIF, WebP o AVIF · Máx. 10 MB</p>
      <div role="status" className="upload-status">{uploading ? `Subiendo ${filename}. Esperá a que termine para continuar.` : ""}</div>
      {id && (
        <button
          type="button"
          className="remove-image"
          disabled={uploading}
          onClick={remove}
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
}
