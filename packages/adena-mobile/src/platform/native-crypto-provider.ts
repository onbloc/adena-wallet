import type {CryptoProvider} from 'adena-module';
import * as sodium from 'react-native-libsodium';

/**
 * react-native-libsodium hands `array.buffer` to native code, i.e. the whole
 * backing ArrayBuffer. A view into a larger buffer (`subarray`, a pooled
 * Buffer) would silently feed extra bytes into the KDF or cipher, so every
 * input is copied to an exact-length array first.
 */
export function exactBytes(input: Uint8Array): Uint8Array {
  if (input.byteOffset === 0 && input.byteLength === input.buffer.byteLength) {
    return input;
  }
  return input.slice();
}

// The native binding only accepts a string for additional data; an empty
// string authenticates nothing, exactly like libsodium.js' `null`.
const NO_ADDITIONAL_DATA = '';

export const nativeCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    const bytes = sodium.randombytes_buf(length);
    if (!(bytes instanceof Uint8Array) || bytes.length !== length) {
      throw new Error('Native random source returned an unexpected value');
    }
    return bytes;
  },

  async argon2id(password, salt, options) {
    return sodium.crypto_pwhash(
      options.outputLength,
      password,
      exactBytes(salt),
      options.opsLimit,
      options.memLimitKib * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
  },

  async xchacha20poly1305Encrypt(message, key, nonce) {
    return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      exactBytes(message),
      NO_ADDITIONAL_DATA,
      null,
      exactBytes(nonce),
      exactBytes(key),
    );
  },

  async xchacha20poly1305Decrypt(ciphertext, key, nonce) {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      exactBytes(ciphertext),
      NO_ADDITIONAL_DATA,
      exactBytes(nonce),
      exactBytes(key),
    );
  },

  memzero(buffer) {
    buffer.fill(0);
  },
};
