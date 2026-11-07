// Imported first by index.js, so these globals exist before any other module
// is evaluated. (A call placed between `import` statements would run after
// them: Babel hoists imports.)
import {Buffer} from 'buffer';

import {installRandomValuesPolyfill} from './random-values-polyfill';
import {installTextDecoderPolyfill} from './text-decoder-polyfill';

// Hermes ships no CSPRNG-backed crypto.getRandomValues.
installRandomValuesPolyfill();

// Hermes ships TextEncoder but not TextDecoder (needed to decrypt the vault).
installTextDecoderPolyfill();

// Shared libraries (Ledger transports, tm2-js-client, cosmjs) expect Node's
// Buffer global; Hermes has none.
const globalObject = globalThis as {Buffer?: typeof Buffer};
if (!globalObject.Buffer) {
  globalObject.Buffer = Buffer;
}
