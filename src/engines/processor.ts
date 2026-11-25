import {
  DESKTOP_BUDGET,
  EngineError,
  type JobRequest,
  type JobResult,
  type JobStage,
} from './contracts';
import { inspectImageBlob } from './inspect';
import { decodeImageBlob } from './decode';
import { resolveTargetDimensions } from './geometry';
import { compressDecodedImage } from './compress';
import { verifyExportedBlob } from './verify';

export type StageCallback = (stage: JobStage) => void;

export async function runImageJob(
  request: JobRequest,
  signal?: AbortSignal,
  onStage?: StageCallback
): Promise<JobResult> {
  const startedAt = Date.now();
  const budget = request.budget ?? DESKTOP_BUDGET;

  try {
    if (signal?.aborted) {
      throw new EngineError('CANCELLED', 'Job cancelled before start.');
    }

    onStage?.('validating');
    const inspection = await inspectImageBlob(request.input, request.inputName ?? '', budget);

    if (request.operation === 'inspect') {
      return {
        jobId: request.jobId,
        stage: 'success',
        inspection,
        checks: [
          {
            key: 'format',
            label: 'Detected format',
            input: inspection.extension || 'unknown',
            required: 'Valid image',
            actual: `${inspection.detectedMime} — pass`,
            status: 'pass',
          },
          {
            key: 'dimensions',
            label: 'Dimensions',
            input:
              inspection.width && inspection.height
                ? `${inspection.width}×${inspection.height}`
                : 'Unknown',
            required: 'Readable',
            actual:
              inspection.width && inspection.height
                ? `${inspection.width}×${inspection.height} — pass`
                : 'Unknown',
            status: inspection.width && inspection.height ? 'pass' : 'unknown',
          },
        ],
        durationMs: Date.now() - startedAt,
      };
    }

    onStage?.('decoding');
    const decoded = await decodeImageBlob(request.input, budget);

    try {
      if (signal?.aborted) {
        throw new EngineError('CANCELLED', 'Job cancelled after decode.');
      }

      onStage?.('processing');
      const sourceW = request.constraints.crop
        ? Math.round(request.constraints.crop.width)
        : decoded.width;
      const sourceH = request.constraints.crop
        ? Math.round(request.constraints.crop.height)
        : decoded.height;

      const target = resolveTargetDimensions(
        sourceW,
        sourceH,
        request.constraints.width,
        request.constraints.height,
        true
      );

      const outputMime =
        request.operation === 'metadata'
          ? (inspection.detectedMime as 'image/jpeg' | 'image/png' | 'image/webp')
          : request.constraints.format;

      const outcome = await compressDecodedImage(decoded, {
        targetWidth: target.width,
        targetHeight: target.height,
        format: outputMime,
        fit: request.constraints.fit,
        ...(request.constraints.crop ? { crop: request.constraints.crop } : {}),
        ...(request.constraints.matteColor ? { matteColor: request.constraints.matteColor } : {}),
        ...(request.constraints.quality !== undefined
          ? { initialQuality: request.constraints.quality }
          : {}),
        ...(request.constraints.qualityFloor !== undefined
          ? { qualityFloor: request.constraints.qualityFloor }
          : {}),
        ...(request.constraints.maxBytes !== undefined
          ? { maxBytes: request.constraints.maxBytes }
          : {}),
        ...(request.constraints.minBytes !== undefined
          ? { minBytes: request.constraints.minBytes }
          : {}),
        ...(request.constraints.allowDownscale !== undefined
          ? { allowDownscale: request.constraints.allowDownscale }
          : {}),
        ...(signal ? { signal } : {}),
        ...(request.timeoutMs !== undefined ? { timeoutMs: request.timeoutMs } : {}),
      });

      onStage?.('verifying');
      const verification = await verifyExportedBlob(
        outcome.blob,
        inspection,
        { ...request.constraints, format: outputMime },
        outcome.width,
        outcome.height,
        request.operation === 'metadata' || Boolean(request.constraints.stripMetadata)
      );

      const isSuccess = outcome.targetMet && verification.allPassed;

      return {
        jobId: request.jobId,
        stage: isSuccess ? 'success' : 'partial',
        inspection,
        output: outcome.blob,
        actual: verification.actual,
        checks: verification.checks,
        ...(isSuccess ? {} : { errorCode: 'TARGET_UNREACHABLE' }),
        ...(outcome.suggestions.length > 0 ? { suggestions: outcome.suggestions } : {}),
        durationMs: Date.now() - startedAt,
      };
    } finally {
      decoded.close();
    }
  } catch (err) {
    if (err instanceof EngineError) {
      return {
        jobId: request.jobId,
        stage: err.code === 'CANCELLED' ? 'cancelled' : 'failed',
        checks: [],
        errorCode: err.code,
        message: err.message,
        suggestions: err.suggestions,
        durationMs: Date.now() - startedAt,
      };
    }
    return {
      jobId: request.jobId,
      stage: 'failed',
      checks: [],
      errorCode: 'EXPORT_FAILED',
      message: 'An unexpected error occurred while processing the image in your browser.',
      durationMs: Date.now() - startedAt,
    };
  }
}
