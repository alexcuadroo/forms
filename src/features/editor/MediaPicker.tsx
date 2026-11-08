import { ImagePlus } from "lucide-react";
export function MediaPicker({ bg, id, asset, remove }: { bg: boolean; id: string; asset: (file: File | undefined, background: boolean) => Promise<void>; remove: () => void }) {
 return (
    <div>
      {id && (
        <img
          className="thumb"
          src={"/api/admin/files/" + id}
          alt="Imagen seleccionada"
        />
      )}
      <label className="upload">
        <ImagePlus size={18} />
        {bg ? "Imagen de fondo" : "Imagen o GIF"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          onChange={(e) => void asset(e.target.files?.[0], bg)}
        />
      </label>
      {id && (
        <button
          onClick={remove}
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
}
