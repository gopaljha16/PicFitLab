import { DESKTOP_BUDGET, EngineError, type MemoryBudget } from './contracts';

export interface DecodedBitmap {
  width: number;
  height: number;
  source: ImageBitmap | HTMLImageElement;
  close: () => void;
}

export async function decodeImageBlob(
  blob: Blob,
  budget: MemoryBudget = DESKTOP_BUDGET
): Promise<DecodedBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
      });
      if (
        bitmap.width > budget.maxSidePx ||
        bitmap.height > budget.maxSidePx ||
        bitmap.width * bitmap.height > budget.maxMegapixels
      ) {
        bitmap.close();
        throw new EngineError(
          'PIXEL_LIMIT',
          `Decoded image (${bitmap.width}×${bitmap.height}) exceeds browser memory budget.`
        );
      }
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch (err) {
      if (err instanceof EngineError) throw err;
      // Fallback to HTMLImageElement if createImageBitmap options are unsupported
    }
  }

  if (typeof Image !== 'undefined' && typeof URL !== 'undefined') {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new EngineError('DECODE_FAILED', 'Could not decode image file.'));
        el.src = url;
      });
      if (
        img.naturalWidth > budget.maxSidePx ||
        img.naturalHeight > budget.maxSidePx ||
        img.naturalWidth * img.naturalHeight > budget.maxMegapixels
      ) {
        throw new EngineError(
          'PIXEL_LIMIT',
          `Decoded image (${img.naturalWidth}×${img.naturalHeight}) exceeds browser memory budget.`
        );
      }
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        source: img,
        close: () => {},
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  throw new EngineError('DECODE_FAILED', 'No supported image decoder is available in this environment.');
}
