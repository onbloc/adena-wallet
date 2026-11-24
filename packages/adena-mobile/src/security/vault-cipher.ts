import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

import { AppError, AppErrorCode } from '../core/errors';
import { randomBytes } from '../utils/id';
import { nobleScryptKdf, ScryptKdf } from './scrypt-kdf';

export interface ScryptParams {
  name: 'scrypt';
  N: number;
  r: number;
  p: number;
  dkLen: number;
  salt: string;
}

// Every parameter is persisted so stronger settings can be rolled out by re-encrypting.
export interface EncryptedPayload {
  kdf: ScryptParams;
  cipher: { name: 'xchacha20poly1305'; nonce: string };
  ciphertext: string;
}

export interface KdfSettings {
  N: number;
  r: number;
  p: number;
}

// Raising N re-encrypts existing vaults on their next unlock (`needsRehash`).
export const DEFAULT_KDF_SETTINGS: KdfSettings = { N: 2 ** 15, r: 8, p: 1 };

// The scrypt-derived key with the parameters it was derived under. Kept only for an unlocked
// session so writes need no password; holders must `wipeVaultKey` it on lock or reset.
export interface VaultKey {
  readonly bytes: Uint8Array;
  readonly kdf: ScryptParams;
}

export const wipeVaultKey = (key: VaultKey | null | undefined): void => {
  key?.bytes.fill(0);
};

export interface VaultCipher {
  encrypt(plaintext: string, password: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload, password: string): Promise<string>;
  // Same as above, also handing out the derived key; the caller owns (and wipes) it.
  encryptKeyed(plaintext: string, password: string): Promise<{ payload: EncryptedPayload; key: VaultKey }>;
  decryptKeyed(payload: EncryptedPayload, password: string): Promise<{ plaintext: string; key: VaultKey }>;
  // Re-encrypts under the same salt and parameters with a fresh nonce; no scrypt run.
  encryptWithKey(plaintext: string, key: VaultKey): EncryptedPayload;
  // Fails with WALLET_LOCKED when the payload was written under another key.
  decryptWithKey(payload: EncryptedPayload, key: VaultKey): string;
  needsRehash(payload: EncryptedPayload): boolean;
}

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;
const TAG_LENGTH = 16;

const decodeField = (value: string): Uint8Array => {
  try {
    return fromBase64(value);
  }
  catch (error) {
    throw new AppError(AppErrorCode.STORAGE_ERROR, 'Malformed vault encryption', { cause: error });
  }
};

export class ScryptXChaChaVaultCipher implements VaultCipher {
  constructor(
    private readonly settings: KdfSettings = DEFAULT_KDF_SETTINGS,
    private readonly kdf: ScryptKdf = nobleScryptKdf,
  ) {}

  private async deriveKey(password: string, salt: Uint8Array, params: KdfSettings): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(password);

    try {
      return await this.kdf.derive(passwordBytes, salt, { ...params, dkLen: KEY_LENGTH });
    }
    finally {
      passwordBytes.fill(0);
    }
  }

  async encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
    const { payload, key } = await this.encryptKeyed(plaintext, password);

    wipeVaultKey(key);
    return payload;
  }

  async decrypt(payload: EncryptedPayload, password: string): Promise<string> {
    const { plaintext, key } = await this.decryptKeyed(payload, password);

    wipeVaultKey(key);
    return plaintext;
  }

  async encryptKeyed(plaintext: string, password: string): Promise<{ payload: EncryptedPayload; key: VaultKey }> {
    const salt = randomBytes(SALT_LENGTH);
    const kdf: ScryptParams = { name: 'scrypt', ...this.settings, dkLen: KEY_LENGTH, salt: toBase64(salt) };
    const key = { bytes: await this.deriveKey(password, salt, this.settings), kdf };

    try {
      return { payload: this.encryptWithKey(plaintext, key), key };
    }
    catch (error) {
      wipeVaultKey(key);
      throw error;
    }
  }

  async decryptKeyed(payload: EncryptedPayload, password: string): Promise<{ plaintext: string; key: VaultKey }> {
    this.assertSupported(payload);
    const { N, r, p } = payload.kdf;
    const key = { bytes: await this.deriveKey(password, decodeField(payload.kdf.salt), { N, r, p }), kdf: payload.kdf };

    try {
      return { plaintext: this.open(payload, key, AppErrorCode.INVALID_PASSWORD), key };
    }
    catch (error) {
      wipeVaultKey(key);
      throw error;
    }
  }

  encryptWithKey(plaintext: string, key: VaultKey): EncryptedPayload {
    const nonce = randomBytes(NONCE_LENGTH);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    try {
      const ciphertext = xchacha20poly1305(key.bytes, nonce).encrypt(plaintextBytes);

      return { kdf: { ...key.kdf }, cipher: { name: 'xchacha20poly1305', nonce: toBase64(nonce) }, ciphertext: toBase64(ciphertext) };
    }
    finally {
      plaintextBytes.fill(0);
    }
  }

  decryptWithKey(payload: EncryptedPayload, key: VaultKey): string {
    this.assertSupported(payload);
    const { kdf } = payload;

    if (kdf.salt !== key.kdf.salt || kdf.N !== key.kdf.N || kdf.r !== key.kdf.r || kdf.p !== key.kdf.p || kdf.dkLen !== key.kdf.dkLen) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'The vault changed since it was unlocked');
    }

    return this.open(payload, key, AppErrorCode.WALLET_LOCKED);
  }

  private assertSupported(payload: EncryptedPayload): void {
    if (payload.kdf.name !== 'scrypt' || payload.cipher.name !== 'xchacha20poly1305') {
      throw new AppError(AppErrorCode.STORAGE_ERROR, 'Unsupported vault encryption');
    }
  }

  // Malformed fields are a storage fault, not a wrong password, so they never count as a failed attempt.
  private open(payload: EncryptedPayload, key: VaultKey, failure: AppErrorCode): string {
    const nonce = decodeField(payload.cipher.nonce);
    const ciphertext = decodeField(payload.ciphertext);

    if (nonce.length !== NONCE_LENGTH || ciphertext.length < TAG_LENGTH) {
      throw new AppError(AppErrorCode.STORAGE_ERROR, 'Malformed vault encryption');
    }

    let plaintext: Uint8Array;

    try {
      plaintext = xchacha20poly1305(key.bytes, nonce).decrypt(ciphertext);
    }
    catch (error) {
      throw new AppError(failure, failure === AppErrorCode.INVALID_PASSWORD ? 'Incorrect password' : 'The vault could not be opened', { cause: error });
    }

    // The decoded string cannot be wiped in JS; the byte copy can.
    try {
      return new TextDecoder().decode(plaintext);
    }
    finally {
      plaintext.fill(0);
    }
  }

  needsRehash(payload: EncryptedPayload): boolean {
    const { N, r, p } = payload.kdf;

    return N < this.settings.N || r !== this.settings.r || p !== this.settings.p;
  }
}
