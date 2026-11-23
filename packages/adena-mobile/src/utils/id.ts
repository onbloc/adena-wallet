import { bytesToHex } from '@noble/hashes/utils.js';

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);

  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

export const createId = (): string => bytesToHex(randomBytes(16));
