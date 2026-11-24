import { isAppError } from '../../../src/core/errors';
import { isValidMnemonic } from '../../../src/crypto/mnemonic';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { SecureBiometricCredentialRepository } from '../../../src/repositories/biometric-credential.repository';
import { StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { BiometricOutcome, MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { VaultService } from '../../../src/services/vault.service';
import { WalletService } from '../../../src/services/wallet.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError, createFakeRegistry } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '1'.repeat(64);
const OTHER_MNEMONIC = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const setup = async () => {
  const env = createTestContainer();
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

  return { ...env, wallet: env.container.walletService, accounts: env.container.accountService, account };
};

describe('WalletService', () => {
  describe('status', () => {
    it('moves from empty to unlocked to locked', async () => {
      const { container } = createTestContainer();

      expect(await container.walletService.getStatus()).toBe('empty');
      await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
      expect(await container.walletService.getStatus()).toBe('unlocked');
      container.walletService.lock();
      expect(await container.walletService.getStatus()).toBe('locked');
      expect(container.keyringSession.isUnlocked()).toBe(false);
    });
  });

  it('generates valid 24 word mnemonics', () => {
    const { container } = createTestContainer();
    const mnemonic = container.walletService.generateMnemonic();

    expect(mnemonic.split(' ')).toHaveLength(24);
    expect(isValidMnemonic(mnemonic)).toBe(true);
    expect(container.walletService.generateMnemonic()).not.toBe(mnemonic);
  });

  it('applies the extension password rules: 8~256 characters and a zxcvbn score of 2+', () => {
    const { container } = createTestContainer();

    expect(() => container.walletService.validatePassword('Ab3$xyz')).toThrow('8~256 characters');
    expect(() => container.walletService.validatePassword('12345678')).toThrow('too simple');
    expect(() => container.walletService.validatePassword('password')).toThrow('too simple');
    expect(() => container.walletService.validatePassword(TEST_PASSWORD)).not.toThrow();
  });

  describe('createWallet', () => {
    it('normalizes the mnemonic and names the first account', async () => {
      const { container } = createTestContainer();
      const account = await container.walletService.createWallet({ mnemonic: `  ${TEST_MNEMONIC.toUpperCase()}  `, password: TEST_PASSWORD, accountName: 'Main' });

      expect(account).toMatchObject({ name: 'Main', hdIndex: 0, keyringType: 'HD_WALLET' });
      expect(container.accountService.getCurrentAccount()?.id).toBe(account.id);
      await expect(container.walletService.revealMnemonic(account.keyringId, TEST_PASSWORD)).resolves.toBe(TEST_MNEMONIC);
    });

    it('rejects an invalid mnemonic or a short password without creating a vault', async () => {
      const { container, secureStore } = createTestContainer();

      expect(await codeOf(() => container.walletService.createWallet({ mnemonic: 'abandon abandon abandon', password: TEST_PASSWORD }))).toBe('INVALID_MNEMONIC');
      expect(await codeOf(() => container.walletService.createWallet({ mnemonic: TEST_MNEMONIC.replace(/about$/, 'abandon'), password: TEST_PASSWORD }))).toBe('INVALID_MNEMONIC');
      expect(await codeOf(() => container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: 'short' }))).toBe('WEAK_PASSWORD');
      expect(await secureStore.hasItem(SecureKey.VAULT)).toBe(false);
    });

    it('refuses a second wallet on the device', async () => {
      const { wallet, accounts } = await setup();

      expect(await codeOf(() => wallet.createWallet({ mnemonic: OTHER_MNEMONIC, password: TEST_PASSWORD }))).toBe('WALLET_ALREADY_EXISTS');
      expect(accounts.getAccounts()).toHaveLength(1);
    });

    it('drops stale account metadata left from a previous wallet', async () => {
      const { container, keyValueStore } = createTestContainer();

      container.accountService.clear();
      keyValueStore.setString('accounts', JSON.stringify({ accounts: [{ id: 'stale', keyringId: 'gone' }], currentAccountId: 'stale' }));
      const account = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

      expect(container.accountService.getAccounts()).toEqual([account]);
    });
  });

  describe('unlock', () => {
    it('rejects a wrong password and stays locked', async () => {
      const { wallet } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.unlock('wrong password'))).toBe('INVALID_PASSWORD');
      expect(await wallet.getStatus()).toBe('locked');
      await wallet.unlock(TEST_PASSWORD);
      expect(await wallet.getStatus()).toBe('unlocked');
    });

    it('fails without a wallet', async () => {
      const { container } = createTestContainer();

      expect(await codeOf(() => container.walletService.unlock(TEST_PASSWORD))).toBe('WALLET_NOT_FOUND');
    });

    it('rebuilds one account per keyring when general storage was lost', async () => {
      const { wallet, accounts, account, keyValueStore } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      await accounts.createAccount(account.keyringId, 'HD_WALLET');
      wallet.lock();
      keyValueStore.clearAll();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts().map(item => [item.keyringId, item.hdIndex, item.publicKey])).toEqual([
        [account.keyringId, 0, account.publicKey],
        [imported.keyringId, 0, imported.publicKey],
      ]);
    });

    it('keeps existing accounts untouched', async () => {
      const { wallet, accounts } = await setup();
      const before = accounts.getAccounts();

      wallet.lock();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts()).toEqual(before);
    });
  });

  describe('biometrics', () => {
    it('reports the device biometry kind', async () => {
      const { wallet, secureStore } = await setup();

      expect(await wallet.getBiometryKind()).toBe(secureStore.biometryKind);
      secureStore.biometryKind = null;
      expect(await wallet.getBiometryKind()).toBeNull();
    });

    it('cannot unlock with biometrics before enabling it', async () => {
      const { wallet } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('BIOMETRICS_UNAVAILABLE');
    });

    it('enables biometric unlock only with the right password on a capable device', async () => {
      const { wallet, secureStore } = await setup();

      expect(await codeOf(() => wallet.enableBiometricUnlock('wrong password'))).toBe('INVALID_PASSWORD');
      expect(await wallet.isBiometricUnlockEnabled()).toBe(false);
      secureStore.biometryKind = null;
      expect(await codeOf(() => wallet.enableBiometricUnlock(TEST_PASSWORD))).toBe('BIOMETRICS_UNAVAILABLE');
      expect(await secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD)).toBe(false);
    });

    it('unlocks with biometrics, also during a password lockout', async () => {
      let now = 1_000_000;
      const env = createTestContainer({ now: () => now });
      const wallet = env.container.walletService;

      await wallet.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      expect(await wallet.isBiometricUnlockEnabled()).toBe(true);
      wallet.lock();

      for (let i = 0; i < 5; i++) {
        await catchError(() => wallet.unlock('wrong password'));
      }

      expect(await codeOf(() => wallet.unlock(TEST_PASSWORD))).toBe('PASSWORD_ATTEMPTS_EXCEEDED');
      await wallet.unlockWithBiometrics({ title: 'Unlock' });
      expect(await wallet.getStatus()).toBe('unlocked');
      wallet.lock();
      now += 1;
      await expect(wallet.unlock(TEST_PASSWORD)).resolves.toBeUndefined();
    });

    it('surfaces a canceled biometric prompt', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      wallet.lock();
      secureStore.biometricOutcome = BiometricOutcome.CANCEL;
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('BIOMETRICS_CANCELED');
      expect(await wallet.getStatus()).toBe('locked');
    });

    it('is disabled when the credential is gone even if the preference is on', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      await secureStore.removeItem(SecureKey.BIOMETRIC_PASSWORD);
      expect(await wallet.isBiometricUnlockEnabled()).toBe(false);
    });

    it('disables biometric unlock', async () => {
      const { wallet, container, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      await wallet.disableBiometricUnlock();
      expect(await wallet.isBiometricUnlockEnabled()).toBe(false);
      expect(container.preferenceService.get().biometricUnlockEnabled).toBe(false);
      expect(await secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD)).toBe(false);
    });

    it('rejects a stale escrowed password after a password change', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      await secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, 'old password');
      wallet.lock();
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('INVALID_PASSWORD');
    });
  });

  describe('revealMnemonic', () => {
    it('requires the password and an HD keyring', async () => {
      const { wallet, account } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      expect(await codeOf(() => wallet.revealMnemonic(account.keyringId, 'wrong password'))).toBe('INVALID_PASSWORD');
      expect(await codeOf(() => wallet.revealMnemonic(imported.keyringId, TEST_PASSWORD))).toBe('INVALID_REQUEST');
    });

    it('requires an unlocked wallet', async () => {
      const { wallet, account } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.revealMnemonic(account.keyringId, TEST_PASSWORD))).toBe('WALLET_LOCKED');
    });
  });

  describe('addMnemonicKeyring', () => {
    it('adds and selects the first account of a new recovery phrase', async () => {
      const { wallet, accounts, account } = await setup();
      const added = await wallet.addMnemonicKeyring(OTHER_MNEMONIC, TEST_PASSWORD, 'Second');

      expect(added).toMatchObject({ name: 'Second', hdIndex: 0, keyringType: 'HD_WALLET' });
      expect(added.keyringId).not.toBe(account.keyringId);
      expect(accounts.getCurrentAccount()?.id).toBe(added.id);
      await expect(wallet.revealMnemonic(added.keyringId, TEST_PASSWORD)).resolves.toBe(OTHER_MNEMONIC);
    });

    it('defaults the account name', async () => {
      const { wallet } = await setup();

      expect((await wallet.addMnemonicKeyring(OTHER_MNEMONIC, TEST_PASSWORD)).name).toBe('Account 2');
    });

    it('rejects invalid, duplicate and unauthorized phrases', async () => {
      const { wallet, accounts } = await setup();

      expect(await codeOf(() => wallet.addMnemonicKeyring('not a phrase', TEST_PASSWORD))).toBe('INVALID_MNEMONIC');
      expect(await codeOf(() => wallet.addMnemonicKeyring(TEST_MNEMONIC, TEST_PASSWORD))).toBe('WALLET_ALREADY_EXISTS');
      expect(await codeOf(() => wallet.addMnemonicKeyring(OTHER_MNEMONIC, 'wrong password'))).toBe('INVALID_PASSWORD');
      expect(accounts.getAccounts()).toHaveLength(1);
    });

    it('rejects a phrase that is already loaded even after its first account was removed', async () => {
      const { wallet, accounts, account } = await setup();

      await accounts.createAccount(account.keyringId, 'HD_WALLET');
      await wallet.removeAccount(account.id, TEST_PASSWORD);
      expect(await codeOf(() => wallet.addMnemonicKeyring(TEST_MNEMONIC, TEST_PASSWORD))).toBe('WALLET_ALREADY_EXISTS');
    });

    it('needs an unlocked session and recovers the account on the next unlock', async () => {
      const { wallet, accounts } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.addMnemonicKeyring(OTHER_MNEMONIC, TEST_PASSWORD))).toBe('WALLET_LOCKED');
      expect(accounts.getAccounts()).toHaveLength(1);
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts()).toHaveLength(2);
    });
  });

  describe('importPrivateKey', () => {
    it('accepts 0x-prefixed upper-case hex', async () => {
      const { wallet } = await setup();
      const imported = await wallet.importPrivateKey(` 0x${'A'.repeat(64)} `, TEST_PASSWORD, 'Imported');

      expect(imported).toMatchObject({ name: 'Imported', keyringType: 'PRIVATE_KEY', hdIndex: 0 });
      expect(await codeOf(() => wallet.importPrivateKey('a'.repeat(64), TEST_PASSWORD))).toBe('WALLET_ALREADY_EXISTS');
    });

    it.each([['too short', 'abcd'], ['zero key', '0'.repeat(64)], ['above the curve order', 'f'.repeat(64)], ['not hex', 'z'.repeat(64)]])(
      'rejects a %s',
      async (_, key) => {
        const { wallet } = await setup();

        expect(await codeOf(() => wallet.importPrivateKey(key, TEST_PASSWORD))).toBe('INVALID_REQUEST');
      },
    );

    it('rejects a key already derived from the recovery phrase', async () => {
      const { container, wallet, account } = await setup();
      const hex = await container.keyringSession.withKeyPair(account.keyringId, 0, async pair => Buffer.from(pair.privateKey).toString('hex'));

      expect(await codeOf(() => wallet.importPrivateKey(hex, TEST_PASSWORD))).toBe('WALLET_ALREADY_EXISTS');
    });
  });

  it('loads the submitted record when the saved vault content omits it', async () => {
    const store = new MemoryKeyValueStore();
    const session = new KeyringSession();
    const secureStore = new MemorySecureStore();
    const accountService = new AccountService(new StorageAccountRepository(store), session, createFakeRegistry().registry);
    const vault = { addKeyring: jest.fn(async () => ({ keyrings: [] })) } as unknown as VaultService;
    const wallet = new WalletService(vault, session, accountService, [], new SecureBiometricCredentialRepository(secureStore), new StoragePreferenceRepository(store));

    session.open([]);
    const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

    expect(accountService.getCurrentAccount()?.id).toBe(imported.id);
    await expect(session.withKeyPair(imported.keyringId, 0, async () => 'loaded')).resolves.toBe('loaded');
  });

  describe('removeAccount', () => {
    it('requires the password and keeps everything on failure', async () => {
      const { wallet, accounts } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      expect(await codeOf(() => wallet.removeAccount(imported.id, 'wrong password'))).toBe('INVALID_PASSWORD');
      expect(accounts.getAccounts()).toHaveLength(2);
    });

    it('refuses to remove the last account', async () => {
      const { wallet, account } = await setup();

      expect(await codeOf(() => wallet.removeAccount(account.id, TEST_PASSWORD))).toBe('INVALID_REQUEST');
    });

    it('drops per-account data of the removed account only', async () => {
      const { container, wallet, account } = await setup();
      const network = container.networkService.getCurrentNetwork();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      for (const owner of [account, imported]) {
        container.nftService.setPinned(owner, network, 'gno.land/r/demo/nft', true);
        container.tokenService.setVisibility(owner, network, 'x', true);
      }

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      expect(container.nftService.getPreferences(imported, network).pinned).toEqual([]);
      expect(container.nftService.getPreferences(account, network).pinned).toEqual(['gno.land/r/demo/nft']);
      expect(container.tokenService.getStoredToken(imported, network, 'x')).toBeUndefined();
      expect(container.accountService.getCurrentAccount()?.id).toBe(account.id);
    });

    it('keeps the keyring while it still has accounts', async () => {
      const { container, wallet, accounts, account } = await setup();
      const second = await accounts.createAccount(account.keyringId, 'HD_WALLET');

      await wallet.removeAccount(account.id, TEST_PASSWORD);
      wallet.lock();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts().map(item => item.id)).toEqual([second.id]);
      await expect(container.keyringSession.withKeyPair(account.keyringId, 1, async () => 'ok')).resolves.toBe('ok');
    });

    it('removes the keyring with its last account', async () => {
      const { container, wallet, accounts } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      wallet.lock();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts()).toHaveLength(1);
      expect(await codeOf(() => container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 0))).toBe('WALLET_NOT_FOUND');
    });

    it('wipes the removed keyring from the live session without a lock', async () => {
      const { container, wallet } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      expect(await codeOf(() => container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 0))).toBe('WALLET_NOT_FOUND');
    });

    it('keeps the account when the vault update fails', async () => {
      const { container, wallet, accounts, secureStore } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD);

      const setItem = secureStore.setItem.bind(secureStore);

      jest.spyOn(secureStore, 'setItem').mockImplementation(async (key, value, options) => {
        if (key === SecureKey.VAULT_STAGING) {
          throw new Error('keychain write failed');
        }

        return setItem(key, value, options);
      });
      await expect(wallet.removeAccount(imported.id, TEST_PASSWORD)).rejects.toThrow('keychain write failed');
      expect(accounts.getAccounts().map(item => item.id)).toContain(imported.id);
      await expect(container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 'ok')).resolves.toBe('ok');
    });
  });

  describe('concurrency', () => {
    it('does not let an account creation outlive the removal of its keyring', async () => {
      const { wallet, accounts, container } = await setup();
      const other = await wallet.addMnemonicKeyring(OTHER_MNEMONIC, TEST_PASSWORD);
      const removing = wallet.removeAccount(other.id, TEST_PASSWORD);
      const creating = accounts.createAccount(other.keyringId, 'HD_WALLET');

      await removing;
      expect(await codeOf(() => creating)).toBe('WALLET_NOT_FOUND');
      expect(accounts.getAccounts().some(item => item.keyringId === other.keyringId)).toBe(false);
      expect((await container.walletService.getStatus())).toBe('unlocked');
    });

    it('drops a wallet creation queued before a reset instead of recreating the vault', async () => {
      const { container, secureStore } = createTestContainer();
      const creating = container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

      await container.appResetService.resetAll();
      expect(await codeOf(() => creating)).toBe('WALLET_LOCKED');
      expect(await secureStore.hasItem(SecureKey.VAULT)).toBe(false);
      expect(await secureStore.hasItem(SecureKey.VAULT_STAGING)).toBe(false);
    });

    it('gives overlapping account creations distinct indexes and keeps both', async () => {
      const { accounts, account } = await setup();
      const created = await Promise.all([
        accounts.createAccount(account.keyringId, 'HD_WALLET'),
        accounts.createAccount(account.keyringId, 'HD_WALLET'),
      ]);

      expect(created.map(item => item.hdIndex).sort()).toEqual([1, 2]);
      expect(accounts.getAccounts().map(item => item.id)).toEqual([account.id, ...created.map(item => item.id)]);
    });

    it('keeps a rename made while an account is being derived', async () => {
      const { accounts, account } = await setup();
      const creating = accounts.createAccount(account.keyringId, 'HD_WALLET');

      accounts.renameAccount(account.id, 'Renamed');
      await creating;
      expect(accounts.getAccount(account.id).name).toBe('Renamed');
    });

    it('accepts only one of two overlapping imports of the same key', async () => {
      const { wallet, accounts } = await setup();
      const results = await Promise.allSettled([
        wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD),
        wallet.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD),
      ]);

      expect(results.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect(accounts.getAccounts()).toHaveLength(2);
    });

    it('does not reopen the session when a lock lands during an unlock', async () => {
      const { container, wallet } = await setup();

      wallet.lock();
      const unlocking = wallet.unlock(TEST_PASSWORD);

      wallet.lock();
      expect(await codeOf(() => unlocking)).toBe('WALLET_LOCKED');
      expect(container.keyringSession.isUnlocked()).toBe(false);
    });

    it('does not restore old accounts after a reset that lands during an unlock', async () => {
      const { container, wallet, accounts, secureStore } = await setup();
      const getItem = secureStore.getItem.bind(secureStore);
      let release!: () => void;
      let vaultRead!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const reading = new Promise<void>((resolve) => {
        vaultRead = resolve;
      });

      // The old vault is read, then the unlock stalls (scrypt) while the reset runs.
      jest.spyOn(secureStore, 'getItem').mockImplementation(async (key) => {
        const value = await getItem(key);

        if (key === SecureKey.VAULT) {
          vaultRead();
          await gate;
        }

        return value;
      });
      wallet.lock();
      const unlocking = wallet.unlock(TEST_PASSWORD);

      await reading;
      // The reset closes the session right away and waits for the vault queue.
      const resetting = container.appResetService.resetAll();

      release();
      await resetting;
      expect(await codeOf(() => unlocking)).toBe('WALLET_LOCKED');
      expect(container.keyringSession.isUnlocked()).toBe(false);
      expect(accounts.getAccounts()).toEqual([]);
      expect(await wallet.getStatus()).toBe('empty');
    });
  });
});
