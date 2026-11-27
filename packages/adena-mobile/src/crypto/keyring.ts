import { fromHex, toHex } from '@cosmjs/encoding';

import { deriveKeyPair, KeyPair, keyPairFromPrivateKey } from './key-pair';
import { mnemonicToSeed, normalizeMnemonic } from './mnemonic';

export const KeyringType = {
  HD_WALLET: 'HD_WALLET',
  PRIVATE_KEY: 'PRIVATE_KEY',
} as const;

export type KeyringType = (typeof KeyringType)[keyof typeof KeyringType];

// Secret keyring material. Only ever persisted inside the encrypted vault.
export type KeyringRecord
  // `seed` caches the BIP39 seed (hex) so unlocking skips PBKDF2; older records may lack it.
  // `hdIndexes` lists the accounts picked when the phrase was imported, for rebuilding a lost account list.
  = | { id: string; type: typeof KeyringType.HD_WALLET; mnemonic: string; seed?: string; hdIndexes?: number[]; createdAt: number }
    | { id: string; type: typeof KeyringType.PRIVATE_KEY; privateKey: string; createdAt: number };

export interface Keyring {
  readonly id: string;
  readonly type: KeyringType;
  // hdIndex is ignored by single-key keyrings.
  deriveKeyPair(hdIndex: number): Promise<KeyPair>;
  destroy(): void;
}

export class HDKeyring implements Keyring {
  readonly type = KeyringType.HD_WALLET;
  private seed: Uint8Array | null = null;

  constructor(readonly id: string, private readonly mnemonic: string, seedHex?: string) {
    this.seed = seedHex ? fromHex(seedHex) : null;
  }

  async deriveKeyPair(hdIndex: number): Promise<KeyPair> {
    if (!this.seed) {
      this.seed = await mnemonicToSeed(this.mnemonic);
    }

    return deriveKeyPair(this.seed, hdIndex);
  }

  getMnemonic(): string {
    return normalizeMnemonic(this.mnemonic);
  }

  destroy(): void {
    this.seed?.fill(0);
    this.seed = null;
  }
}

export class PrivateKeyKeyring implements Keyring {
  readonly type = KeyringType.PRIVATE_KEY;
  private readonly privateKey: Uint8Array;

  constructor(readonly id: string, privateKeyHex: string) {
    this.privateKey = fromHex(privateKeyHex.replace(/^0x/, ''));
  }

  async deriveKeyPair(): Promise<KeyPair> {
    return keyPairFromPrivateKey(this.privateKey);
  }

  destroy(): void {
    this.privateKey.fill(0);
  }
}

export const keyringFromRecord = (record: KeyringRecord): Keyring =>
  record.type === KeyringType.HD_WALLET
    ? new HDKeyring(record.id, record.mnemonic, record.seed)
    : new PrivateKeyKeyring(record.id, record.privateKey);

export const hasCachedSeed = (record: KeyringRecord): boolean => record.type !== KeyringType.HD_WALLET || Boolean(record.seed);

export const withCachedSeed = async (record: KeyringRecord): Promise<KeyringRecord> =>
  hasCachedSeed(record) || record.type !== KeyringType.HD_WALLET
    ? record
    : { ...record, seed: toHex(await mnemonicToSeed(record.mnemonic)) };

export const isValidPrivateKeyHex = (value: string): boolean => {
  const hex = value.trim().replace(/^0x/, '');

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return false;
  }

  try {
    keyPairFromPrivateKey(fromHex(hex));
    return true;
  }
  catch {
    return false;
  }
};
