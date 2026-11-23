import { Bip39, EnglishMnemonic, ripemd160, sha256, Slip10RawIndex } from '@cosmjs/crypto';
import { toBech32, toHex } from '@cosmjs/encoding';

import { DEFAULT_COIN_TYPE, deriveKeyPair, keyPairFromPrivateKey, makeHdPath, wipeKeyPair } from '../../../src/crypto/key-pair';
import { TEST_MNEMONIC } from '../../helpers/test-container';

describe('makeHdPath', () => {
  it('builds the cosmos path with the default coin type', () => {
    expect(DEFAULT_COIN_TYPE).toBe(118);
    expect(makeHdPath(3)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(118),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(3),
    ]);
  });

  it('accepts a custom coin type', () => {
    expect(makeHdPath(0, 60)[1]).toEqual(Slip10RawIndex.hardened(60));
  });
});

describe('keyPairFromPrivateKey', () => {
  it('returns a copy of the key and a compressed public key', () => {
    const privateKey = new Uint8Array(32).fill(1);
    const pair = keyPairFromPrivateKey(privateKey);

    expect(pair.publicKey).toHaveLength(33);
    expect([2, 3]).toContain(pair.publicKey[0]);
    expect(pair.privateKey).not.toBe(privateKey);
    expect(pair.privateKey).toEqual(privateKey);
  });

  it('rejects invalid private keys', () => {
    expect(() => keyPairFromPrivateKey(new Uint8Array(32))).toThrow();
    expect(() => keyPairFromPrivateKey(new Uint8Array(31).fill(1))).toThrow();
  });
});

describe('deriveKeyPair', () => {
  let seed: Uint8Array;

  beforeAll(async () => {
    seed = await Bip39.mnemonicToSeed(new EnglishMnemonic(TEST_MNEMONIC));
  });

  it('derives deterministic, index-specific keys', () => {
    const first = deriveKeyPair(seed, 0);

    expect(toHex(deriveKeyPair(seed, 0).privateKey)).toBe(toHex(first.privateKey));
    expect(toHex(deriveKeyPair(seed, 1).privateKey)).not.toBe(toHex(first.privateKey));
    expect(toHex(deriveKeyPair(seed, 0, 60).privateKey)).not.toBe(toHex(first.privateKey));
  });

  it('matches the well-known cosmos vector for the test mnemonic', () => {
    const address = toBech32('cosmos', ripemd160(sha256(deriveKeyPair(seed, 0).publicKey)));

    expect(address).toBe('cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4');
  });
});

describe('wipeKeyPair', () => {
  it('zeroes the private key in place', () => {
    const pair = keyPairFromPrivateKey(new Uint8Array(32).fill(9));

    wipeKeyPair(pair);
    expect(pair.privateKey.every(byte => byte === 0)).toBe(true);
  });
});
