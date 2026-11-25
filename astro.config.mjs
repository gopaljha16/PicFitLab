import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { getNonIndexablePaths } from './src/config/registry.ts';

const nonIndexablePaths = new Set(getNonIndexablePaths());

export default defineConfig({
  site: 'https://picfitlab.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !nonIndexablePaths.has(pathname) && pathname !== '/404/';
      },
    }),
  ],
});
