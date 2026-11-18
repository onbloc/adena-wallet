import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Browser = 'chrome' | 'firefox';

const root = import.meta.dirname;
const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(root, file), 'utf8'));

/**
 * Source manifest handed to crx(). Firefox gets `manifest.json` plus the keys in
 * `manifest.firefox.json`, a delta rather than a full copy, so a key added to
 * the base can never silently miss the Firefox build. Shallow merge: a delta key
 * replaces the base wholesale, which is what `background` needs.
 */
export const buildManifest = (browser: Browser): Record<string, unknown> => ({
  ...readJson('manifest.json'),
  ...(browser === 'firefox' ? readJson('manifest.firefox.json') : {}),
  // Keep the packaged manifest version in sync with the extension package.
  version: (readJson('package.json') as { version: string }).version,
});
