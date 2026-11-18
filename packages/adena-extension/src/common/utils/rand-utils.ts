import { toHex } from 'adena-module';

// Web Crypto, not Node's `crypto`: bundles polyfill that module as an empty object.
export function generateRandomHex(): string {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}
