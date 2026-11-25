export type ToolCategory = 'compress' | 'resize' | 'convert' | 'fix' | 'privacy';
export type ToolEngine = 'compress' | 'resize' | 'convert' | 'fix' | 'inspect' | 'metadata';
export type ToolStatus = 'draft' | 'beta' | 'published' | 'retired';
export type ToolSensitivity = 'general' | 'sensitive';

export interface ToolDefaults {
  maxBytes?: number;
  width?: number;
  height?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  fit?: 'contain' | 'cover' | 'stretch';
  quality?: number;
  aspectLock?: boolean;
  matteColor?: string;
}

export interface ToolConfig {
  id: string;
  slug: string;
  category: ToolCategory;
  engine: ToolEngine;
  status: ToolStatus;
  indexable: boolean;
  title: string;
  description: string;
  h1: string;
  shortLabel: string;
  summary: string;
  defaults: ToolDefaults;
  acceptedFormats: string[];
  relatedIds: string[];
  contentKey: string;
  locale: string;
  sensitivity: ToolSensitivity;
}

const COMMON_INPUT_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export const TOOL_REGISTRY: ToolConfig[] = [
  {
    id: 'fix-image-upload-error',
    slug: 'fix-image-upload-error',
    category: 'fix',
    engine: 'fix',
    status: 'published',
    indexable: true,
    title: 'Fix Image Upload Errors — Size, Format & Dimensions | PicFitLab',
    description:
      'Meet exact upload requirements for file size, pixel dimensions, and format in one local browser session, with a before/after verification report.',
    h1: 'Fix Image Upload Errors',
    shortLabel: 'Upload Error Fixer',
    summary: 'Fix file size, pixel dimensions, and format together with a verified technical report.',
    defaults: {
      format: 'image/jpeg',
      fit: 'cover',
      quality: 0.85,
      aspectLock: true,
      matteColor: '#ffffff',
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-50kb', 'resize-image-to-600x600', 'image-size-checker'],
    contentKey: 'fix-image-upload-error',
    locale: 'en',
    sensitivity: 'sensitive',
  },
  {
    id: 'compress-image',
    slug: 'compress-image',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Images Online — Reduce File Size | PicFitLab',
    description:
      'Reduce JPG, PNG, and WebP file sizes locally in your browser. Compare original and output bytes before downloading.',
    h1: 'Compress Images Online',
    shortLabel: 'Image Compressor',
    summary: 'Reduce image file size with adjustable quality and real byte verification.',
    defaults: {
      quality: 0.8,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-kb', 'compress-image-to-50kb', 'resize-image'],
    contentKey: 'compress-image',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'compress-image-to-kb',
    slug: 'compress-image-to-kb',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Image to Target KB Online | PicFitLab',
    description:
      'Compress JPG or WebP images under your chosen kilobyte limit locally in your browser with exact output byte reporting.',
    h1: 'Compress Image to Target KB',
    shortLabel: 'Target KB Compressor',
    summary: 'Set a custom maximum file size in KB and verify the exported bytes.',
    defaults: {
      maxBytes: 100000,
      format: 'image/jpeg',
      quality: 0.85,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-50kb', 'compress-image-to-100kb', 'fix-image-upload-error'],
    contentKey: 'compress-image-to-kb',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'compress-image-to-20kb',
    slug: 'compress-image-to-20kb',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Image to 20 KB Online — Free | PicFitLab',
    description:
      'Reduce a photo or signature image to 20 KB or less locally in your browser. Inspect the actual file size before downloading.',
    h1: 'Compress Image to 20 KB',
    shortLabel: 'Compress to 20 KB',
    summary: 'Compress images under 20,000 bytes for strict signature and form limits.',
    defaults: {
      maxBytes: 20000,
      format: 'image/jpeg',
      quality: 0.8,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-50kb', 'compress-image-to-kb', 'fix-image-upload-error'],
    contentKey: 'compress-image-to-20kb',
    locale: 'en',
    sensitivity: 'sensitive',
  },
  {
    id: 'compress-image-to-50kb',
    slug: 'compress-image-to-50kb',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Image to 50 KB Online — Free | PicFitLab',
    description:
      'Reduce a JPG, PNG, or WebP image to a 50 KB target in your browser. Preview the result and check the actual file size before downloading.',
    h1: 'Compress Image to 50 KB',
    shortLabel: 'Compress to 50 KB',
    summary: 'Target 50,000 bytes or less while keeping dimensions clear and verifiable.',
    defaults: {
      maxBytes: 50000,
      format: 'image/jpeg',
      quality: 0.85,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-kb', 'resize-image-to-600x600', 'fix-image-upload-error'],
    contentKey: 'compress-image-to-50kb',
    locale: 'en',
    sensitivity: 'sensitive',
  },
  {
    id: 'compress-image-to-100kb',
    slug: 'compress-image-to-100kb',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Image to 100 KB Online — Free | PicFitLab',
    description:
      'Compress images to 100 KB or less locally in your browser without uploading files. Check output bytes and dimensions before saving.',
    h1: 'Compress Image to 100 KB',
    shortLabel: 'Compress to 100 KB',
    summary: 'Keep photos under 100,000 bytes for portals, profiles, and attachments.',
    defaults: {
      maxBytes: 100000,
      format: 'image/jpeg',
      quality: 0.85,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-50kb', 'compress-image-to-200kb', 'compress-image'],
    contentKey: 'compress-image-to-100kb',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'compress-image-to-200kb',
    slug: 'compress-image-to-200kb',
    category: 'compress',
    engine: 'compress',
    status: 'published',
    indexable: true,
    title: 'Compress Image to 200 KB Online — Free | PicFitLab',
    description:
      'Shrink images to 200 KB or less directly in your browser. Verify final file size and visual quality before downloading.',
    h1: 'Compress Image to 200 KB',
    shortLabel: 'Compress to 200 KB',
    summary: 'Compress higher-resolution photos under 200,000 bytes.',
    defaults: {
      maxBytes: 200000,
      format: 'image/jpeg',
      quality: 0.88,
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['compress-image-to-100kb', 'compress-image', 'resize-image'],
    contentKey: 'compress-image-to-200kb',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'resize-image',
    slug: 'resize-image',
    category: 'resize',
    engine: 'resize',
    status: 'published',
    indexable: true,
    title: 'Resize Image Online — Change Pixel Dimensions | PicFitLab',
    description:
      'Resize JPG, PNG, and WebP images to exact pixel dimensions with aspect ratio lock and local browser processing.',
    h1: 'Resize Image Online',
    shortLabel: 'Image Resizer',
    summary: 'Change exact width and height in pixels with aspect lock or fit modes.',
    defaults: {
      aspectLock: true,
      fit: 'contain',
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['resize-image-to-600x600', 'crop-image', 'fix-image-upload-error'],
    contentKey: 'resize-image',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'resize-image-to-600x600',
    slug: 'resize-image-to-600x600',
    category: 'resize',
    engine: 'resize',
    status: 'published',
    indexable: true,
    title: 'Resize Image to 600×600 Pixels Online | PicFitLab',
    description:
      'Resize and crop or pad any photo to exact 600×600 pixel dimensions in your browser without distorting the subject.',
    h1: 'Resize Image to 600×600 Pixels',
    shortLabel: 'Resize to 600×600',
    summary: 'Output exact 600×600 square pixels using cover crop or contain padding.',
    defaults: {
      width: 600,
      height: 600,
      fit: 'cover',
      aspectLock: false,
      matteColor: '#ffffff',
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['resize-image', 'crop-image', 'fix-image-upload-error'],
    contentKey: 'resize-image-to-600x600',
    locale: 'en',
    sensitivity: 'sensitive',
  },
  {
    id: 'crop-image',
    slug: 'crop-image',
    category: 'resize',
    engine: 'resize',
    status: 'published',
    indexable: true,
    title: 'Crop Image Online — Free & Aspect Ratio Crop | PicFitLab',
    description:
      'Crop JPG, PNG, and WebP images with freehand or fixed aspect ratio presets locally in your browser.',
    h1: 'Crop Image Online',
    shortLabel: 'Crop Image',
    summary: 'Trim images with free or fixed aspect ratios and numeric precision.',
    defaults: {
      aspectLock: false,
      fit: 'cover',
    },
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['resize-image', 'resize-image-to-600x600', 'fix-image-upload-error'],
    contentKey: 'crop-image',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'jpg-to-png',
    slug: 'jpg-to-png',
    category: 'convert',
    engine: 'convert',
    status: 'published',
    indexable: true,
    title: 'JPG to PNG Converter Online — Local & Free | PicFitLab',
    description:
      'Convert JPEG images to lossless PNG format in your browser with verified MIME type and output dimensions.',
    h1: 'Convert JPG to PNG',
    shortLabel: 'JPG to PNG',
    summary: 'Convert JPEG files to valid PNG images locally in your browser.',
    defaults: {
      format: 'image/png',
    },
    acceptedFormats: ['image/jpeg'],
    relatedIds: ['png-to-jpg', 'png-to-webp', 'image-size-checker'],
    contentKey: 'jpg-to-png',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'png-to-jpg',
    slug: 'png-to-jpg',
    category: 'convert',
    engine: 'convert',
    status: 'published',
    indexable: true,
    title: 'PNG to JPG Converter Online — Choose Background Color | PicFitLab',
    description:
      'Convert PNG images to JPG locally with an explicit background matte color for transparent areas.',
    h1: 'Convert PNG to JPG',
    shortLabel: 'PNG to JPG',
    summary: 'Convert PNG to JPEG with selectable matte background for transparency.',
    defaults: {
      format: 'image/jpeg',
      quality: 0.9,
      matteColor: '#ffffff',
    },
    acceptedFormats: ['image/png'],
    relatedIds: ['jpg-to-png', 'webp-to-jpg', 'compress-image-to-50kb'],
    contentKey: 'png-to-jpg',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'webp-to-jpg',
    slug: 'webp-to-jpg',
    category: 'convert',
    engine: 'convert',
    status: 'published',
    indexable: true,
    title: 'WebP to JPG Converter Online — Free & Local | PicFitLab',
    description:
      'Convert WebP images to widely compatible JPG files locally in your browser with transparency matte support.',
    h1: 'Convert WebP to JPG',
    shortLabel: 'WebP to JPG',
    summary: 'Turn WebP files into standard JPEG images for portals and older apps.',
    defaults: {
      format: 'image/jpeg',
      quality: 0.9,
      matteColor: '#ffffff',
    },
    acceptedFormats: ['image/webp'],
    relatedIds: ['jpg-to-webp', 'png-to-jpg', 'fix-image-upload-error'],
    contentKey: 'webp-to-jpg',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'jpg-to-webp',
    slug: 'jpg-to-webp',
    category: 'convert',
    engine: 'convert',
    status: 'published',
    indexable: true,
    title: 'JPG to WebP Converter Online — Smaller Web Images | PicFitLab',
    description:
      'Convert JPG photos to modern WebP format in your browser and compare actual output file sizes.',
    h1: 'Convert JPG to WebP',
    shortLabel: 'JPG to WebP',
    summary: 'Convert JPEG images to WebP locally with quality control.',
    defaults: {
      format: 'image/webp',
      quality: 0.82,
    },
    acceptedFormats: ['image/jpeg'],
    relatedIds: ['png-to-webp', 'webp-to-jpg', 'compress-image'],
    contentKey: 'jpg-to-webp',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'png-to-webp',
    slug: 'png-to-webp',
    category: 'convert',
    engine: 'convert',
    status: 'published',
    indexable: true,
    title: 'PNG to WebP Converter Online — Keep Transparency | PicFitLab',
    description:
      'Convert PNG images to WebP locally in your browser while preserving alpha transparency.',
    h1: 'Convert PNG to WebP',
    shortLabel: 'PNG to WebP',
    summary: 'Convert PNG to WebP while keeping transparent backgrounds intact.',
    defaults: {
      format: 'image/webp',
      quality: 0.85,
    },
    acceptedFormats: ['image/png'],
    relatedIds: ['jpg-to-webp', 'png-to-jpg', 'compress-image'],
    contentKey: 'png-to-webp',
    locale: 'en',
    sensitivity: 'general',
  },
  {
    id: 'image-size-checker',
    slug: 'image-size-checker',
    category: 'fix',
    engine: 'inspect',
    status: 'published',
    indexable: true,
    title: 'Image Size, Format & Dimension Checker | PicFitLab',
    description:
      'Inspect an image file locally to see its actual format signature, byte size, pixel dimensions, and DPI metadata if present.',
    h1: 'Image Size & Info Checker',
    shortLabel: 'Image Info Checker',
    summary: 'Verify real format, byte size, pixel dimensions, and metadata locally.',
    defaults: {},
    acceptedFormats: COMMON_INPUT_FORMATS,
    relatedIds: ['fix-image-upload-error', 'remove-image-metadata', 'compress-image-to-50kb'],
    contentKey: 'image-size-checker',
    locale: 'en',
    sensitivity: 'sensitive',
  },
  {
    id: 'remove-image-metadata',
    slug: 'remove-image-metadata',
    category: 'privacy',
    engine: 'metadata',
    status: 'published',
    indexable: true,
    title: 'Remove Photo Metadata & GPS Data Online | PicFitLab',
    description:
      'Strip EXIF camera details and GPS location tags from photos locally in your browser without uploading files.',
    h1: 'Remove Image Metadata & GPS Data',
    shortLabel: 'Remove Metadata',
    summary: 'Strip targeted EXIF and GPS tags locally and verify the cleaned output.',
    defaults: {},
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    relatedIds: ['image-size-checker', 'fix-image-upload-error', 'compress-image'],
    contentKey: 'remove-image-metadata',
    locale: 'en',
    sensitivity: 'sensitive',
  },
];

export function getToolBySlug(slug: string, locale = 'en'): ToolConfig | undefined {
  return TOOL_REGISTRY.find((tool) => tool.slug === slug && tool.locale === locale);
}

export function getToolById(id: string): ToolConfig | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getPublishedTools(locale = 'en'): ToolConfig[] {
  return TOOL_REGISTRY.filter(
    (tool) => tool.locale === locale && (tool.status === 'published' || tool.status === 'beta')
  );
}

export function getActiveTools(locale = 'en'): ToolConfig[] {
  return TOOL_REGISTRY.filter((tool) => tool.locale === locale && tool.status !== 'retired');
}

export function getNonIndexablePaths(): string[] {
  return TOOL_REGISTRY.filter((tool) => !tool.indexable).map((tool) => `/${tool.slug}/`);
}
