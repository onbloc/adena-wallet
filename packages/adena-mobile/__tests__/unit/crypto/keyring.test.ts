import { toHex } from '@cosmjs/encoding';

import { deriveKeyPair } from '../../../src/crypto/key-pair';
import {
  hasCachedSeed,
  HDKeyring,
  isValidPrivateKeyHex,
  keyringFromRecord,
  KeyringRecord,
  KeyringType,
  PrivateKeyKeyring,
  withCachedSeed,
} from '../../../src/crypto/keyring';
import { TEST_MNEMONIC } from '../../helpers/test-container';

const SEED_HEX = '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4';
const PRIVATE_KEY = '01'.repeat(32);
// secp256k1 curve order n; not a valid private key.
const CURVE_ORDER = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';

describe('HDKeyring', () => {
  it('derives from the cached seed without hashing the mnemonic', async () => {
    const keyring = new HDKeyring('k1', 'not a real phrase', SEED_HEX);
    const pair = await keyring.deriveKeyPair(2);

    expect(keyring.type).toBe(KeyringType.HD_WALLET);
    expect(keyring.id).toBe('k1');
    expect(toHex(pair.privateKey)).toBe(toHex(deriveKeyPair(Buffer.from(SEED_HEX, 'hex'), 2).privateKey));
  });

  it('computes the seed from the mnemonic once when not cached', async () => {
    const keyring = new HDKeyring('k1', TEST_MNEMONIC);
    const first = await keyring.deriveKeyPair(0);
    const cached = new HDKeyring('k2', TEST_MNEMONIC, SEED_HEX);

    expect(toHex(first.publicKey)).toBe(toHex((await cached.deriveKeyPair(0)).publicKey));
    expect(toHex((await keyring.deriveKeyPair(0)).publicKey)).toBe(toHex(first.publicKey));
  });

  it('returns the normalized mnemonic', () => {
    expect(new HDKeyring('k', `  ${TEST_MNEMONIC.toUpperCase()}  `).getMnemonic()).toBe(TEST_MNEMONIC);
  });

  it('wipes the seed on destroy and re-derives afterwards', async () => {
    const keyring = new HDKeyring('k', TEST_MNEMONIC, SEED_HEX);
    const before = toHex((await keyring.deriveKeyPair(0)).privateKey);
    const seed = (keyring as unknown as { seed: Uint8Array }).seed;

    keyring.destroy();
    expect(seed.every(byte => byte === 0)).toBe(true);
    expect((keyring as unknown as { seed: Uint8Array | null }).seed).toBeNull();
    keyring.destroy();
    expect(toHex((await keyring.deriveKeyPair(0)).privateKey)).toBe(before);
  });

  it('throws on a malformed seed hex', () => {
    expect(() => new HDKeyring('k', TEST_MNEMONIC, 'zz')).toThrow();
  });
});

describe('PrivateKeyKeyring', () => {
  it('accepts keys with or without 0x and ignores hdIndex', async () => {
    const plain = new PrivateKeyKeyring('p', PRIVATE_KEY);
    const prefixed = new PrivateKeyKeyring('p', `0x${PRIVATE_KEY}`);

    expect(plain.type).toBe(KeyringType.PRIVATE_KEY);
    expect(toHex((await plain.deriveKeyPair()).privateKey)).toBe(PRIVATE_KEY);
    expect(toHex((await prefixed.deriveKeyPair()).publicKey)).toBe(toHex((await plain.deriveKeyPair()).publicKey));
  });

  it('returns copies so callers cannot wipe the stored key', async () => {
    const keyring = new PrivateKeyKeyring('p', PRIVATE_KEY);

    (await keyring.deriveKeyPair()).privateKey.fill(0);
    expect(toHex((await keyring.deriveKeyPair()).privateKey)).toBe(PRIVATE_KEY);
  });

  it('wipes the key on destroy', async () => {
    const keyring = new PrivateKeyKeyring('p', PRIVATE_KEY);

    keyring.destroy();
    await expect(keyring.deriveKeyPair()).rejects.toThrow();
  });

  it('throws on malformed hex', () => {
    expect(() => new PrivateKeyKeyring('p', 'xyz')).toThrow();
  });
});

describe('keyringFromRecord', () => {
  it('builds the keyring matching the record type', () => {
    const hd = keyringFromRecord({ id: 'a', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, seed: SEED_HEX, createdAt: 1 });
    const pk = keyringFromRecord({ id: 'b', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 1 });

    expect(hd).toBeInstanceOf(HDKeyring);
    expect(hd.id).toBe('a');
    expect(pk).toBeInstanceOf(PrivateKeyKeyring);
    expect(pk.id).toBe('b');
  });
});

describe('hasCachedSeed / withCachedSeed', () => {
  const hd: KeyringRecord = { id: 'a', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1 };
  const pk: KeyringRecord = { id: 'b', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 1 };

  it('reports whether an HD record has a seed', () => {
    expect(hasCachedSeed(hd)).toBe(false);
    expect(hasCachedSeed({ ...hd, seed: '' })).toBe(false);
    expect(hasCachedSeed({ ...hd, seed: SEED_HEX })).toBe(true);
    expect(hasCachedSeed(pk)).toBe(true);
  });

  it('returns records that need no seed unchanged', async () => {
    const cached = { ...hd, seed: SEED_HEX };

    expect(await withCachedSeed(pk)).toBe(pk);
    expect(await withCachedSeed(cached)).toBe(cached);
  });

  it('adds the seed to HD records', async () => {
    expect(await withCachedSeed(hd)).toEqual({ ...hd, seed: SEED_HEX });
  });
});

describe('isValidPrivateKeyHex', () => {
  it('accepts 64 hex characters with optional 0x and whitespace', () => {
    expect(isValidPrivateKeyHex(PRIVATE_KEY)).toBe(true);
    expect(isValidPrivateKeyHex(` 0x${PRIVATE_KEY.toUpperCase()} `)).toBe(true);
  });

  it.each(['', '0x', '01'.repeat(31), '01'.repeat(33), `${'01'.repeat(31)}zz`, '00'.repeat(32), CURVE_ORDER])('rejects %p', (value) => {
    expect(isValidPrivateKeyHex(value)).toBe(false);
  });
});
