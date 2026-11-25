export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  relatedToolSlug: string;
  relatedToolLabel: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

export const GUIDES: GuideEntry[] = [
  {
    slug: 'why-image-still-too-large-after-resizing',
    title: 'Why Your Image Is Still Too Large After Resizing | PicFitLab',
    description:
      'Learn why changing pixel dimensions alone does not always reduce file size below an upload limit, and how format and compression work together.',
    publishedAt: '2026-11-25',
    relatedToolSlug: 'fix-image-upload-error',
    relatedToolLabel: 'Open Upload Error Fixer',
    sections: [
      {
        heading: 'Pixels and file bytes are two different limits',
        paragraphs: [
          'Resizing an image changes its width and height in pixels, while file size in kilobytes depends on how those pixels are compressed and which file format is used.',
          'Saving a resized photo as lossless PNG often produces a much larger file than saving the exact same dimensions as JPEG.',
        ],
      },
      {
        heading: 'How to fix both limits in one pass',
        paragraphs: [
          'First set the required pixel dimensions and fit mode (Cover to crop without stretching, or Contain to pad).',
          'Next choose JPEG or WebP and set your maximum KB cap so the encoder can tune quality to stay under the byte limit.',
        ],
      },
    ],
  },
  {
    slug: 'pixels-vs-kb-vs-dpi',
    title: 'Pixels vs KB vs DPI Explained for Upload Forms | PicFitLab',
    description:
      'Understand the difference between pixel dimensions, kilobyte file size, and DPI metadata when submitting photos online.',
    publishedAt: '2026-11-25',
    relatedToolSlug: 'image-size-checker',
    relatedToolLabel: 'Open Image Info Checker',
    sections: [
      {
        heading: 'What each measurement controls',
        paragraphs: [
          'Pixels (for example 600×600) define the digital grid of width and height.',
          'Kilobytes (KB) measure how much storage space the compressed file occupies.',
          'DPI (dots per inch) is print metadata stored in headers; changing DPI metadata alone does not add detail to a digital photo.',
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): GuideEntry | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
