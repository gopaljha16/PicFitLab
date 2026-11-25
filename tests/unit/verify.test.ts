import { describe, expect, it } from 'vitest';
import { verifyExportedBlob } from '@/engines/verify';
import type { ImageInspection } from '@/engines/contracts';

function makePngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes[11] = 13;
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  bytes[16] = (width >>> 24) & 0xff;
  bytes[17] = (width >>> 16) & 0xff;
  bytes[18] = (width >>> 8) & 0xff;
  bytes[19] = width & 0xff;
  bytes[20] = (height >>> 24) & 0xff;
  bytes[21] = (height >>> 16) & 0xff;
  bytes[22] = (height >>> 8) & 0xff;
  bytes[23] = height & 0xff;
  return bytes;
}

describe('verify engine', () => {
  it('produces pass/fail/unknown compliance checks for exported image', async () => {
    const outPng = makePngBytes(600, 600);
    const outBlob = new Blob([outPng.buffer as ArrayBuffer], { type: 'image/png' });
    const inputInspection: ImageInspection = {
      detectedMime: 'image/jpeg',
      extension: 'jpg',
      bytes: 200_000,
      width: 1200,
      height: 800,
      hasExif: true,
      hasGps: true,
    };

    const result = await verifyExportedBlob(
      outBlob,
      inputInspection,
      {
        format: 'image/png',
        fit: 'cover',
        width: 600,
        height: 600,
        maxBytes: 50_000,
      },
      600,
      600,
      true
    );

    expect(result.allPassed).toBe(true);
    expect(result.checks.find((c) => c.key === 'format')?.status).toBe('pass');
    expect(result.checks.find((c) => c.key === 'dimensions')?.status).toBe('pass');
    expect(result.checks.find((c) => c.key === 'maxBytes')?.status).toBe('pass');
    expect(result.checks.find((c) => c.key === 'metadata')?.status).toBe('pass');
    expect(result.checks.find((c) => c.key === 'acceptance')?.status).toBe('unknown');
  });
});
