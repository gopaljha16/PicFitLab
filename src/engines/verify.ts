import type { ComplianceCheck, ImageInspection, JobConstraints } from './contracts';
import { inspectImageBlob } from './inspect';

export interface VerificationOutput {
  actual: {
    bytes: number;
    width: number;
    height: number;
    mime: string;
    hasExif: boolean;
    hasGps: boolean;
  };
  checks: ComplianceCheck[];
  allPassed: boolean;
}

function formatMimeLabel(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'JPEG';
    case 'image/png':
      return 'PNG';
    case 'image/webp':
      return 'WebP';
    default:
      return mime;
  }
}

export async function verifyExportedBlob(
  outputBlob: Blob,
  inputInspection: ImageInspection,
  constraints: JobConstraints,
  expectedWidth: number,
  expectedHeight: number,
  stripMetadataRequested = false
): Promise<VerificationOutput> {
  const outInfo = await inspectImageBlob(outputBlob, 'output');
  const actualWidth = outInfo.width ?? expectedWidth;
  const actualHeight = outInfo.height ?? expectedHeight;

  const checks: ComplianceCheck[] = [];

  // Format check
  const formatPass = outInfo.detectedMime === constraints.format;
  checks.push({
    key: 'format',
    label: 'Format',
    input: formatMimeLabel(inputInspection.detectedMime),
    required: formatMimeLabel(constraints.format),
    actual: `${formatMimeLabel(outInfo.detectedMime)} — ${formatPass ? 'pass' : 'fail'}`,
    status: formatPass ? 'pass' : 'fail',
  });

  // Dimensions check
  const dimRequired =
    constraints.width && constraints.height
      ? `${constraints.width}×${constraints.height}`
      : `${expectedWidth}×${expectedHeight}`;
  const dimPass =
    (!constraints.width || actualWidth === constraints.width) &&
    (!constraints.height || actualHeight === constraints.height);

  checks.push({
    key: 'dimensions',
    label: 'Dimensions',
    input:
      inputInspection.width && inputInspection.height
        ? `${inputInspection.width}×${inputInspection.height}`
        : 'Unknown',
    required: dimRequired,
    actual: `${actualWidth}×${actualHeight} — ${dimPass ? 'pass' : 'fail'}`,
    status: dimPass ? 'pass' : 'fail',
  });

  // File size max check
  if (constraints.maxBytes !== undefined) {
    const maxPass = outInfo.bytes <= constraints.maxBytes;
    checks.push({
      key: 'maxBytes',
      label: 'File size (max)',
      input: `${inputInspection.bytes.toLocaleString()} B`,
      required: `≤ ${constraints.maxBytes.toLocaleString()} B`,
      actual: `${outInfo.bytes.toLocaleString()} B — ${maxPass ? 'pass' : 'fail'}`,
      status: maxPass ? 'pass' : 'fail',
    });
  } else {
    checks.push({
      key: 'maxBytes',
      label: 'File size',
      input: `${inputInspection.bytes.toLocaleString()} B`,
      required: 'No cap',
      actual: `${outInfo.bytes.toLocaleString()} B — pass`,
      status: 'pass',
    });
  }

  // Metadata check if requested
  if (stripMetadataRequested) {
    const clean = !outInfo.hasExif && !outInfo.hasGps;
    checks.push({
      key: 'metadata',
      label: 'EXIF / GPS tags',
      input: inputInspection.hasGps
        ? 'GPS + EXIF present'
        : inputInspection.hasExif
          ? 'EXIF present'
          : 'None detected',
      required: 'Removed',
      actual: clean ? 'None detected — pass' : 'Metadata still present — fail',
      status: clean ? 'pass' : 'fail',
    });
  }

  // Honest official acceptance disclosure
  checks.push({
    key: 'acceptance',
    label: 'Official acceptance',
    input: 'Unknown',
    required: 'Varies by portal',
    actual: 'Not verified (technical checks only)',
    status: 'unknown',
  });

  const allPassed = checks.every((c) => c.status !== 'fail');

  return {
    actual: {
      bytes: outInfo.bytes,
      width: actualWidth,
      height: actualHeight,
      mime: outInfo.detectedMime,
      hasExif: outInfo.hasExif,
      hasGps: outInfo.hasGps,
    },
    checks,
    allPassed,
  };
}
