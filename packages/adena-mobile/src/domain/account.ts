import { KeyringType } from '../crypto/keyring';

// Public account metadata. Addresses are derived per network from the public key,
// so one account works on every chain that shares the key scheme.
export interface Account {
  id: string;
  keyringId: string;
  keyringType: KeyringType;
  name: string;
  hdIndex: number;
  // Base64 33-byte compressed secp256k1 public key.
  publicKey: string;
  createdAt: number;
}

export interface TokenBalance {
  denom: string;
  symbol: string;
  decimals: number;
  // Raw integer amount in the smallest denomination.
  amount: string;
}

export const SecretImportMode = {
  MNEMONIC: 'mnemonic',
  PRIVATE_KEY: 'privateKey',
} as const;

export type SecretImportMode = (typeof SecretImportMode)[keyof typeof SecretImportMode];
