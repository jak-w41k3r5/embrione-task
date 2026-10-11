export interface WebpOptions {
  /** Images wider than this are scaled down (keeps phone photos light). */
  maxWidth?: number;
  /** 0-1, WebP quality. */
  quality?: number;
}

/**
 * Converts a PNG/JPG/JPEG (or any browser-readable image) to WebP entirely in the
 * browser: draw it on an HTML5 <canvas>, then canvas.toBlob(..., 'image/webp').
 */
export async function convertToWebp(
  file: File,
  { maxWidth = 800, quality = 0.8 }: WebpOptions = {},
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process images.');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );

    // Browsers that cannot encode WebP silently return a PNG instead.
    if (!blob || blob.type !== 'image/webp') {
      throw new Error(
        'Your browser could not encode WebP. Please try Chrome, Edge or Firefox.',
      );
    }
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image.'));
    img.src = src;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
