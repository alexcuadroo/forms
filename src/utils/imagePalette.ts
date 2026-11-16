type RGB = [number, number, number];
type Palette = { background: string; accent: string };

function hex(rgb: RGB) {
  return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function luminance(rgb: RGB) {
  const c = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

export function paletteFromPixels(pixels: Uint8ClampedArray): Palette | undefined {
  const buckets = new Map<number, { sum: RGB; weight: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const weight = pixels[i + 3] / 255;
    if (weight < 0.1) continue;
    const key = (pixels[i] >> 4) * 256 + (pixels[i + 1] >> 4) * 16 + (pixels[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0], weight: 0 };
    for (let c = 0; c < 3; c++) bucket.sum[c] += pixels[i + c] * weight;
    bucket.weight += weight;
    buckets.set(key, bucket);
  }
  const colors = [...buckets.values()].map(({ sum, weight }) => ({
    rgb: sum.map((v) => v / weight) as RGB,
    weight,
  })).sort((a, b) => b.weight - a.weight);
  const dominant = colors[0];
  if (!dominant) return undefined;

  // Favor a recognizable color without selecting isolated, colorful noise.
  const candidates = colors.filter((c) => c.weight >= dominant.weight * 0.1);
  const score = ({ rgb, weight }: typeof dominant) => {
    const saturation = (Math.max(...rgb) - Math.min(...rgb)) / Math.max(1, ...rgb);
    return Math.sqrt(weight) * (0.2 + saturation);
  };
  let accent = [...candidates.reduce((a, b) => score(b) > score(a) ? b : a).rgb] as RGB;
  // Keep at least 4.5:1 contrast with white button labels.
  while (luminance(accent) > 0.18) accent = accent.map((v) => v * 0.95) as RGB;
  return {
    background: hex(dominant.rgb.map((v) => v * 0.12 + 255 * 0.88) as RGB),
    accent: hex(accent),
  };
}

export async function imagePalette(file: File): Promise<Palette | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 64 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return paletteFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data);
  } finally {
    URL.revokeObjectURL(url);
  }
}
