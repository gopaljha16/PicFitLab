import {
  DESKTOP_BUDGET,
  EngineError,
  type ImageInspection,
  type MemoryBudget,
} from './contracts';

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function matchesPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((b, idx) => bytes[idx] === b);
}

function readAscii(bytes: Uint8Array, start: number, len: number): string {
  let out = '';
  for (let i = 0; i < len && start + i < bytes.length; i++) {
    out += String.fromCharCode(bytes[start + i]!);
  }
  return out;
}

export function detectMimeFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (matchesPrefix(bytes, PNG_SIG)) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === 'RIFF' &&
    readAscii(bytes, 8, 4) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 6 &&
    (readAscii(bytes, 0, 6) === 'GIF87a' || readAscii(bytes, 0, 6) === 'GIF89a')
  ) {
    return 'image/gif';
  }
  const headText = readAscii(bytes, 0, Math.min(bytes.length, 256)).trimStart().toLowerCase();
  if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
    return 'image/svg+xml';
  }
  return 'application/octet-stream';
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function parsePngHeader(bytes: Uint8Array): {
  width?: number;
  height?: number;
  dpi?: { x: number; y: number; unit: 'inch' | 'cm' };
  hasExif: boolean;
} {
  let width: number | undefined;
  let height: number | undefined;
  let dpi: { x: number; y: number; unit: 'inch' | 'cm' } | undefined;
  let hasExif = false;

  if (bytes.length >= 24 && readAscii(bytes, 12, 4) === 'IHDR') {
    width = readUint32BE(bytes, 16);
    height = readUint32BE(bytes, 20);
  }

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = readAscii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    if (type === 'pHYs' && length === 9 && dataStart + 9 <= bytes.length) {
      const ppuX = readUint32BE(bytes, dataStart);
      const ppuY = readUint32BE(bytes, dataStart + 4);
      const unitSpecifier = bytes[dataStart + 8];
      if (unitSpecifier === 1 && ppuX > 0 && ppuY > 0) {
        dpi = {
          x: Math.round(ppuX * 0.0254),
          y: Math.round(ppuY * 0.0254),
          unit: 'inch',
        };
      }
    } else if (type === 'eXIf' || type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
      hasExif = true;
    }
    if (type === 'IEND') break;
    const next = offset + 12 + length;
    if (next <= offset) break;
    offset = next;
  }

  return {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(dpi !== undefined ? { dpi } : {}),
    hasExif,
  };
}

function parseTiffExif(
  bytes: Uint8Array,
  tiffStart: number
): { orientation?: number; hasGps: boolean } {
  if (tiffStart + 8 > bytes.length) return { hasGps: false };
  const endian = readAscii(bytes, tiffStart, 2);
  const le = endian === 'II';
  if (!le && endian !== 'MM') return { hasGps: false };

  const u16 = (off: number) => (le ? readUint16LE(bytes, off) : readUint16BE(bytes, off));
  const u32 = (off: number) => (le ? readUint32LE(bytes, off) : readUint32BE(bytes, off));

  const ifd0Offset = u32(tiffStart + 4);
  const ifd0Abs = tiffStart + ifd0Offset;
  if (ifd0Abs + 2 > bytes.length) return { hasGps: false };

  const entryCount = u16(ifd0Abs);
  let orientation: number | undefined;
  let hasGps = false;

  for (let i = 0; i < entryCount; i++) {
    const entry = ifd0Abs + 2 + i * 12;
    if (entry + 12 > bytes.length) break;
    const tag = u16(entry);
    if (tag === 0x0112) {
      orientation = u16(entry + 8);
    } else if (tag === 0x8825) {
      hasGps = true;
    }
  }

  return {
    ...(orientation !== undefined ? { orientation } : {}),
    hasGps,
  };
}

function parseJpegHeader(bytes: Uint8Array): {
  width?: number;
  height?: number;
  orientation?: number;
  hasExif: boolean;
  hasGps: boolean;
  dpi?: { x: number; y: number; unit: 'inch' | 'cm' };
} {
  let offset = 2;
  let width: number | undefined;
  let height: number | undefined;
  let orientation: number | undefined;
  let hasExif = false;
  let hasGps = false;
  let dpi: { x: number; y: number; unit: 'inch' | 'cm' } | undefined;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1]!;
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }

    const segLen = readUint16BE(bytes, offset + 2);
    if (segLen < 2 || offset + 2 + segLen > bytes.length) break;
    const dataStart = offset + 4;

    // APP0 JFIF
    if (marker === 0xe0 && segLen >= 14 && readAscii(bytes, dataStart, 5) === 'JFIF\0') {
      const units = bytes[dataStart + 7];
      const xDensity = readUint16BE(bytes, dataStart + 8);
      const yDensity = readUint16BE(bytes, dataStart + 10);
      if ((units === 1 || units === 2) && xDensity > 0 && yDensity > 0) {
        dpi = { x: xDensity, y: yDensity, unit: units === 1 ? 'inch' : 'cm' };
      }
    }

    // APP1 EXIF
    if (marker === 0xe1 && segLen >= 10 && readAscii(bytes, dataStart, 6) === 'Exif\0\0') {
      hasExif = true;
      const tiffInfo = parseTiffExif(bytes, dataStart + 6);
      if (tiffInfo.orientation !== undefined) orientation = tiffInfo.orientation;
      if (tiffInfo.hasGps) hasGps = true;
    }

    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (segLen >= 7) {
        height = readUint16BE(bytes, dataStart + 1);
        width = readUint16BE(bytes, dataStart + 3);
      }
    }

    offset += 2 + segLen;
  }

  return {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(orientation !== undefined ? { orientation } : {}),
    hasExif,
    hasGps,
    ...(dpi !== undefined ? { dpi } : {}),
  };
}

function parseWebpHeader(bytes: Uint8Array): { width?: number; height?: number; hasExif: boolean } {
  if (bytes.length < 30) return { hasExif: false };
  const chunk = readAscii(bytes, 12, 4);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const flags = bytes[20] ?? 0;
    const width = 1 + ((bytes[24] ?? 0) | ((bytes[25] ?? 0) << 8) | ((bytes[26] ?? 0) << 16));
    const height = 1 + ((bytes[27] ?? 0) | ((bytes[28] ?? 0) << 8) | ((bytes[29] ?? 0) << 16));
    return { width, height, hasExif: (flags & 0x08) !== 0 };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    const width = readUint16LE(bytes, 26) & 0x3fff;
    const height = readUint16LE(bytes, 28) & 0x3fff;
    return { width, height, hasExif: false };
  }
  if (chunk === 'VP8L' && bytes.length >= 25) {
    const bits = readUint32LE(bytes, 21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height, hasExif: false };
  }
  return { hasExif: false };
}

export async function inspectImageBlob(
  blob: Blob,
  fileName = '',
  budget: MemoryBudget = DESKTOP_BUDGET
): Promise<ImageInspection> {
  if (blob.size === 0) {
    throw new EngineError('INVALID_FILE', 'The selected file is empty.');
  }
  if (blob.size > budget.maxFileBytes) {
    throw new EngineError(
      'TOO_LARGE',
      `File size (${(blob.size / 1_000_000).toFixed(2)} MB) exceeds the ${(budget.maxFileBytes / 1_000_000).toFixed(0)} MB browser safety limit.`,
      ['Use a smaller source image or try on a desktop browser with higher memory limits.']
    );
  }

  // Read up to 256 KB for bounded header inspection (EXIF + SOF + IHDR)
  const headerSlice = blob.slice(0, Math.min(blob.size, 262_144));
  const bytes = new Uint8Array(await headerSlice.arrayBuffer());
  const detectedMime = detectMimeFromBytes(bytes);

  const extMatch = /\.([a-z0-9]+)$/i.exec(fileName);
  const extension = extMatch ? extMatch[1]!.toLowerCase() : '';

  if (detectedMime === 'image/svg+xml') {
    throw new EngineError(
      'UNSUPPORTED_FORMAT',
      'SVG files are not supported because they can contain active scripts or external references.',
      ['Export the graphic as PNG or JPEG first, then process it here.']
    );
  }

  if (detectedMime !== 'image/jpeg' && detectedMime !== 'image/png' && detectedMime !== 'image/webp') {
    throw new EngineError(
      'UNSUPPORTED_FORMAT',
      'Unsupported or unrecognized image file. Supported formats: JPG, PNG, and WebP.',
      ['Verify the file is not corrupted and is saved as JPG, PNG, or WebP.']
    );
  }

  let width: number | undefined;
  let height: number | undefined;
  let orientation: number | undefined;
  let hasExif = false;
  let hasGps = false;
  let dpi: { x: number; y: number; unit: 'inch' | 'cm' } | undefined;

  if (detectedMime === 'image/png') {
    const info = parsePngHeader(bytes);
    width = info.width;
    height = info.height;
    hasExif = info.hasExif;
    dpi = info.dpi;
  } else if (detectedMime === 'image/jpeg') {
    const info = parseJpegHeader(bytes);
    width = info.width;
    height = info.height;
    orientation = info.orientation;
    hasExif = info.hasExif;
    hasGps = info.hasGps;
    dpi = info.dpi;
  } else if (detectedMime === 'image/webp') {
    const info = parseWebpHeader(bytes);
    width = info.width;
    height = info.height;
    hasExif = info.hasExif;
  }

  if (width !== undefined && height !== undefined) {
    if (width <= 0 || height <= 0) {
      throw new EngineError('INVALID_FILE', 'Image header reports invalid zero dimensions.');
    }
    if (width > budget.maxSidePx || height > budget.maxSidePx) {
      throw new EngineError(
        'PIXEL_LIMIT',
        `Image side (${width}×${height}) exceeds the ${budget.maxSidePx} px browser limit.`,
        ['Resize the image below 8,192 px per side before processing.']
      );
    }
    if (width * height > budget.maxMegapixels) {
      throw new EngineError(
        'PIXEL_LIMIT',
        `Image resolution (${((width * height) / 1_000_000).toFixed(1)} MP) exceeds the ${(budget.maxMegapixels / 1_000_000).toFixed(0)} MP safety limit.`,
        ['Use a lower-resolution image to prevent browser out-of-memory crashes.']
      );
    }
  }

  return {
    detectedMime,
    extension,
    bytes: blob.size,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(orientation !== undefined ? { orientation } : {}),
    hasExif,
    hasGps,
    ...(dpi !== undefined ? { dpi } : {}),
  };
}
