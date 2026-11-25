import { EngineError, type SupportedOutputMime } from './contracts';
import type { DecodedBitmap } from './decode';
import type { DrawPlan } from './geometry';
import { detectMimeFromBytes } from './inspect';

export type PreparedCanvas = OffscreenCanvas | HTMLCanvasElement;

export function prepareCanvas(
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  matteColor = '#ffffff'
): PreparedCanvas {
  const { canvasWidth, canvasHeight } = plan;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EngineError('ENCODER_UNAVAILABLE', '2D canvas context is unavailable.');
    }
    drawOntoContext(ctx, decoded, plan, format, matteColor);
    return canvas;
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EngineError('ENCODER_UNAVAILABLE', '2D canvas context is unavailable.');
    }
    drawOntoContext(ctx, decoded, plan, format, matteColor);
    return canvas;
  }

  throw new EngineError('ENCODER_UNAVAILABLE', 'No canvas encoder is available in this environment.');
}

function drawOntoContext(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  matteColor: string
) {
  if (format === 'image/jpeg') {
    ctx.fillStyle = matteColor;
    ctx.fillRect(0, 0, plan.canvasWidth, plan.canvasHeight);
  } else {
    ctx.clearRect(0, 0, plan.canvasWidth, plan.canvasHeight);
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
}

export async function encodePreparedCanvas(
  canvas: PreparedCanvas,
  format: SupportedOutputMime,
  quality?: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({
      type: format,
      ...(format !== 'image/png' && quality !== undefined ? { quality } : {}),
    });
    return verifyEncodedFormat(blob, format);
  }

  const htmlCanvas = canvas as HTMLCanvasElement;
  const blob = await new Promise<Blob>((resolve, reject) => {
    htmlCanvas.toBlob(
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

export async function renderToBlob(
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  quality?: number,
  matteColor = '#ffffff'
): Promise<Blob> {
  const canvas = prepareCanvas(decoded, plan, format, matteColor);
  return encodePreparedCanvas(canvas, format, quality);
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
