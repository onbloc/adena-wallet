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
  // Local-only avatar background; unknown or missing values fall back to the default.
  avatarColor?: AvatarColor;
}

export const AvatarColor = {
  INK: 'ink',
  BLUE: 'blue',
  VIOLET: 'violet',
  PINK: 'pink',
  RED: 'red',
  AMBER: 'amber',
  GREEN: 'green',
  TEAL: 'teal',
} as const;

export type AvatarColor = (typeof AvatarColor)[keyof typeof AvatarColor];

export const AVATAR_COLORS: AvatarColor[] = Object.values(AvatarColor);

// Same limit as the extension's account name field.
export const ACCOUNT_NAME_MAX_LENGTH = 23;

export const isAvatarColor = (value: unknown): value is AvatarColor => AVATAR_COLORS.includes(value as AvatarColor);

// Not security sensitive, so any [0, 1) source (Math.random) works.
export const pickAvatarColor = (random: () => number = Math.random): AvatarColor =>
  AVATAR_COLORS[Math.min(AVATAR_COLORS.length - 1, Math.max(0, Math.floor(random() * AVATAR_COLORS.length)))];

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
