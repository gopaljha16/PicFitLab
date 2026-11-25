import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function makeSyntheticImageBuffer(
  page: import('@playwright/test').Page,
  width: number,
  height: number,
  mime: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ w, h, m }) => {
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
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), m, 0.9));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
      return btoa(binary);
    },
    { w: width, h: height, m: mime }
  );
  return Buffer.from(base64, 'base64');
}

test.describe('PicFitLab Full Web E2E & Privacy QA', () => {
  test('homepage loads, passes axe, has no 320px overflow, and search works', async ({ page }) => {
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

    const searchInput = page.locator('#tool-search-input');
    await searchInput.fill('50 KB');
    await expect(page.getByRole('region', { name: 'Search results' })).toContainText(
      'Compress to 50 KB'
    );
  });

  test('compress-image-to-50kb processes locally with zero outbound file requests', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (
        !url.startsWith('http://localhost:4321/') &&
        !url.startsWith('blob:') &&
        !url.startsWith('data:')
      ) {
        externalRequests.push(url);
      }
      if (req.method() !== 'GET') {
        externalRequests.push(`${req.method()} ${url}`);
      }
    });

    await page.goto('/compress-image-to-50kb/');
    const pngBuf = await makeSyntheticImageBuffer(page, 800, 600, 'image/png');

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
    const pngBuf = await makeSyntheticImageBuffer(page, 1000, 500, 'image/png');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'landscape.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });

    await page.getByRole('button', { name: /Process image/i }).click();
    await expect(page.getByText('600×600 — pass')).toBeVisible({ timeout: 15000 });
  });

  test('crop-image crops to 1:1 square preset', async ({ page }) => {
    await page.goto('/crop-image/');
    const pngBuf = await makeSyntheticImageBuffer(page, 800, 400, 'image/png');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'wide.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });

    await page.getByRole('button', { name: '1:1 Square' }).click();
    await page.getByRole('button', { name: /Process image/i }).click();
    await expect(page.getByText('400×400 — pass')).toBeVisible({ timeout: 15000 });
  });

  test('png-to-jpg and jpg-to-webp conversions pass', async ({ page }) => {
    await page.goto('/png-to-jpg/');
    const pngBuf = await makeSyntheticImageBuffer(page, 300, 200, 'image/png');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'alpha.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });
    await page.getByRole('button', { name: /Process image/i }).click();
    await expect(page.getByText('JPEG — pass')).toBeVisible({ timeout: 15000 });

    await page.goto('/jpg-to-webp/');
    const jpgBuf = await makeSyntheticImageBuffer(page, 300, 200, 'image/jpeg');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: jpgBuf,
    });
    await page.getByRole('button', { name: /Process image/i }).click();
    await expect(page.getByText('WebP — pass')).toBeVisible({ timeout: 15000 });
  });

  test('image-size-checker and remove-image-metadata work cleanly', async ({ page }) => {
    await page.goto('/image-size-checker/');
    const pngBuf = await makeSyntheticImageBuffer(page, 640, 480, 'image/png');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'check.png',
      mimeType: 'image/png',
      buffer: pngBuf,
    });
    await expect(page.getByText('Detailed Image Report')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('640×480 — pass')).toBeVisible();

    await page.goto('/remove-image-metadata/');
    const jpgBuf = await makeSyntheticImageBuffer(page, 400, 300, 'image/jpeg');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: jpgBuf,
    });
    await page.getByRole('button', { name: /Remove metadata/i }).click();
    await expect(page.getByText('None detected — pass')).toBeVisible({ timeout: 15000 });
  });

  test('fix-image-upload-error passes axe and handles both valid and corrupt files', async ({
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

  test('tools directory, privacy controls, and 404 page work', async ({ page }) => {
    await page.goto('/tools/');
    await expect(page.locator('h1')).toHaveText('All Image Tools');
    await expect(page.getByRole('link', { name: /Upload Error Fixer/i })).toBeVisible();

    await page.goto('/privacy/');
    await page.locator('#reset-local-data-btn').click();
    await expect(page.locator('#reset-local-data-status')).toContainText('cleared');

    const res = await page.goto('/this-tool-does-not-exist/');
    expect(res?.status()).toBe(404);
  });
});
