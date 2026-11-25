import { EngineError, type FitMode, type SupportedOutputMime } from './contracts';
import type { DecodedBitmap } from './decode';
import { computeDrawPlan } from './geometry';
import { renderToBlob } from './encode';
import type { CropRect } from './contracts';

export interface CompressOptions {
  targetWidth: number;
  targetHeight: number;
  format: SupportedOutputMime;
  fit: FitMode;
  crop?: CropRect;
  matteColor?: string;
  initialQuality?: number;
  qualityFloor?: number;
  maxBytes?: number;
  minBytes?: number;
  allowDownscale?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface CompressOutcome {
  blob: Blob;
  width: number;
  height: number;
  qualityUsed?: number;
  targetMet: boolean;
  trials: number;
  suggestions: string[];
}

export type EncodeTrialFn = (
  width: number,
  height: number,
  quality?: number
) => Promise<Blob>;

function checkAborted(signal?: AbortSignal, deadline?: number) {
  if (signal?.aborted) {
    throw new EngineError('CANCELLED', 'Image processing was cancelled.');
  }
  if (deadline !== undefined && Date.now() > deadline) {
    throw new EngineError('TARGET_UNREACHABLE', 'Processing exceeded the time budget.');
  }
}

function fitsByteBounds(size: number, maxBytes?: number, minBytes?: number): boolean {
  if (maxBytes !== undefined && size > maxBytes) return false;
  if (minBytes !== undefined && size < minBytes) return false;
  return true;
}

export async function searchCompressedCandidate(
  encodeTrial: EncodeTrialFn,
  options: CompressOptions
): Promise<CompressOutcome> {
  const {
    targetWidth,
    targetHeight,
    format,
    maxBytes,
    minBytes,
    initialQuality = 0.88,
    qualityFloor = 0.2,
    allowDownscale = false,
    signal,
    timeoutMs = 15_000,
  } = options;

  const deadline = Date.now() + timeoutMs;
  let trials = 0;

  if (maxBytes !== undefined && minBytes !== undefined && minBytes > maxBytes) {
    throw new EngineError(
      'TARGET_UNREACHABLE',
      'Minimum file size cannot exceed maximum file size.',
      ['Adjust the minimum or maximum byte bounds so they form a valid interval.']
    );
  }

  // No maxBytes target -> single encode at requested quality
  if (maxBytes === undefined) {
    checkAborted(signal, deadline);
    trials += 1;
    const blob = await encodeTrial(targetWidth, targetHeight, initialQuality);
    const targetMet = fitsByteBounds(blob.size, maxBytes, minBytes);
    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      ...(format !== 'image/png' ? { qualityUsed: initialQuality } : {}),
      targetMet,
      trials,
      suggestions: targetMet
        ? []
        : ['Output is smaller than the requested minimum size. Try PNG or higher quality.'],
    };
  }

  // Initial probe at chosen quality
  checkAborted(signal, deadline);
  trials += 1;
  const initialBlob = await encodeTrial(targetWidth, targetHeight, initialQuality);
  if (fitsByteBounds(initialBlob.size, maxBytes, minBytes)) {
    return {
      blob: initialBlob,
      width: targetWidth,
      height: targetHeight,
      ...(format !== 'image/png' ? { qualityUsed: initialQuality } : {}),
      targetMet: true,
      trials,
      suggestions: [],
    };
  }

  // Lossless PNG cannot tune quality
  if (format === 'image/png') {
    if (allowDownscale) {
      const scaled = await tryDownscaleSearch(
        encodeTrial,
        targetWidth,
        targetHeight,
        format,
        maxBytes,
        minBytes,
        initialQuality,
        initialQuality,
        signal,
        deadline
      );
      trials += scaled.trials;
      if (scaled.bestFeasible) {
        return {
          blob: scaled.bestFeasible.blob,
          width: scaled.bestFeasible.width,
          height: scaled.bestFeasible.height,
          targetMet: true,
          trials,
          suggestions: [],
        };
      }
    }

    return {
      blob: initialBlob,
      width: targetWidth,
      height: targetHeight,
      targetMet: false,
      trials,
      suggestions: [
        'PNG is lossless and ignores quality sliders. Switch output format to JPEG or WebP.',
        'Or allow downscaling to reduce pixel dimensions.',
      ],
    };
  }

  // Lossy format (JPEG / WebP): bounded binary search for highest quality <= maxBytes
  let low = Math.max(0.05, Math.min(qualityFloor, initialQuality));
  let high = initialQuality;
  let bestFeasible: { blob: Blob; quality: number } | undefined;
  let smallestSeen: { blob: Blob; quality: number } = {
    blob: initialBlob,
    quality: initialQuality,
  };

  // Probe the quality floor first to fail fast or establish feasibility
  checkAborted(signal, deadline);
  trials += 1;
  const floorBlob = await encodeTrial(targetWidth, targetHeight, low);
  if (floorBlob.size < smallestSeen.blob.size) {
    smallestSeen = { blob: floorBlob, quality: low };
  }
  if (fitsByteBounds(floorBlob.size, maxBytes, minBytes)) {
    bestFeasible = { blob: floorBlob, quality: low };
  }

  if (bestFeasible) {
    // Refine up to 9 binary-search steps between low and high
    for (let i = 0; i < 9; i++) {
      checkAborted(signal, deadline);
      if (high - low < 0.02) break;
      const mid = Math.round(((low + high) / 2) * 100) / 100;
      if (mid <= low || mid >= high) break;

      trials += 1;
      const candidate = await encodeTrial(targetWidth, targetHeight, mid);
      if (candidate.size < smallestSeen.blob.size) {
        smallestSeen = { blob: candidate, quality: mid };
      }

      if (candidate.size <= maxBytes) {
        if (
          fitsByteBounds(candidate.size, maxBytes, minBytes) &&
          (!bestFeasible || mid > bestFeasible.quality)
        ) {
          bestFeasible = { blob: candidate, quality: mid };
        }
        low = mid;
      } else {
        high = mid;
      }
    }

    if (bestFeasible) {
      return {
        blob: bestFeasible.blob,
        width: targetWidth,
        height: targetHeight,
        qualityUsed: bestFeasible.quality,
        targetMet: true,
        trials,
        suggestions: [],
      };
    }
  }

  // Could not meet target at requested dimensions. Try downscaling ONLY if explicitly allowed.
  if (allowDownscale) {
    const scaled = await tryDownscaleSearch(
      encodeTrial,
      targetWidth,
      targetHeight,
      format,
      maxBytes,
      minBytes,
      initialQuality,
      low,
      signal,
      deadline
    );
    trials += scaled.trials;
    if (scaled.bestFeasible) {
      return {
        blob: scaled.bestFeasible.blob,
        width: scaled.bestFeasible.width,
        height: scaled.bestFeasible.height,
        ...(scaled.bestFeasible.quality !== undefined
          ? { qualityUsed: scaled.bestFeasible.quality }
          : {}),
        targetMet: true,
        trials,
        suggestions: [],
      };
    }
  }

  const suggestions = [
    `Smallest achieved size at ${targetWidth}×${targetHeight} is ${smallestSeen.blob.size.toLocaleString()} bytes (target: ≤ ${maxBytes.toLocaleString()} bytes).`,
  ];
  if (!allowDownscale) {
    suggestions.push('Enable "Allow downscale if needed" to reduce pixel dimensions.');
  }
  if (qualityFloor > 0.25) {
    suggestions.push('Lower the quality floor or increase the target KB limit.');
  }
  if (format === 'image/jpeg') {
    suggestions.push('Try WebP format if the destination accepts it.');
  }

  return {
    blob: smallestSeen.blob,
    width: targetWidth,
    height: targetHeight,
    qualityUsed: smallestSeen.quality,
    targetMet: false,
    trials,
    suggestions,
  };
}

async function tryDownscaleSearch(
  encodeTrial: EncodeTrialFn,
  baseWidth: number,
  baseHeight: number,
  format: SupportedOutputMime,
  maxBytes: number,
  minBytes: number | undefined,
  initialQuality: number,
  qualityFloor: number,
  signal: AbortSignal | undefined,
  deadline: number
): Promise<{
  bestFeasible?: { blob: Blob; width: number; height: number; quality?: number };
  trials: number;
}> {
  const scales = [0.85, 0.7, 0.55, 0.4, 0.25];
  let trials = 0;

  for (const scale of scales) {
    checkAborted(signal, deadline);
    const w = Math.max(16, Math.round(baseWidth * scale));
    const h = Math.max(16, Math.round(baseHeight * scale));
    const q = format === 'image/png' ? undefined : Math.max(qualityFloor, initialQuality * 0.85);
    trials += 1;
    const blob = await encodeTrial(w, h, q);
    if (fitsByteBounds(blob.size, maxBytes, minBytes)) {
      return {
        bestFeasible: {
          blob,
          width: w,
          height: h,
          ...(q !== undefined ? { quality: q } : {}),
        },
        trials,
      };
    }
    if (format !== 'image/png') {
      trials += 1;
      const floorBlob = await encodeTrial(w, h, qualityFloor);
      if (fitsByteBounds(floorBlob.size, maxBytes, minBytes)) {
        return {
          bestFeasible: { blob: floorBlob, width: w, height: h, quality: qualityFloor },
          trials,
        };
      }
    }
  }

  return { trials };
}

export async function compressDecodedImage(
  decoded: DecodedBitmap,
  options: CompressOptions
): Promise<CompressOutcome> {
  const encodeTrial: EncodeTrialFn = async (width, height, quality) => {
    const plan = computeDrawPlan(
      decoded.width,
      decoded.height,
      width,
      height,
      options.fit,
      options.crop
    );
    return renderToBlob(decoded, plan, options.format, quality, options.matteColor);
  };

  return searchCompressedCandidate(encodeTrial, options);
}
