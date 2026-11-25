import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Generate a valid synthetic PNG in the browser context so we don't need binary blobs in git
async function makeSyntheticPngBuffer(
  page: import('@playwright/test').Page,
  width: number,
  height: number
): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ w, h }) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(0.5, '#0d9488');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
      return btoa(binary);
    },
    { w: width, h: height }
  );
  return Buffer.from(base64, 'base64');
}

test.describe('PicFitLab E2E & Privacy QA', () => {
  test('homepage loads, passes axe accessibility, and has no horizontal overflow at 320px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Free Online Image Tools');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    const axeResults = await new AxeBuilder({ page }).analyze();
    const critical = axeResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical).toEqual([]);
  });

  test('compress-image-to-50kb processes locally with zero outbound file requests', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost:4321/') && !url.startsWith('blob:') && !url.startsWith('data:')) {
        externalRequests.push(url);
      }
      if (req.method() !== 'GET') {
        externalRequests.push(`${req.method()} ${url}`);
      }
    });

    await page.goto('/compress-image-to-50kb/');
    const pngBuf = await makeSyntheticPngBuffer(page, 800, 600);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'synthetic-photo.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });

    await expect(page.getByText('Dimensions: 800×600 px')).toBeVisible();
    await page.getByRole('button', { name: /Process image/i }).click();

    await expect(page.getByText('All selected technical checks passed')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    expect(externalRequests).toEqual([]);
  });

  test('resize-image-to-600x600 outputs exact 600x600 dimensions', async ({ page }) => {
    await page.goto('/resize-image-to-600x600/');
    const pngBuf = await makeSyntheticPngBuffer(page, 1000, 500);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'landscape.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });

    await page.getByRole('button', { name: /Process image/i }).click();
    await expect(page.getByText('600×600 — pass')).toBeVisible({ timeout: 15000 });
  });

  test('fix-image-upload-error passes axe accessibility and rejects corrupt files safely', async ({
    page,
  }) => {
    await page.goto('/fix-image-upload-error/');
    const axeResults = await new AxeBuilder({ page }).analyze();
    const critical = axeResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical).toEqual([]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'corrupt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not-an-image'),
    });

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('missing route returns 404 status', async ({ page }) => {
    const res = await page.goto('/this-tool-does-not-exist/');
    expect(res?.status()).toBe(404);
  });
});
