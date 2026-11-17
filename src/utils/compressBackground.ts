const MAX_EDGE = 1920;
const MAX_BYTES = 250_000;

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo comprimir la imagen. Probá con otra."));
    }, type, quality);
  });
}

/** Backgrounds are stored as a single optimized frame, including animated inputs. */
export async function compressBackground(file: File): Promise<File> {
  if (!file.size || file.size > 10_000_000)
    throw new Error("La imagen debe tener entre 1 byte y 10 MB.");
  const url = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("No se pudo leer la imagen. Probá con otra.");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no permite optimizar esta imagen.");
    let scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    let type = "image/webp";
    // Bound both encoding work and the final payload, even for noisy photographs.
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.imageSmoothingQuality = "high";
      if (type === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.68, 0.54]) {
        let blob = await encode(canvas, type, quality);
        // Unsupported canvas encoders silently return PNG (notably WebP on Safari).
        if (type === "image/webp" && blob.type !== type) {
          type = "image/jpeg";
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await encode(canvas, type, quality);
        }
        if (blob.type !== type)
          throw new Error("Tu navegador no permite optimizar esta imagen.");
        if (blob.size <= MAX_BYTES) {
          // Keep an already smaller static JPEG without introducing generation loss.
          if (file.type === "image/jpeg" && scale === 1 && file.size <= blob.size)
            return file;
          const extension = type === "image/webp" ? "webp" : "jpg";
          return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "fondo"}.${extension}`, {
            type: blob.type,
            lastModified: file.lastModified,
          });
        }
      }
      scale *= 0.75;
    }
    throw new Error("No se pudo reducir el fondo a 250 KB. Probá con otra imagen.");
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
