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

## Enabling Ads (After AdSense Approval)

Ads are disabled by default (`PUBLIC_ADS_ENABLED=false`) and never load on sensitive workspaces (`sensitivity: 'sensitive'`). Once approved by AdSense:

1. Copy `public/ads.txt.example` to `public/ads.txt` and insert your real publisher ID.
2. Set `PUBLIC_ADS_ENABLED=true`, `PUBLIC_ADSENSE_CLIENT=ca-pub-...`, and your slot IDs (`PUBLIC_ADSENSE_SLOT_DIRECTORY`, `PUBLIC_ADSENSE_SLOT_GUIDE`, `PUBLIC_ADSENSE_SLOT_TOOL`) in Cloudflare Pages environment variables (see `.env.example`).

## Project Rules

- All image processing runs locally in the user's browser; never upload user files.
- Do not add a database, account system, paid APIs, or ad tags without passing the corresponding phase gate.
- See `PicFitLab_Complete_Implementation_Plan.md` for the full specification.
