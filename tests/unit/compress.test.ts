import { describe, expect, it } from 'vitest';
import { searchCompressedCandidate, type EncodeTrialFn } from '@/engines/compress';

function mockEncoder(sizeFn: (w: number, h: number, q?: number) => number): EncodeTrialFn {
  return async (w, h, q) => {
    const bytes = sizeFn(w, h, q);
    return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
  };
}

describe('compress search engine', () => {
  it('finds highest quality within maxBytes cap', async () => {
    const encode = mockEncoder((_w, _h, q = 0.85) => Math.round(q * 100_000));
    const outcome = await searchCompressedCandidate(encode, {
      targetWidth: 800,
      targetHeight: 600,
      format: 'image/jpeg',
      fit: 'contain',
      maxBytes: 50_000,
      initialQuality: 0.9,
      qualityFloor: 0.2,
    });

    expect(outcome.targetMet).toBe(true);
    expect(outcome.blob.size).toBeLessThanOrEqual(50_000);
    expect(outcome.qualityUsed).toBeGreaterThanOrEqual(0.45);
    expect(outcome.trials).toBeLessThanOrEqual(12);
  });

  it('reports conflict and suggestions when fixed dimensions prevent target', async () => {
    const encode = mockEncoder((_w, _h, q = 0.85) => Math.round(60_000 + q * 40_000));
    const outcome = await searchCompressedCandidate(encode, {
      targetWidth: 1000,
      targetHeight: 1000,
      format: 'image/jpeg',
      fit: 'contain',
      maxBytes: 50_000,
      allowDownscale: false,
    });

    expect(outcome.targetMet).toBe(false);
    expect(outcome.suggestions.length).toBeGreaterThan(0);
    expect(outcome.width).toBe(1000);
    expect(outcome.height).toBe(1000);
  });

  it('downscales when explicitly allowed and quality alone is insufficient', async () => {
    const encode = mockEncoder((w, _h, q = 0.85) => Math.round((w / 1000) * (60_000 + q * 40_000)));
    const outcome = await searchCompressedCandidate(encode, {
      targetWidth: 1000,
      targetHeight: 1000,
      format: 'image/jpeg',
      fit: 'contain',
      maxBytes: 50_000,
      allowDownscale: true,
    });

    expect(outcome.targetMet).toBe(true);
    expect(outcome.blob.size).toBeLessThanOrEqual(50_000);
    expect(outcome.width).toBeLessThan(1000);
  });

  it('handles cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();
    const encode = mockEncoder(() => 10_000);

    await expect(
      searchCompressedCandidate(encode, {
        targetWidth: 400,
        targetHeight: 400,
        format: 'image/jpeg',
        fit: 'contain',
        maxBytes: 50_000,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
