// Jest stand-in for the JSI binding, backed by libsodium.js. It reproduces the
// two quirks of the real binding that the provider has to work around:
// inputs are read through `.buffer`, and additional data must be a string.
import sodium from 'libsodium-wrappers-sumo';

const viaBuffer = (input: Uint8Array): Uint8Array =>
  new Uint8Array(input.buffer);

const requireStringAd = (ad: unknown, name: string): string => {
  if (typeof ad !== 'string') {
    throw new Error(`${name}: input type not yet implemented`);
  }
  return ad;
};

export const ready = sodium.ready;

export const crypto_pwhash_ALG_ARGON2ID13 = 2;

// Node's CSPRNG directly: libsodium.js seeds itself through
// crypto.getRandomValues, which the app's polyfill routes back here, so going
// through libsodium.js would recurse before it is ready.
export function randombytes_buf(length: number): Uint8Array {
  return new Uint8Array(require('crypto').randomBytes(length));
}

export function crypto_pwhash(
  keyLength: number,
  password: string,
  salt: Uint8Array,
  opsLimit: number,
  memLimit: number,
  algorithm: number,
): Uint8Array {
  return sodium.crypto_pwhash(
    keyLength,
    password,
    viaBuffer(salt),
    opsLimit,
    memLimit,
    algorithm,
  );
}

export function crypto_aead_xchacha20poly1305_ietf_encrypt(
  message: Uint8Array,
  additionalData: unknown,
  _secretNonce: null,
  nonce: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const ad = requireStringAd(
    additionalData,
    'crypto_aead_xchacha20poly1305_ietf_encrypt',
  );
  return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    viaBuffer(message),
    ad === '' ? null : ad,
    null,
    viaBuffer(nonce),
    viaBuffer(key),
  );
}

export function crypto_aead_xchacha20poly1305_ietf_decrypt(
  _secretNonce: null,
  ciphertext: Uint8Array,
  additionalData: unknown,
  nonce: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const ad = requireStringAd(
    additionalData,
    'crypto_aead_xchacha20poly1305_ietf_decrypt',
  );
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    viaBuffer(ciphertext),
    ad === '' ? null : ad,
    viaBuffer(nonce),
    viaBuffer(key),
  );
}
