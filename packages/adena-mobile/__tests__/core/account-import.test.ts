import {
  AdenaWallet,
  isHDWalletKeyring,
  libsodiumCryptoProvider,
  setCryptoProvider,
} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';

import {
  deriveAccounts,
  findSeedKeyring,
  withNewSeedPhrase,
  withPrivateKeyAccount,
  withSeedAccounts,
} from '../../src/core/account-import';

jest.setTimeout(60_000);

// Public BIP39 test vectors and a dummy key: never real secrets.
const PHRASE_A = `${'abandon '.repeat(11)}about`;
const PHRASE_B =
  'legal winner thank year wave sausage worth useful legal winner thank yellow';
const DUMMY_KEY = '11'.repeat(32);
const PREFIX = 'g';

beforeAll(async () => {
  await sodium.ready;
  setCryptoProvider(libsodiumCryptoProvider);
});

const addressesOf = (wallet: AdenaWallet) =>
  Promise.all(wallet.accounts.map(account => account.getAddress(PREFIX)));

describe('account import', () => {
  it('adds a new seed phrase as its own keyring and first account', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    const result = await withNewSeedPhrase(wallet, PHRASE_B);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.next.keyrings.filter(isHDWalletKeyring)).toHaveLength(2);
    expect(result.next.accounts).toHaveLength(2);
    expect(result.added[0].name).toBe('Account 2');
    // The original wallet is left untouched.
    expect(wallet.accounts).toHaveLength(1);
  });

  it('refuses a phrase the wallet already has', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    expect(findSeedKeyring(wallet, PHRASE_A)).not.toBeNull();
    expect(await withNewSeedPhrase(wallet, PHRASE_A)).toEqual({
      ok: false,
      reason: 'exists',
    });
  });

  it('lists derived accounts and marks the ones already added', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    const keyring = findSeedKeyring(wallet, PHRASE_A)!;
    const derived = await deriveAccounts(wallet, keyring, PREFIX, 0);
    expect(derived.map(item => item.hdPath)).toEqual([0, 1, 2, 3, 4]);
    expect(derived[0].stored).toBe(true);
    expect(derived.slice(1).every(item => !item.stored)).toBe(true);
    expect(derived[0].address).toBe((await addressesOf(wallet))[0]);
  });

  it('imports chosen accounts of another phrase in path order, once each', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    const result = await withSeedAccounts(wallet, PHRASE_B, [3, 1, 3], PREFIX);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.added.map(account => account.name)).toEqual([
      'Account 2',
      'Account 3',
    ]);
    const addresses = await addressesOf(result.next);
    expect(new Set(addresses).size).toBe(3);

    // Importing the same accounts again adds nothing.
    expect(
      await withSeedAccounts(result.next, PHRASE_B, [1, 3], PREFIX),
    ).toEqual({ok: false, reason: 'nothing-selected'});
  });

  it('reuses the keyring when more accounts of a known phrase are imported', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    const result = await withSeedAccounts(wallet, PHRASE_A, [0, 2], PREFIX);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.added).toHaveLength(1);
    expect(result.next.keyrings.filter(isHDWalletKeyring)).toHaveLength(1);
  });

  it('adds a private key account once', async () => {
    const wallet = await AdenaWallet.createByMnemonic(PHRASE_A);
    const result = await withPrivateKeyAccount(wallet, DUMMY_KEY, PREFIX);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.next.accounts).toHaveLength(2);
    expect(
      await withPrivateKeyAccount(result.next, DUMMY_KEY, PREFIX),
    ).toEqual({ok: false, reason: 'exists'});
  });
});
