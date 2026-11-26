import { describe, expect, it } from 'vitest';
import { buildSingleImagePdf } from '@/engines/pdf';

describe('buildSingleImagePdf', () => {
  it('builds a valid PDF 1.4 blob with PDF header, EOF, and embedded JPEG stream', async () => {
    const fakeJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], {
      type: 'image/jpeg',
    });

    const pdf = await buildSingleImagePdf(fakeJpeg, 800, 600, 'a4');
    expect(pdf.type).toBe('application/pdf');
    expect(pdf.size).toBeGreaterThan(200);

    const text = new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()));
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Subtype /Image');
    expect(text).toContain('/Width 800 /Height 600');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text.trim().endsWith('%%EOF')).toBe(true);
  });

  it('supports fit-to-image and letter page sizes', async () => {
    const fakeJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
    const pdfFit = await buildSingleImagePdf(fakeJpeg, 400, 400, 'fit');
    const textFit = new TextDecoder().decode(new Uint8Array(await pdfFit.arrayBuffer()));
    expect(textFit).toContain('/MediaBox [0 0 300.00 300.00]');

    const pdfLetter = await buildSingleImagePdf(fakeJpeg, 400, 600, 'letter');
    const textLetter = new TextDecoder().decode(new Uint8Array(await pdfLetter.arrayBuffer()));
    expect(textLetter).toContain('/MediaBox [0 0 612.00 792.00]');
  });
});
