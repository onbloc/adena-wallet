import CryptoJS from 'crypto-js';
import sodium from 'libsodium-wrappers-sumo';

import { Argon2id, isArgon2idOptions, Xchacha20poly1305Ietf, xchacha20NonceLength } from '../crypto';
import { toAscii, toHex } from '../encoding';

interface KdfConfiguration {
  /**
   * An algorithm identifier, such as "argon2id" or "scrypt".
   */
  readonly algorithm: string;
  /** A map of algorithm-specific parameters */
  readonly params: Record<string, unknown>;
}

export async function executeKdf(
  salt: string,
  password: string,
  configuration: KdfConfiguration,
): Promise<Uint8Array> {
  switch (configuration.algorithm) {
    case 'argon2id': {
      const options = configuration.params;
      if (!isArgon2idOptions(options)) throw new Error('Invalid format of argon2id params');
      return Argon2id.execute(password, toAscii(salt), options);
    }
    default:
      throw new Error('Unsupported KDF algorithm');
  }
}

export const makeCryptKey = async (password: string) => {
  const SALT_KEY = process.env.SALT_KEY ?? '';
  const kdfConfiguration = {
    algorithm: 'argon2id',
    params: {
      outputLength: 32,
      opsLimit: 24,
      memLimitKib: 12 * 1024,
    },
  };
  const cryptKey = await executeKdf(SALT_KEY, password, kdfConfiguration);
  return toHex(cryptKey);
};

export const encryptSha256 = (password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.SHA256(cryptKey).toString(),
  );
};

export const encryptAES = (value: string, password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.AES.encrypt(value, cryptKey).toString(),
  );
};

export const decryptAES = (encryptedValue: string, password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.AES.decrypt(encryptedValue, cryptKey).toString(CryptoJS.enc.Utf8),
  );
};

// --- XChaCha20-Poly1305 AEAD encryption (replacement for AES-CBC) ---

export interface EncryptedData {
  ciphertext: string; // base64
  nonce: string; // base64
}

/**
 * Generates a random 16-byte salt for Argon2id KDF.
 * Called once when creating a new wallet, then stored in storage.
 */
export const generateKdfSalt = async (): Promise<Uint8Array> => {
  await sodium.ready;
  return sodium.randombytes_buf(16);
};

/**
 * Derives a 32-byte key from password + salt using Argon2id.
 * Returns raw Uint8Array bytes for use as an AEAD key.
 */
export const makeCryptKeyBytes = async (
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> => {
  return Argon2id.execute(password, salt, {
    outputLength: 32,
    opsLimit: 24,
    memLimitKib: 12 * 1024,
  });
};

/**
 * Encrypts a string using XChaCha20-Poly1305 AEAD.
 * Generates a random 24-byte nonce for each encryption.
 * Returns ciphertext and nonce, both base64-encoded.
 */
export const encryptXChacha20 = async (
  value: string,
  password: string,
  salt: Uint8Array,
): Promise<EncryptedData> => {
  await sodium.ready;
  const cryptKey = await makeCryptKeyBytes(password, salt);
  const nonce = sodium.randombytes_buf(xchacha20NonceLength);
  const message = new TextEncoder().encode(value);
  const ciphertext = await Xchacha20poly1305Ietf.encrypt(message, cryptKey, nonce);
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
};

/**
 * Decrypts data encrypted with encryptXChacha20.
 * Verifies the Poly1305 authentication tag before returning plaintext.
 * Throws if the ciphertext has been tampered with or the key is wrong.
 */
export const decryptXChacha20 = async (
  encryptedData: EncryptedData,
  password: string,
  salt: Uint8Array,
): Promise<string> => {
  await sodium.ready;
  const cryptKey = await makeCryptKeyBytes(password, salt);
  const ciphertext = sodium.from_base64(encryptedData.ciphertext);
  const nonce = sodium.from_base64(encryptedData.nonce);
  const decrypted = await Xchacha20poly1305Ietf.decrypt(ciphertext, cryptKey, nonce);
  return new TextDecoder().decode(decrypted);
};
