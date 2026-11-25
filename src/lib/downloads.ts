import { getExtensionForMime } from '@/engines/contracts';

export function buildOutputFilename(originalName: string, outputMime: string, suffix = 'picfitlab'): string {
  const base = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 48) || 'image';
  const ext = getExtensionForMime(outputMime);
  return `${base}-${suffix}.${ext}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Delay revocation so browser initiates download cleanly
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
