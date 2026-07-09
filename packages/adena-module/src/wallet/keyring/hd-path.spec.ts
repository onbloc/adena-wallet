import { generateKeyPair } from '@gnolang/tm2-js-client';

import {
  formatHdPath,
  generateKeyPairByHdPath,
  getAddressIndex,
  toHdPath,
} from './hd-path';

// A valid BIP39 test mnemonic (checksum-correct). Never used for real funds.
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('toHdPath', () => {
  it('treats undefined as the all-zero default path', () => {
    expect(toHdPath(undefined)).toEqual({ account: 0, change: 0, addressIndex: 0 });
  });

  it('lifts a bare number into the address index (account/change = 0)', () => {
    expect(toHdPath(7)).toEqual({ account: 0, change: 0, addressIndex: 7 });
  });

  it('passes an explicit HdPath through unchanged', () => {
    const path = { account: 2, change: 1, addressIndex: 3 };
    expect(toHdPath(path)).toEqual(path);
  });
});

describe('getAddressIndex', () => {
  it('extracts the address index from either form', () => {
    expect(getAddressIndex(5)).toBe(5);
    expect(getAddressIndex({ account: 9, change: 1, addressIndex: 4 })).toBe(4);
  });
});

describe('formatHdPath', () => {
  it('renders the canonical BIP44 string with fixed 44/118 prefix', () => {
    expect(formatHdPath(5)).toBe("m/44'/118'/0'/0/5");
    expect(formatHdPath({ account: 1, change: 2, addressIndex: 3 })).toBe("m/44'/118'/1'/2/3");
  });
});

describe('generateKeyPairByHdPath', () => {
  it('is byte-identical to the legacy address-index derivation (backward compat)', async () => {
    for (const index of [0, 1, 5, 42]) {
      const legacy = await generateKeyPair(MNEMONIC, index);
      const next = await generateKeyPairByHdPath(MNEMONIC, index);

      expect(Array.from(next.privateKey)).toEqual(Array.from(legacy.privateKey));
      expect(Array.from(next.publicKey)).toEqual(Array.from(legacy.publicKey));
    }
  });

  it('treats a bare number and its equivalent HdPath identically', async () => {
    const fromNumber = await generateKeyPairByHdPath(MNEMONIC, 5);
    const fromPath = await generateKeyPairByHdPath(MNEMONIC, {
      account: 0,
      change: 0,
      addressIndex: 5,
    });

    expect(Array.from(fromPath.privateKey)).toEqual(Array.from(fromNumber.privateKey));
    expect(Array.from(fromPath.publicKey)).toEqual(Array.from(fromNumber.publicKey));
  });

  it('derives distinct keys when the account or change segment changes', async () => {
    const base = await generateKeyPairByHdPath(MNEMONIC, { account: 0, change: 0, addressIndex: 0 });
    const otherAccount = await generateKeyPairByHdPath(MNEMONIC, {
      account: 1,
      change: 0,
      addressIndex: 0,
    });
    const otherChange = await generateKeyPairByHdPath(MNEMONIC, {
      account: 0,
      change: 1,
      addressIndex: 0,
    });

    expect(Array.from(otherAccount.privateKey)).not.toEqual(Array.from(base.privateKey));
    expect(Array.from(otherChange.privateKey)).not.toEqual(Array.from(base.privateKey));
  });
});
