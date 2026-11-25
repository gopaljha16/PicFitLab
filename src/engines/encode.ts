import { EngineError, type SupportedOutputMime } from './contracts';
import type { DecodedBitmap } from './decode';
import type { DrawPlan } from './geometry';
import { detectMimeFromBytes } from './inspect';

export async function renderToBlob(
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  quality?: number,
  matteColor = '#ffffff'
): Promise<Blob> {
  const { canvasWidth, canvasHeight } = plan;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EngineError('ENCODER_UNAVAILABLE', '2D canvas context is unavailable.');
    }
    if (format === 'image/jpeg') {
      ctx.fillStyle = matteColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      decoded.source,
      plan.sx,
      plan.sy,
      plan.sw,
      plan.sh,
      plan.dx,
      plan.dy,
      plan.dw,
      plan.dh
    );

    const blob = await canvas.convertToBlob({
      type: format,
      ...(format !== 'image/png' && quality !== undefined ? { quality } : {}),
    });
    return verifyEncodedFormat(blob, format);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EngineError('ENCODER_UNAVAILABLE', '2D canvas context is unavailable.');
    }
    if (format === 'image/jpeg') {
      ctx.fillStyle = matteColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      decoded.source,
      plan.sx,
      plan.sy,
      plan.sw,
      plan.sh,
      plan.dx,
      plan.dy,
      plan.dw,
      plan.dh
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new EngineError('EXPORT_FAILED', 'Canvas failed to export image blob.'));
            return;
          }
          resolve(result);
        },
        format,
        format !== 'image/png' ? quality : undefined
      );
    });
    return verifyEncodedFormat(blob, format);
  }

  throw new EngineError('ENCODER_UNAVAILABLE', 'No canvas encoder is available in this environment.');
}

async function verifyEncodedFormat(blob: Blob, expectedMime: SupportedOutputMime): Promise<Blob> {
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const actualMime = detectMimeFromBytes(head);
  if (actualMime !== expectedMime) {
    throw new EngineError(
      'ENCODER_UNAVAILABLE',
      `Browser encoder returned ${actualMime} instead of requested ${expectedMime}.`,
      ['Try JPEG or PNG output in this browser.']
    );
  }
  return blob;
}
