# PicFitLab

Free, fast, privacy-first image resizing, compression, conversion, and upload-requirement fixing tools that run locally in your browser.

## Architecture

- **Site:** Astro (static output)
- **Interactive UI:** React + TypeScript (strict)
- **Processing:** Browser Canvas 2D / ImageBitmap / Web Workers (no file-processing server)
- **Hosting:** Cloudflare Pages (static deployment)

## Local Development

Prerequisites: Node.js `v24.19.0` (see `.nvmrc`) and `pnpm` (via Corepack: `corepack pnpm`).

```bash
corepack pnpm install
corepack pnpm dev
```

## Scripts

- `corepack pnpm dev` — Start local Astro dev server
- `corepack pnpm build` — Build static site into `dist/`
- `corepack pnpm preview` — Preview built site locally
- `corepack pnpm check` — Run Astro and TypeScript type checks
- `corepack pnpm lint` — Run ESLint
- `corepack pnpm test` — Run Vitest unit/integration tests
- `corepack pnpm validate:registry` — Validate tool registry, slugs, and links
- `corepack pnpm check:build` — Verify static build output and asset budgets
- `corepack pnpm test:e2e` — Run Playwright end-to-end & accessibility tests

## Project Rules

- All image processing runs locally in the user's browser; never upload user files.
- Do not add a database, account system, paid APIs, or ad tags without passing the corresponding phase gate.
- See `PicFitLab_Complete_Implementation_Plan.md` for the full specification.
