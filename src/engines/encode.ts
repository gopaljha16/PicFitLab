import { EngineError, type SupportedOutputMime, type TransformOptions } from './contracts';
import type { DecodedBitmap } from './decode';
import type { DrawPlan } from './geometry';
import { detectMimeFromBytes } from './inspect';

export type PreparedCanvas = OffscreenCanvas | HTMLCanvasElement;

export function prepareCanvas(
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  matteColor = '#ffffff',
  transform?: TransformOptions
): PreparedCanvas {
  const { canvasWidth, canvasHeight } = plan;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new EngineError('ENCODER_UNAVAILABLE', '2D canvas context is unavailable.');
    }
    drawOntoContext(ctx, decoded, plan, format, matteColor, transform);
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
    drawOntoContext(ctx, decoded, plan, format, matteColor, transform);
    return canvas;
  }

  throw new EngineError('ENCODER_UNAVAILABLE', 'No canvas encoder is available in this environment.');
}

function applyCornerClip(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  w: number,
  h: number,
  cornerRadius: 'circle' | number
) {
  ctx.beginPath();
  if (cornerRadius === 'circle') {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const r = Math.max(0, Math.min(cornerRadius, w / 2, h / 2));
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, r);
    } else {
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
    }
  }
  ctx.closePath();
  ctx.clip();
}

function drawOntoContext(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  decoded: DecodedBitmap,
  plan: DrawPlan,
  format: SupportedOutputMime,
  matteColor: string,
  transform?: TransformOptions
) {
  ctx.save();

  if (transform?.cornerRadius !== undefined) {
    ctx.clearRect(0, 0, plan.canvasWidth, plan.canvasHeight);
    applyCornerClip(ctx, plan.canvasWidth, plan.canvasHeight, transform.cornerRadius);
  }

  if (format === 'image/jpeg') {
    ctx.fillStyle = matteColor;
    ctx.fillRect(0, 0, plan.canvasWidth, plan.canvasHeight);
  } else if (transform?.cornerRadius === undefined) {
    ctx.clearRect(0, 0, plan.canvasWidth, plan.canvasHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const rot = transform?.rotateDeg ?? 0;
  const flipH = transform?.flipH ? -1 : 1;
  const flipV = transform?.flipV ? -1 : 1;

  if (rot !== 0 || flipH !== 1 || flipV !== 1) {
    const swap = rot === 90 || rot === 270;
    const drawW = swap ? plan.dh : plan.dw;
    const drawH = swap ? plan.dw : plan.dh;
    ctx.translate(plan.canvasWidth / 2, plan.canvasHeight / 2);
    if (rot !== 0) {
      ctx.rotate((rot * Math.PI) / 180);
    }
    ctx.scale(flipH, flipV);
    ctx.drawImage(
      decoded.source,
      plan.sx,
      plan.sy,
      plan.sw,
      plan.sh,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
  } else {
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

  ctx.restore();
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
