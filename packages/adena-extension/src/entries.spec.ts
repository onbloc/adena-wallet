import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Each bundle entry must configure bignumber.js before any other module loads,
// or amount parsing throws instead of returning NaN in that context.
const ENTRIES = ['web.tsx', 'popup.tsx', 'content.ts', 'background.ts', 'inject.ts'];

describe('bundle entries', () => {
  it.each(ENTRIES)('%s imports the bignumber config first', (entry) => {
    const source = readFileSync(resolve(import.meta.dirname, entry), 'utf8');
    const firstImport = source.match(/^import [^;]+;/m)?.[0];

    expect(firstImport).toBe('import \'@common/config/bignumber\';');
  });
});
