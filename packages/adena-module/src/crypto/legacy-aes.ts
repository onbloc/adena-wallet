import { cbc } from '@noble/ciphers/aes.js';
import { md5 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes } from '@noble/hashes/utils.js';

import { fromBase64, toBase64, toUtf8 } from '../encoding';
import { Random } from './random';

/**
 * The OpenSSL-compatible format CryptoJS used for `AES.encrypt(text, passphrase)`,
 * kept so data written by earlier versions still decrypts:
 * base64("Salted__" | salt(8) | AES-256-CBC/PKCS7 ciphertext), with key and IV
 * from EVP_BytesToKey(MD5, one round).
 */

const SALTED_PREFIX = toUtf8('Salted__');
const SALT_LENGTH = 8;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

const deriveKeyAndIv = (passphrase: string, salt: Uint8Array): { key: Uint8Array; iv: Uint8Array } => {
  const password = toUtf8(passphrase);
  let derived = new Uint8Array(0);
  let block = new Uint8Array(0);
  while (derived.length < KEY_LENGTH + IV_LENGTH) {
    block = md5(concatBytes(block, password, salt));
    derived = concatBytes(derived, block);
  }
  return {
    key: derived.slice(0, KEY_LENGTH),
    iv: derived.slice(KEY_LENGTH, KEY_LENGTH + IV_LENGTH)
  };
};

export const legacyAesEncrypt = (plaintext: string, passphrase: string): string => {
  const salt = Random.getBytes(SALT_LENGTH);
  const { key, iv } = deriveKeyAndIv(passphrase, salt);
  const ciphertext = cbc(key, iv).encrypt(toUtf8(plaintext));
  return toBase64(concatBytes(SALTED_PREFIX, salt, ciphertext));
};

/**
 * Mirrors CryptoJS `AES.decrypt(...).toString(Utf8)` exactly, including for a
 * wrong passphrase: the padding is trimmed without validation, a non-positive
 * length gives '', and bytes that are not UTF-8 throw "Malformed UTF-8 data".
 * Callers rely on those outcomes to reject a wrong key.
 */
export const legacyAesDecrypt = (encrypted: string, passphrase: string): string => {
  const data = fromBase64(encrypted);
  const hasSaltedPrefix = SALTED_PREFIX.every((byte, index) => data[index] === byte);
  if (!hasSaltedPrefix || data.length < SALTED_PREFIX.length + SALT_LENGTH) {
    throw new Error('Malformed UTF-8 data');
  }

  const salt = data.slice(SALTED_PREFIX.length, SALTED_PREFIX.length + SALT_LENGTH);
  const { key, iv } = deriveKeyAndIv(passphrase, salt);
  const padded = cbc(key, iv, { disablePadding: true }).decrypt(
    data.slice(SALTED_PREFIX.length + SALT_LENGTH)
  );

  const length = padded.length - padded[padded.length - 1];
  if (!(length > 0)) {
    return '';
  }
  try {
    // ignoreBOM keeps a leading U+FEFF, as CryptoJS's decoder does.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(padded.subarray(0, length));
  }
  catch {
    throw new Error('Malformed UTF-8 data');
  }
};

/** Hex SHA-256 of the UTF-8 text, as `CryptoJS.SHA256(text).toString()`. */
export const sha256Hex = (text: string): string => bytesToHex(sha256(toUtf8(text)));
