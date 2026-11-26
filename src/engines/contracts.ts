export type SupportedOutputMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type FitMode = 'contain' | 'cover' | 'stretch';
export type JobStage =
  | 'idle'
  | 'validating'
  | 'decoding'
  | 'ready'
  | 'processing'
  | 'verifying'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

export type ErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_FILE'
  | 'TOO_LARGE'
  | 'PIXEL_LIMIT'
  | 'DECODE_FAILED'
  | 'ENCODER_UNAVAILABLE'
  | 'TARGET_UNREACHABLE'
  | 'OUT_OF_MEMORY'
  | 'CANCELLED'
  | 'EXPORT_FAILED';

export interface MemoryBudget {
  maxFileBytes: number;
  maxMegapixels: number;
  maxSidePx: number;
}

export const DESKTOP_BUDGET: MemoryBudget = {
  maxFileBytes: 20 * 1000 * 1000,
  maxMegapixels: 24_000_000,
  maxSidePx: 8192,
};

export const MOBILE_BUDGET: MemoryBudget = {
  maxFileBytes: 10 * 1000 * 1000,
  maxMegapixels: 12_000_000,
  maxSidePx: 4096,
};

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformOptions {
  rotateDeg?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  cornerRadius?: 'circle' | number;
}

export interface JobConstraints {
  width?: number;
  height?: number;
  aspectLock?: boolean;
  maxBytes?: number;
  minBytes?: number;
  format: SupportedOutputMime;
  fit: FitMode;
  quality?: number;
  qualityFloor?: number;
  allowDownscale?: boolean;
  matteColor?: string;
  crop?: CropRect;
  stripMetadata?: boolean;
  transform?: TransformOptions;
  pdfPageSize?: 'fit' | 'a4' | 'letter';
}

export interface ImageInspection {
  detectedMime: string;
  extension: string;
  bytes: number;
  width?: number;
  height?: number;
  orientation?: number;
  hasExif: boolean;
  hasGps: boolean;
  dpi?: { x: number; y: number; unit: 'inch' | 'cm' };
}

export interface ComplianceCheck {
  key: 'format' | 'dimensions' | 'maxBytes' | 'minBytes' | 'metadata' | 'acceptance';
  label: string;
  input: string;
  required: string;
  actual: string;
  status: 'pass' | 'fail' | 'unknown';
}

export interface JobRequest {
  jobId: string;
  input: File | Blob;
  inputName?: string;
  operation: 'compress' | 'resize' | 'convert' | 'fix' | 'inspect' | 'metadata' | 'pdf';
  constraints: JobConstraints;
  budget?: MemoryBudget;
  timeoutMs?: number;
}

export interface JobResult {
  jobId: string;
  stage: 'success' | 'partial' | 'failed' | 'cancelled';
  inspection?: ImageInspection;
  output?: Blob;
  actual?: {
    bytes: number;
    width: number;
    height: number;
    mime: string;
    hasExif: boolean;
    hasGps: boolean;
  };
  checks: ComplianceCheck[];
  errorCode?: ErrorCode;
  message?: string;
  suggestions?: string[];
  durationMs: number;
}

export class EngineError extends Error {
  readonly code: ErrorCode;
  readonly suggestions: string[];

  constructor(code: ErrorCode, message: string, suggestions: string[] = []) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.suggestions = suggestions;
  }
}

export function getExtensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
