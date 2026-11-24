import { Bip39, EnglishMnemonic } from '@cosmjs/crypto';

import { randomBytes } from '../utils/id';

export type MnemonicStrength = 128 | 256;

export const normalizeMnemonic = (mnemonic: string): string =>
  mnemonic.trim().toLowerCase().split(/\s+/).join(' ');

export const generateMnemonic = (strength: MnemonicStrength = 256): string =>
  Bip39.encode(randomBytes(strength / 8)).toString();

export const isValidMnemonic = (mnemonic: string): boolean => {
  try {
    new EnglishMnemonic(normalizeMnemonic(mnemonic));
    return true;
  }
  catch {
    return false;
  }
};

export const mnemonicToSeed = (mnemonic: string): Promise<Uint8Array> =>
  Bip39.mnemonicToSeed(new EnglishMnemonic(normalizeMnemonic(mnemonic)));
