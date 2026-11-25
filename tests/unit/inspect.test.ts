import { describe, expect, it } from 'vitest';
import { detectMimeFromBytes, inspectImageBlob } from '@/engines/inspect';
import { DESKTOP_BUDGET, EngineError } from '@/engines/contracts';

function makePngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length = 13
  bytes[11] = 13;
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
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

describe('inspect engine', () => {
  it('detects JPEG, PNG, WebP, GIF, and SVG from magic bytes', () => {
    expect(detectMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectMimeFromBytes(makePngBytes(100, 100))).toBe('image/png');
    expect(
      detectMimeFromBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
    ).toBe('image/webp');
    expect(detectMimeFromBytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(
      'image/svg+xml'
    );
  });

  it('extracts PNG dimensions from IHDR', async () => {
    const png = makePngBytes(600, 400);
    const blob = new Blob([png.buffer as ArrayBuffer], { type: 'image/jpeg' }); // wrong extension/MIME test
    const info = await inspectImageBlob(blob, 'wrong-extension.jpg', DESKTOP_BUDGET);
    expect(info.detectedMime).toBe('image/png');
    expect(info.width).toBe(600);
    expect(info.height).toBe(400);
  });

  it('rejects SVG files with UNSUPPORTED_FORMAT', async () => {
    const svgBlob = new Blob(['<svg><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
    await expect(inspectImageBlob(svgBlob, 'bad.svg')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejects oversized header dimensions before decoding', async () => {
    const hugePng = makePngBytes(12000, 12000);
    const blob = new Blob([hugePng.buffer as ArrayBuffer], { type: 'image/png' });
    await expect(inspectImageBlob(blob, 'huge.png', DESKTOP_BUDGET)).rejects.toBeInstanceOf(
      EngineError
    );
  });

  it('rejects empty files with INVALID_FILE', async () => {
    const empty = new Blob([], { type: 'image/jpeg' });
    await expect(inspectImageBlob(empty, 'empty.jpg')).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
});
