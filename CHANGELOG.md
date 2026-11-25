# Changelog

All notable changes to PicFitLab will be documented in this file.

## [0.5.0] - 2026-11-25

### Added
- **Monetization Readiness:** Env-driven AdSense configuration (`src/config/flags.ts`, `.env.example`, `public/ads.txt.example`), consent-aware `ConsentBanner` (`src/components/ads/ConsentBanner.tsx`, `src/lib/consent.ts`), fixed-height `AdSlot` (`src/components/ads/AdSlot.astro`) placed only on eligible non-sensitive pages (`tools/`, `guides/`, and below-content on `general` tool pages), and local data / consent withdrawal controls on `/privacy/`.

## [0.4.0] - 2026-11-25

### Added & Verified
- **Phase 4:** Playwright E2E, privacy network-interception, and `axe-core` accessibility test suite (`tests/e2e/tools.spec.ts`). Fixed keyboard-focusable scrollable table region on homepage and file input `aria-label` in `ToolWorkspaceShell`. All 10 E2E tests (Desktop Chrome & Mobile Chrome), 17 unit tests, `eslint`, `astro check`, and build budget checks pass.

## [0.3.0] - 2026-11-25

### Added
- **Phase 3:** Full interactive `ToolWorkspaceShell` wired to `ImageJobManager` + Web Worker (drag/drop, paste, pre-decode inspection, dimension/crop/target-KB/format/matte controls, cancellation, before/after preview, compliance report table, verified download), per-tool guidance & FAQs (`src/content/tools.ts`), initial guides (`src/content/guides.ts`, `src/pages/guides/[slug].astro`), and all 17 P0 tools published & indexable in `src/config/registry.ts`.

## [0.2.0] - 2026-11-25

### Added
- **Phase 2:** Core browser image processing engines (`contracts.ts`, `inspect.ts`, `decode.ts`, `geometry.ts`, `encode.ts`, `compress.ts`, `verify.ts`, `processor.ts`), dedicated Web Worker (`src/workers/image.worker.ts`), job manager with main-thread fallback & cancellation (`src/lib/job-manager.ts`), safe download/storage utilities (`src/lib/downloads.ts`, `src/lib/storage.ts`), and 17 unit tests across 5 test files.

## [0.1.0] - 2026-11-25

### Added
- **Phase 0:** Repository initialization, `.nvmrc`, `.gitignore`, `README.md`, `research/keywords.csv` candidate hypotheses, and synthetic fixture plan (`tests/fixtures/README.md`).
- **Phase 1:** Static Astro + React + strict TypeScript scaffold, design tokens (`src/styles/tokens.css`), `BaseLayout`, `Header`, `Footer`, SEO `Head` & `Breadcrumbs`, 17-tool `TOOL_REGISTRY` (`src/config/registry.ts`), `[tool].astro` static routes (marked `draft`/`noindex` until Phase 3), `ToolSearch`, `ToolWorkspaceShell`, `RelatedTools`, legal/info pages (`/privacy/`, `/terms/`, `/about/`, `/contact/`), `404.astro`, `public/_headers`, `public/robots.txt`, `scripts/validate-registry.mjs`, `scripts/check-build.mjs`, Vitest unit tests, and GitHub Actions CI.
