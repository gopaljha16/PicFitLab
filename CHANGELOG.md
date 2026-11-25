# Changelog

All notable changes to PicFitLab will be documented in this file.

## [0.1.0] - 2026-11-25

### Added
- **Phase 0:** Repository initialization, `.nvmrc`, `.gitignore`, `README.md`, `research/keywords.csv` candidate hypotheses, and synthetic fixture plan (`tests/fixtures/README.md`).
- **Phase 1:** Static Astro + React + strict TypeScript scaffold, design tokens (`src/styles/tokens.css`), `BaseLayout`, `Header`, `Footer`, SEO `Head` & `Breadcrumbs`, 17-tool `TOOL_REGISTRY` (`src/config/registry.ts`), `[tool].astro` static routes (marked `draft`/`noindex` until Phase 3), `ToolSearch`, `ToolWorkspaceShell`, `RelatedTools`, legal/info pages (`/privacy/`, `/terms/`, `/about/`, `/contact/`), `404.astro`, `public/_headers`, `public/robots.txt`, `scripts/validate-registry.mjs`, `scripts/check-build.mjs`, Vitest unit tests, and GitHub Actions CI.
