# Synthetic Test Fixtures Plan

All test fixtures must be synthetic or permissively licensed (never commit personal photos or documents).

## Required Fixtures (Phase 2+)

1. `small-valid.jpg` — ~50 KB JPEG, 400×300, no EXIF
2. `large-photo.jpg` — ~2 MB synthetic gradient/noise JPEG, 2400×1600, for benchmark & target-KB tests
3. `exif-rot-3.jpg` / `exif-rot-6.jpg` / `exif-rot-8.jpg` — Synthetic JPEG with EXIF Orientation tags 3, 6, 8
4. `gps-metadata.jpg` — Synthetic JPEG with dummy GPS EXIF tags (e.g., 0, 0) for metadata removal verification
5. `alpha-transparent.png` — PNG with alpha channel for PNG→JPG matte & PNG→WebP alpha tests
6. `sample.webp` — Valid WebP image for WebP→JPG tests
7. `corrupt-header.jpg` — Truncated/invalid bytes with `.jpg` extension
8. `wrong-extension.jpg` — Valid PNG bytes named `.jpg`
9. `huge-dimensions.png` — Synthetic header claiming > 24 MP / > 8192 px side to test pre-decode rejection
10. `svg-active.svg` — SVG file to verify rejection in MVP
