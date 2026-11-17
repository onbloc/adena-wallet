import sodium from 'libsodium-wrappers-sumo';

import type { Argon2idOptions } from './libsodium';

declare const window: any;
declare const self: any;

/**
 * Platform seam for the primitives that protect keys at rest.
 *
 * The browser extension runs libsodium.js (WASM). React Native's Hermes engine
 * cannot run WASM, so the mobile app registers a native (JSI) implementation
 * with `setCryptoProvider` before it touches any wallet data.
 *
 * Every implementation must reproduce libsodium's output byte for byte: a vault
 * written on one platform has to open on the other. `verifyCryptoProvider`
 * checks that with fixed vectors and is meant to run at app start.
 */
export interface CryptoProvider {
  /** Returns `length` bytes from the platform CSPRNG. Must throw rather than degrade. */
  randomBytes(length: number): Uint8Array;
  argon2id(password: string, salt: Uint8Array, options: Argon2idOptions): Promise<Uint8Array>;
  xchacha20poly1305Encrypt(
    message: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
  ): Promise<Uint8Array>;
  /** Must throw when the authentication tag does not verify. */
  xchacha20poly1305Decrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
  ): Promise<Uint8Array>;
  /** Overwrites a buffer holding key material with zeros. */
  memzero(buffer: Uint8Array): void;
}

function webCryptoRandomBytes(length: number): Uint8Array {
  try {
    const globalObject = typeof window === 'object' ? window : self;
    const cryptoApi =
      typeof globalObject.crypto !== 'undefined' ? globalObject.crypto : globalObject.msCrypto;

    const out = new Uint8Array(length);
    cryptoApi.getRandomValues(out);
    return out;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      return new Uint8Array([...crypto.randomBytes(length)]);
    } catch {
      throw new Error('No secure random number generator found');
    }
  }
}

/** libsodium.js (WASM) implementation used by the browser extension. */
export const libsodiumCryptoProvider: CryptoProvider = {
  randomBytes: webCryptoRandomBytes,

  async argon2id(password, salt, options) {
    await sodium.ready;
    return sodium.crypto_pwhash(
      options.outputLength,
      password,
      salt, // libsodium only supports 16 byte salts and will throw when you don't respect that
      options.opsLimit,
      options.memLimitKib * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
  },

  async xchacha20poly1305Encrypt(message, key, nonce) {
    await sodium.ready;
    return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message,
      null, // additional data
      null, // secret nonce: unused and should be null
      nonce,
      key,
    );
  },

  async xchacha20poly1305Decrypt(ciphertext, key, nonce) {
    await sodium.ready;
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, // secret nonce: unused and should be null
      ciphertext,
      null, // additional data
      nonce,
      key,
    );
  },

  memzero(buffer) {
    sodium.memzero(buffer);
  },
};

let currentProvider: CryptoProvider = libsodiumCryptoProvider;

export function setCryptoProvider(provider: CryptoProvider): void {
  currentProvider = provider;
}

export function getCryptoProvider(): CryptoProvider {
  return currentProvider;
}

const toHexString = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Known-answer vectors produced by libsodium.js. The Argon2id parameters are the
 * smallest libsodium accepts so the check stays cheap enough to run on every
 * app start; the wallet itself uses the parameters in `wallet-crypto-util.ts`.
 */
export const CRYPTO_PROVIDER_VECTORS = {
  argon2id: {
    password: 'PASSWORD',
    salt: 'TESTTESTTESTTEST',
    options: { outputLength: 32, opsLimit: 1, memLimitKib: 8 },
    expectedHex: 'abb7cce923ad17b6ad0976dafdd4c81d09394b7f5d03848bf4f1d1dcdc19fe41',
  },
  xchacha20poly1305: {
    keyByte: 0x01,
    nonceByte: 0x02,
    message: 'adena',
    expectedHex: 'ad025381cbb14134a8d4b63189bac2f52025a46c0b',
  },
} as const;

/**
 * Throws unless `provider` matches libsodium on the fixed vectors, rejects a
 * tampered ciphertext, and its random source looks alive (right length, two
 * draws differ, not all zeros). Callers must refuse to create or open a wallet
 * when this throws.
 */
export async function verifyCryptoProvider(provider: CryptoProvider): Promise<void> {
  const first = provider.randomBytes(32);
  const second = provider.randomBytes(32);
  if (first.length !== 32 || second.length !== 32) {
    throw new Error('CryptoProvider: randomBytes returned the wrong length');
  }
  if (toHexString(first) === toHexString(second) || first.every((b) => b === 0)) {
    throw new Error('CryptoProvider: random source failed the sanity check');
  }

  const kdf = CRYPTO_PROVIDER_VECTORS.argon2id;
  const salt = new Uint8Array(Array.from(kdf.salt, (c) => c.charCodeAt(0)));
  const derived = await provider.argon2id(kdf.password, salt, kdf.options);
  if (toHexString(derived) !== kdf.expectedHex) {
    throw new Error('CryptoProvider: argon2id does not match libsodium');
  }

  const aead = CRYPTO_PROVIDER_VECTORS.xchacha20poly1305;
  const key = new Uint8Array(32).fill(aead.keyByte);
  const nonce = new Uint8Array(24).fill(aead.nonceByte);
  const message = new Uint8Array(Array.from(aead.message, (c) => c.charCodeAt(0)));
  const ciphertext = await provider.xchacha20poly1305Encrypt(message, key, nonce);
  if (toHexString(ciphertext) !== aead.expectedHex) {
    throw new Error('CryptoProvider: xchacha20poly1305 does not match libsodium');
  }

  const tampered = Uint8Array.from(ciphertext);
  tampered[0] ^= 0xff;
  let tamperedOpened = true;
  try {
    await provider.xchacha20poly1305Decrypt(tampered, key, nonce);
  } catch {
    tamperedOpened = false;
  }
  if (tamperedOpened) {
    throw new Error('CryptoProvider: xchacha20poly1305 accepted a tampered ciphertext');
  }
}
