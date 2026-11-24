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

export interface VaultCipher {
  encrypt(plaintext: string, password: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload, password: string): Promise<string>;
  needsRehash(payload: EncryptedPayload): boolean;
}

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;

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
    const salt = randomBytes(SALT_LENGTH);
    const nonce = randomBytes(NONCE_LENGTH);
    const key = await this.deriveKey(password, salt, this.settings);

    try {
      const ciphertext = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(plaintext));

      return {
        kdf: { name: 'scrypt', ...this.settings, dkLen: KEY_LENGTH, salt: toBase64(salt) },
        cipher: { name: 'xchacha20poly1305', nonce: toBase64(nonce) },
        ciphertext: toBase64(ciphertext),
      };
    }
    finally {
      key.fill(0);
    }
  }

  async decrypt(payload: EncryptedPayload, password: string): Promise<string> {
    if (payload.kdf.name !== 'scrypt' || payload.cipher.name !== 'xchacha20poly1305') {
      throw new AppError(AppErrorCode.STORAGE_ERROR, 'Unsupported vault encryption');
    }

    const { N, r, p } = payload.kdf;
    const key = await this.deriveKey(password, fromBase64(payload.kdf.salt), { N, r, p });

    try {
      const plaintext = xchacha20poly1305(key, fromBase64(payload.cipher.nonce))
        .decrypt(fromBase64(payload.ciphertext));

      return new TextDecoder().decode(plaintext);
    }
    catch (error) {
      throw new AppError(AppErrorCode.INVALID_PASSWORD, 'Incorrect password', { cause: error });
    }
    finally {
      key.fill(0);
    }
  }

  needsRehash(payload: EncryptedPayload): boolean {
    const { N, r, p } = payload.kdf;

    return N < this.settings.N || r !== this.settings.r || p !== this.settings.p;
  }
}
