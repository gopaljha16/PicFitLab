export type PdfPageSize = 'fit' | 'a4' | 'letter';

const PAGE_POINTS: Record<Exclude<PdfPageSize, 'fit'>, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

/**
 * Builds a valid single-page PDF 1.4 document embedding a JPEG image stream (/DCTDecode).
 * Zero external dependencies; runs in Web Workers and browsers.
 */
export async function buildSingleImagePdf(
  jpegBlob: Blob,
  imgWidth: number,
  imgHeight: number,
  pageSize: PdfPageSize = 'a4'
): Promise<Blob> {
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const enc = new TextEncoder();

  let pageW: number;
  let pageH: number;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (pageSize === 'fit') {
    pageW = Math.max(72, imgWidth * 0.75);
    pageH = Math.max(72, imgHeight * 0.75);
    drawW = pageW;
    drawH = pageH;
    drawX = 0;
    drawY = 0;
  } else {
    const base = PAGE_POINTS[pageSize];
    const landscape = imgWidth > imgHeight;
    pageW = landscape ? base.h : base.w;
    pageH = landscape ? base.w : base.h;
    const margin = 24;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const scale = Math.min(availW / imgWidth, availH / imgHeight);
    drawW = imgWidth * scale;
    drawH = imgHeight * scale;
    drawX = (pageW - drawW) / 2;
    drawY = (pageH - drawH) / 2;
  }

  const contentStream = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = enc.encode(contentStream);

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let bytePos = 0;

  const pushStr = (s: string) => {
    const b = enc.encode(s);
    chunks.push(b);
    bytePos += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    bytePos += b.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  offsets.push(bytePos);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(bytePos);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets.push(bytePos);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject
  offsets.push(bytePos);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content stream
  offsets.push(bytePos);
  pushStr(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushStr('endstream\nendobj\n');

  // xref
  const xrefPos = bytePos;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const total = new Uint8Array(bytePos);
  let cursor = 0;
  for (const c of chunks) {
    total.set(c, cursor);
    cursor += c.length;
  }

  return new Blob([total], { type: 'application/pdf' });
}
