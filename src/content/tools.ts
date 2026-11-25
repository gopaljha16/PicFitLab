export interface ToolContent {
  howTo: string[];
  notes: string[];
  faq: Array<{ q: string; a: string }>;
}

const DEFAULT_CONTENT: ToolContent = {
  howTo: [
    'Select, drop, or paste a local JPG, PNG, or WebP image.',
    'Review the detected dimensions, byte size, and format.',
    'Adjust your target settings and click Process image.',
    'Inspect the technical compliance table and download the verified file.',
  ],
  notes: [
    'All processing runs inside your browser using Canvas and Web Workers.',
    '1 KB is calculated as 1,000 bytes (decimal). Some portals use 1,024-byte KiB, so always check the exact byte count shown.',
  ],
  faq: [
    {
      q: 'Are my photos uploaded to a server?',
      a: 'No. PicFitLab processes images locally in your browser memory without uploading files.',
    },
  ],
};

export const TOOL_CONTENT: Record<string, ToolContent> = {
  'fix-image-upload-error': {
    howTo: [
      'Choose the photo or signature that an upload form rejected.',
      'Enter the required format (usually JPEG), exact width × height, and maximum KB limit.',
      'Choose Cover (crop to fill) or Contain (pad without cropping) and click Process image.',
      'Check that Format, Dimensions, and File size all show pass before downloading.',
    ],
    notes: [
      'If exact dimensions and a very small byte cap conflict, PicFitLab preserves your explicit dimensions and suggests lowering the quality floor or allowing downscaling.',
      'Technical checks verify file size, pixel dimensions, and format; they do not guarantee biometric or agency approval.',
    ],
    faq: [
      {
        q: 'Why was my image rejected even after resizing?',
        a: 'Portals often check both pixel dimensions and byte size or reject PNG files renamed as .jpg. This tool verifies the actual exported file signature and byte count.',
      },
    ],
  },
  'compress-image-to-50kb': {
    howTo: [
      'Select your JPG, PNG, or WebP photo.',
      'Keep the 50 KB (50,000 bytes) target or enable "Allow downscale if needed" for very large photos.',
      'Click Process image to run a bounded quality search in your browser.',
    ],
    notes: [
      'JPEG and WebP support lossy quality tuning. Lossless PNG ignores quality sliders, so switch to JPEG if you need a strict 50 KB cap.',
    ],
    faq: [
      {
        q: 'What if my photo cannot reach 50 KB at full resolution?',
        a: 'Enable "Allow downscale if needed" or lower the dimensions first so fewer pixels need to be encoded.',
      },
    ],
  },
  'png-to-jpg': {
    howTo: [
      'Select a PNG image (including transparent PNGs).',
      'Pick a background matte color (white by default) to fill transparent pixels.',
      'Adjust JPEG quality if needed and click Process image.',
    ],
    notes: [
      'JPEG does not support alpha transparency, so transparent areas are composited onto your chosen matte color.',
    ],
    faq: [
      {
        q: 'Why does PNG to JPG need a background color?',
        a: 'Without a matte fill, transparent PNG pixels turn black in JPEG. Selecting white or a custom color keeps the output predictable.',
      },
    ],
  },
  'remove-image-metadata': {
    howTo: [
      'Select a photo to inspect its EXIF and GPS status.',
      'Click Remove metadata to re-encode the pixel data cleanly in your browser.',
      'Verify the compliance report confirms no EXIF or GPS tags were detected in the output.',
    ],
    notes: [
      'Re-encoding strips targeted EXIF and GPS tags, but visible content in the photo (such as street signs or faces) remains.',
    ],
    faq: [
      {
        q: 'Does removing metadata reduce image quality?',
        a: 'Re-encoding JPEG at high quality keeps visual fidelity while stripping EXIF and GPS segments.',
      },
    ],
  },
};

export function getToolContent(key: string): ToolContent {
  return TOOL_CONTENT[key] ?? DEFAULT_CONTENT;
}
