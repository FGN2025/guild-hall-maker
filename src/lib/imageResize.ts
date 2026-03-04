export interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  maxSizeKB: number;
  /** Output format. Defaults to "image/webp", falls back to "image/jpeg" if unsupported. */
  format?: string;
}

const LOGO_PRESET: ResizeOptions = { maxWidth: 512, maxHeight: 512, maxSizeKB: 500 };
const HERO_PRESET: ResizeOptions = { maxWidth: 1920, maxHeight: 1080, maxSizeKB: 800 };

export { LOGO_PRESET, HERO_PRESET };

/**
 * Resize and compress an image file client-side using Canvas.
 * Returns a new File that fits within the given constraints.
 */
export async function resizeImageFile(
  file: File,
  opts: ResizeOptions
): Promise<File> {
  const { maxWidth, maxHeight, maxSizeKB } = opts;
  const preferredFormat = opts.format ?? "image/webp";

  const img = await loadImage(file);

  // Calculate scaled dimensions (preserve aspect ratio)
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Determine supported format
  const format = supportsFormat(canvas, preferredFormat) ? preferredFormat : "image/jpeg";
  const ext = format === "image/webp" ? "webp" : "jpg";

  // Quality reduction loop
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, format, quality);
  while (blob.size / 1024 > maxSizeKB && quality > 0.3) {
    quality -= 0.05;
    blob = await canvasToBlob(canvas, format, quality);
  }

  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([blob], name, { type: format });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      type,
      quality
    );
  });
}

function supportsFormat(canvas: HTMLCanvasElement, format: string): boolean {
  return canvas.toDataURL(format).startsWith(`data:${format}`);
}
