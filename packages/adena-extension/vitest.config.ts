import { basename } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { alias } from './vite.config';

// Tests see an SVG import as its file name, as the Jest transformer used to return.
const svgFileName = (): Plugin => ({
  name: 'adena:svg-file-name',
  enforce: 'pre',
  load(id) {
    const file = id.split('?')[0];
    return file.endsWith('.svg') ? `export default ${JSON.stringify(basename(file))};` : null;
  },
});

export default defineConfig({
  plugins: [svgFileName()],
  resolve: { alias },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.{js,jsx,ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
