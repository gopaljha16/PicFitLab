import type { CropRect, FitMode } from './contracts';

export interface TargetDimensions {
  width: number;
  height: number;
}

export interface DrawPlan {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function resolveTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  requestedWidth?: number,
  requestedHeight?: number,
  aspectLock = true
): TargetDimensions {
  if (!requestedWidth && !requestedHeight) {
    return { width: sourceWidth, height: sourceHeight };
  }

  if (requestedWidth && requestedHeight) {
    return {
      width: Math.max(1, Math.round(requestedWidth)),
      height: Math.max(1, Math.round(requestedHeight)),
    };
  }

  const ratio = sourceWidth / sourceHeight;
  if (requestedWidth) {
    const w = Math.max(1, Math.round(requestedWidth));
    const h = aspectLock ? Math.max(1, Math.round(w / ratio)) : sourceHeight;
    return { width: w, height: h };
  }

  const h = Math.max(1, Math.round(requestedHeight!));
  const w = aspectLock ? Math.max(1, Math.round(h * ratio)) : sourceWidth;
  return { width: w, height: h };
}

export function computeDrawPlan(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: FitMode,
  crop?: CropRect
): DrawPlan {
  const sxBase = crop ? Math.max(0, Math.min(sourceWidth - 1, Math.round(crop.x))) : 0;
  const syBase = crop ? Math.max(0, Math.min(sourceHeight - 1, Math.round(crop.y))) : 0;
  const swBase = crop
    ? Math.max(1, Math.min(sourceWidth - sxBase, Math.round(crop.width)))
    : sourceWidth;
  const shBase = crop
    ? Math.max(1, Math.min(sourceHeight - syBase, Math.round(crop.height)))
    : sourceHeight;

  if (fit === 'stretch') {
    return {
      sx: sxBase,
      sy: syBase,
      sw: swBase,
      sh: shBase,
      dx: 0,
      dy: 0,
      dw: targetWidth,
      dh: targetHeight,
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
    };
  }

  const srcRatio = swBase / shBase;
  const dstRatio = targetWidth / targetHeight;

  if (fit === 'cover') {
    let sx = sxBase;
    let sy = syBase;
    let sw = swBase;
    let sh = shBase;

    if (srcRatio > dstRatio) {
      sw = Math.max(1, Math.round(shBase * dstRatio));
      sx = sxBase + Math.round((swBase - sw) / 2);
    } else if (srcRatio < dstRatio) {
      sh = Math.max(1, Math.round(swBase / dstRatio));
      sy = syBase + Math.round((shBase - sh) / 2);
    }

    return {
      sx,
      sy,
      sw,
      sh,
      dx: 0,
      dy: 0,
      dw: targetWidth,
      dh: targetHeight,
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
    };
  }

  // contain
  let dw = targetWidth;
  let dh = targetHeight;
  if (srcRatio > dstRatio) {
    dh = Math.max(1, Math.round(targetWidth / srcRatio));
  } else {
    dw = Math.max(1, Math.round(targetHeight * srcRatio));
  }
  const dx = Math.round((targetWidth - dw) / 2);
  const dy = Math.round((targetHeight - dh) / 2);

  return {
    sx: sxBase,
    sy: syBase,
    sw: swBase,
    sh: shBase,
    dx,
    dy,
    dw,
    dh,
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
  };
}

export function physicalToPixels(value: number, unit: 'cm' | 'in', ppi: number): number {
  const inches = unit === 'cm' ? value / 2.54 : value;
  return Math.max(1, Math.round(inches * ppi));
}
