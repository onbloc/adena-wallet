import { scryptAsync } from '@noble/hashes/scrypt.js';

export interface ScryptParameters {
  N: number;
  r: number;
  p: number;
  dkLen: number;
}

// Password KDF seam: native OpenSSL on devices, pure JS (noble) in tests.
export interface ScryptKdf {
  derive(password: Uint8Array, salt: Uint8Array, params: ScryptParameters): Promise<Uint8Array>;
}

export const nobleScryptKdf: ScryptKdf = {
  derive: (password, salt, { N, r, p, dkLen }) => scryptAsync(password, salt, { N, r, p, dkLen }),
};
