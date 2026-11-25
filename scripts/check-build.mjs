import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ directory not found. Run build first.');
  process.exit(1);
}

const requiredFiles = [
  'index.html',
  'tools/index.html',
  '404.html',
  'privacy/index.html',
  'terms/index.html',
  'about/index.html',
  'contact/index.html',
  'robots.txt',
  '_headers',
  'sitemap-index.xml',
];

const errors = [];

for (const rel of requiredFiles) {
  const full = path.join(distDir, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Missing required build output: ${rel}`);
  }
}

// Check first-party JS and CSS gzip budgets
const astroAssetsDir = path.join(distDir, '_astro');
let totalCssGzip = 0;
let maxJsChunkGzip = 0;
let totalJsGzip = 0;

if (fs.existsSync(astroAssetsDir)) {
  for (const file of fs.readdirSync(astroAssetsDir)) {
    const full = path.join(astroAssetsDir, file);
    if (!fs.statSync(full).isFile()) continue;
    const content = fs.readFileSync(full);
    const gzipSize = zlib.gzipSync(content).length;
    if (file.endsWith('.css')) {
      totalCssGzip += gzipSize;
    } else if (file.endsWith('.js')) {
      totalJsGzip += gzipSize;
      if (gzipSize > maxJsChunkGzip) maxJsChunkGzip = gzipSize;
    }
  }
}

const MAX_CSS_GZIP = 35 * 1024;
const MAX_JS_GZIP = 150 * 1024;

if (totalCssGzip > MAX_CSS_GZIP) {
  errors.push(`CSS gzip budget exceeded: ${totalCssGzip} B > ${MAX_CSS_GZIP} B`);
}
if (totalJsGzip > MAX_JS_GZIP) {
  errors.push(`JS gzip budget exceeded: ${totalJsGzip} B > ${MAX_JS_GZIP} B`);
}

if (errors.length > 0) {
  console.error('Build check failed:\n' + errors.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `Build check passed! CSS gzip: ${(totalCssGzip / 1024).toFixed(2)} KB, Total JS gzip: ${(totalJsGzip / 1024).toFixed(2)} KB (largest chunk: ${(maxJsChunkGzip / 1024).toFixed(2)} KB).`
);
