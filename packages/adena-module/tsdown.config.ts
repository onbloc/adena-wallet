import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { defineConfig } from 'tsdown';

// Inline the build-time values from .env, as rollup-plugin-dotenv used to.
const env = parseEnv(readFileSync(new URL('./.env', import.meta.url), 'utf8'));
const define = Object.fromEntries(
  Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
);

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: 'es2020',
  outDir: './dist',
  sourcemap: true,
  dts: true,
  define,
});
