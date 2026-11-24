import { isAppError } from '../../../src/core/errors';
import { deriveKeyPair } from '../../../src/crypto/key-pair';
import { KeyringType } from '../../../src/crypto/keyring';
import { isValidMnemonic, mnemonicToSeed } from '../../../src/crypto/mnemonic';
import { isAvatarColor } from '../../../src/domain/account';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { SecureBiometricCredentialRepository } from '../../../src/repositories/biometric-credential.repository';
import { StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { BiometricOutcome, MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { VaultService } from '../../../src/services/vault.service';
import { ENABLE_BIOMETRICS_PROMPT, WalletService } from '../../../src/services/wallet.service';
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
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

      await accounts.createAccount(account.keyringId, 'HD_WALLET');
      wallet.lock();
      keyValueStore.clearAll();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts().map(item => [item.keyringId, item.hdIndex, item.publicKey])).toEqual([
        [account.keyringId, 0, account.publicKey],
        [imported.keyringId, 0, imported.publicKey],
      ]);
    });

    it('still unlocks when a keyring holds the same key as another after general storage was lost', async () => {
      const { wallet, accounts, account, keyValueStore } = await setup();
      const second = await accounts.createAccount(account.keyringId, 'HD_WALLET');
      const first = deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), 0);

      // The first HD account is removed, then its key is imported on its own.
      await wallet.removeAccount(account.id, TEST_PASSWORD);
      const imported = await wallet.importPrivateKey(Buffer.from(first.privateKey).toString('hex'), TEST_PASSWORD);

      wallet.lock();
      keyValueStore.clearAll();
      await expect(wallet.unlock(TEST_PASSWORD)).resolves.toBeUndefined();
      expect(accounts.getAccounts().map(item => item.publicKey)).toEqual([account.publicKey]);
      expect(imported.publicKey).toBe(account.publicKey);
      expect(second.publicKey).not.toBe(account.publicKey);

      wallet.lock();
      await expect(wallet.unlock(TEST_PASSWORD)).resolves.toBeUndefined();
    });

    it('closes the session when rebuilding accounts fails', async () => {
      const { container, wallet, accounts, keyValueStore } = await setup();

      wallet.lock();
      keyValueStore.clearAll();
      jest.spyOn(accounts, 'appendAccount').mockRejectedValueOnce(new Error('Storage write failed'));
      await expect(wallet.unlock(TEST_PASSWORD)).rejects.toThrow('Storage write failed');
      expect(container.keyringSession.isUnlocked()).toBe(false);
      expect(await wallet.getStatus()).toBe('locked');
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

    it('reports an invalidated credential when the item is unreadable while the preference is on', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      wallet.lock();
      await secureStore.removeItem(SecureKey.BIOMETRIC_PASSWORD);
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('BIOMETRICS_INVALIDATED');
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

    describe('right after creation', () => {
      let verify: jest.SpyInstance;

      beforeEach(() => {
        verify = jest.spyOn(VaultService.prototype, 'verifyPassword');
      });

      afterEach(() => verify.mockRestore());

      it('skips the second password check and asks with the enable prompt', async () => {
        const { wallet, secureStore } = await setup();
        const setItem = jest.spyOn(secureStore, 'setItem');

        await wallet.enableBiometricUnlock(TEST_PASSWORD);
        expect(verify).not.toHaveBeenCalled();
        expect(setItem).toHaveBeenCalledWith(SecureKey.BIOMETRIC_PASSWORD, TEST_PASSWORD, expect.objectContaining({ prompt: ENABLE_BIOMETRICS_PROMPT }));
        expect(await wallet.isBiometricUnlockEnabled()).toBe(true);

        // One-shot: the next call verifies again.
        await wallet.enableBiometricUnlock(TEST_PASSWORD);
        expect(verify).toHaveBeenCalledTimes(1);
      });

      it('verifies again after a lock', async () => {
        const { wallet } = await setup();

        wallet.lock();
        await wallet.unlock(TEST_PASSWORD);
        await wallet.enableBiometricUnlock(TEST_PASSWORD);
        expect(verify).toHaveBeenCalledTimes(1);
      });

      it('verifies again after another vault write', async () => {
        const { wallet } = await setup();

        await wallet.importPrivateKey(PRIVATE_KEY);
        await wallet.enableBiometricUnlock(TEST_PASSWORD);
        expect(verify).toHaveBeenCalledTimes(1);
      });

      it('still rejects a different password', async () => {
        const { wallet } = await setup();

        expect(await codeOf(() => wallet.enableBiometricUnlock('wrong password'))).toBe('INVALID_PASSWORD');
        expect(verify).toHaveBeenCalledTimes(1);
      });
    });

    it('rejects a stale escrowed password after a password change', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      await secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, 'old password');
      wallet.lock();
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('INVALID_PASSWORD');
    });
  });

  describe('changePassword', () => {
    const NEXT_PASSWORD = 'another sturdy passphrase 42';

    it('re-encrypts the vault with the new password', async () => {
      const { wallet } = await setup();

      await wallet.changePassword(TEST_PASSWORD, NEXT_PASSWORD);
      wallet.lock();
      expect(await codeOf(() => wallet.unlock(TEST_PASSWORD))).toBe('INVALID_PASSWORD');
      await expect(wallet.unlock(NEXT_PASSWORD)).resolves.toBeUndefined();
    });

    it('rejects a wrong current password and a weak or unchanged new one', async () => {
      const { wallet } = await setup();

      expect(await codeOf(() => wallet.changePassword('wrong password', NEXT_PASSWORD))).toBe('INVALID_PASSWORD');
      expect(await codeOf(() => wallet.changePassword(TEST_PASSWORD, '12345678'))).toBe('WEAK_PASSWORD');
      expect(await codeOf(() => wallet.changePassword(TEST_PASSWORD, TEST_PASSWORD))).toBe('WEAK_PASSWORD');
      wallet.lock();
      await expect(wallet.unlock(TEST_PASSWORD)).resolves.toBeUndefined();
    });

    it('drops a change queued before a lock', async () => {
      const { wallet } = await setup();
      const changing = wallet.changePassword(TEST_PASSWORD, NEXT_PASSWORD);

      wallet.lock();
      expect(await codeOf(() => changing)).toBe('WALLET_LOCKED');
      await expect(wallet.unlock(TEST_PASSWORD)).resolves.toBeUndefined();
    });

    it('removes the escrowed password before re-encrypting so the old one is never left stored', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      await wallet.changePassword(TEST_PASSWORD, NEXT_PASSWORD);
      expect(await secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD)).toBe(false);
      wallet.lock();
      // The stale setting is turned off instead of failing on every lock.
      expect(await codeOf(() => wallet.unlockWithBiometrics({ title: 'Unlock' }))).toBe('BIOMETRICS_INVALIDATED');
      expect(await wallet.isBiometricUnlockEnabled()).toBe(false);

      await wallet.unlock(NEXT_PASSWORD);
      await wallet.enableBiometricUnlock(NEXT_PASSWORD);
      wallet.lock();
      await expect(wallet.unlockWithBiometrics({ title: 'Unlock' })).resolves.toBeUndefined();
    });

    it('keeps the escrowed password when the current password is wrong', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      expect(await codeOf(() => wallet.changePassword('wrong password', NEXT_PASSWORD))).toBe('INVALID_PASSWORD');
      expect(await secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD)).toBe(true);
    });

    it('does not re-encrypt when the escrowed password cannot be removed', async () => {
      const { wallet, secureStore } = await setup();

      await wallet.enableBiometricUnlock(TEST_PASSWORD);
      const removeItem = jest.spyOn(secureStore, 'removeItem').mockRejectedValueOnce(new Error('keychain busy'));

      await expect(wallet.changePassword(TEST_PASSWORD, NEXT_PASSWORD)).rejects.toThrow('keychain busy');
      removeItem.mockRestore();
      wallet.lock();
      await expect(wallet.unlockWithBiometrics({ title: 'Unlock' })).resolves.toBeUndefined();
    });
  });

  describe('revealMnemonic', () => {
    it('requires the password and an HD keyring', async () => {
      const { wallet, account } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

      expect(await codeOf(() => wallet.revealMnemonic(account.keyringId, 'wrong password'))).toBe('INVALID_PASSWORD');
      expect(await codeOf(() => wallet.revealMnemonic(imported.keyringId, TEST_PASSWORD))).toBe('INVALID_REQUEST');
    });

    it('requires an unlocked wallet', async () => {
      const { wallet, account } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.revealMnemonic(account.keyringId, TEST_PASSWORD))).toBe('WALLET_LOCKED');
    });
  });

  it('gives the wallet\'s first account the default color and later created or imported ones a preset', async () => {
    const { wallet, account } = await setup();
    const added = await wallet.addMnemonicKeyring(OTHER_MNEMONIC);
    const imported = await wallet.importPrivateKey(PRIVATE_KEY);

    expect(account.avatarColor).toBeUndefined();
    expect(isAvatarColor(added.avatarColor)).toBe(true);
    expect(isAvatarColor(imported.avatarColor)).toBe(true);
  });

  describe('addMnemonicKeyring', () => {
    it('adds and selects the first account of a new recovery phrase', async () => {
      const { wallet, accounts, account } = await setup();
      const added = await wallet.addMnemonicKeyring(OTHER_MNEMONIC, 'Second');

      expect(added).toMatchObject({ name: 'Second', hdIndex: 0, keyringType: 'HD_WALLET' });
      expect(added.keyringId).not.toBe(account.keyringId);
      expect(accounts.getCurrentAccount()?.id).toBe(added.id);
      await expect(wallet.revealMnemonic(added.keyringId, TEST_PASSWORD)).resolves.toBe(OTHER_MNEMONIC);
    });

    it('defaults the account name', async () => {
      const { wallet } = await setup();

      expect((await wallet.addMnemonicKeyring(OTHER_MNEMONIC)).name).toBe('Account 2');
    });

    it('rejects invalid, duplicate and unauthorized phrases', async () => {
      const { wallet, accounts } = await setup();

      expect(await codeOf(() => wallet.addMnemonicKeyring('not a phrase'))).toBe('INVALID_MNEMONIC');
      expect(await codeOf(() => wallet.addMnemonicKeyring(TEST_MNEMONIC))).toBe('WALLET_ALREADY_EXISTS');
      expect(accounts.getAccounts()).toHaveLength(1);
    });

    it('rejects a phrase that is already loaded even after its first account was removed', async () => {
      const { wallet, accounts, account } = await setup();

      await accounts.createAccount(account.keyringId, 'HD_WALLET');
      await wallet.removeAccount(account.id, TEST_PASSWORD);
      expect(await codeOf(() => wallet.addMnemonicKeyring(TEST_MNEMONIC))).toBe('WALLET_ALREADY_EXISTS');
    });

    it('needs an unlocked session and leaves the vault untouched while locked', async () => {
      const { wallet, accounts } = await setup();

      wallet.lock();
      expect(await codeOf(() => wallet.addMnemonicKeyring(OTHER_MNEMONIC))).toBe('WALLET_LOCKED');
      expect(accounts.getAccounts()).toHaveLength(1);
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts()).toHaveLength(1);
    });
  });

  describe('importPrivateKey', () => {
    it('accepts 0x-prefixed upper-case hex', async () => {
      const { wallet } = await setup();
      const imported = await wallet.importPrivateKey(` 0x${'A'.repeat(64)} `, 'Imported');

      expect(imported).toMatchObject({ name: 'Imported', keyringType: 'PRIVATE_KEY', hdIndex: 0 });
      expect(await codeOf(() => wallet.importPrivateKey('a'.repeat(64)))).toBe('WALLET_ALREADY_EXISTS');
    });

    it.each([['too short', 'abcd'], ['zero key', '0'.repeat(64)], ['above the curve order', 'f'.repeat(64)], ['not hex', 'z'.repeat(64)]])(
      'rejects a %s',
      async (_, key) => {
        const { wallet } = await setup();

        expect(await codeOf(() => wallet.importPrivateKey(key))).toBe('INVALID_REQUEST');
      },
    );

    it('rejects a key already derived from the recovery phrase', async () => {
      const { container, wallet, account } = await setup();
      const hex = await container.keyringSession.withKeyPair(account.keyringId, 0, async pair => Buffer.from(pair.privateKey).toString('hex'));

      expect(await codeOf(() => wallet.importPrivateKey(hex))).toBe('WALLET_ALREADY_EXISTS');
    });
  });

  it('loads the submitted record when the saved vault content omits it', async () => {
    const store = new MemoryKeyValueStore();
    const session = new KeyringSession();
    const secureStore = new MemorySecureStore();
    const accountService = new AccountService(new StorageAccountRepository(store), session, createFakeRegistry().registry);
    const vault = { addKeyringWithSessionKey: jest.fn(async () => ({ keyrings: [] })) } as unknown as VaultService;
    const wallet = new WalletService(vault, session, accountService, [], new SecureBiometricCredentialRepository(secureStore), new StoragePreferenceRepository(store));

    session.open([]);
    const imported = await wallet.importPrivateKey(PRIVATE_KEY);

    expect(accountService.getCurrentAccount()?.id).toBe(imported.id);
    await expect(session.withKeyPair(imported.keyringId, 0, async () => 'loaded')).resolves.toBe('loaded');
  });

  describe('removeAccount', () => {
    it('requires the password and keeps everything on failure', async () => {
      const { wallet, accounts } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

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
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

      for (const owner of [account, imported]) {
        container.connectedAppService.touch('https://dapp.example.com', { name: 'Example' }, owner.id, network.id);
        container.nftService.setPinned(owner, network, 'gno.land/r/demo/nft', true);
        container.tokenService.setVisibility(owner, network, 'x', true);
      }

      container.accountPhotoService.save(account.id, 'data:image/jpeg;base64,AAAA');
      container.accountPhotoService.save(imported.id, 'data:image/jpeg;base64,BBBB');

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      expect(container.connectedAppService.getConnectedApps().map(app => app.accountId)).toEqual([account.id]);
      expect(container.accountPhotoService.get(imported.id)).toBeUndefined();
      expect(container.accountPhotoService.get(account.id)).toBe('data:image/jpeg;base64,AAAA');
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
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      wallet.lock();
      await wallet.unlock(TEST_PASSWORD);
      expect(accounts.getAccounts()).toHaveLength(1);
      expect(await codeOf(() => container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 0))).toBe('WALLET_NOT_FOUND');
    });

    it('wipes the removed keyring from the live session without a lock', async () => {
      const { container, wallet } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

      await wallet.removeAccount(imported.id, TEST_PASSWORD);
      expect(await codeOf(() => container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 0))).toBe('WALLET_NOT_FOUND');
    });

    it('keeps the account when the vault update fails', async () => {
      const { container, wallet, accounts, secureStore } = await setup();
      const imported = await wallet.importPrivateKey(PRIVATE_KEY);

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
      const other = await wallet.addMnemonicKeyring(OTHER_MNEMONIC);
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
        wallet.importPrivateKey(PRIVATE_KEY),
        wallet.importPrivateKey(PRIVATE_KEY),
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

describe('WalletService.readBiometricPassword', () => {
  it('releases the verified password once biometric unlock is enabled', async () => {
    const { wallet } = await setup();

    expect(await codeOf(() => wallet.readBiometricPassword({ title: 'Confirm' }))).toBe('BIOMETRICS_UNAVAILABLE');
    await wallet.enableBiometricUnlock(TEST_PASSWORD);
    await expect(wallet.readBiometricPassword({ title: 'Confirm' })).resolves.toBe(TEST_PASSWORD);
  });

  it('surfaces a canceled prompt and a stale escrowed password', async () => {
    const { wallet, secureStore } = await setup();

    await wallet.enableBiometricUnlock(TEST_PASSWORD);
    secureStore.biometricOutcome = BiometricOutcome.CANCEL;
    expect(await codeOf(() => wallet.readBiometricPassword({ title: 'Confirm' }))).toBe('BIOMETRICS_CANCELED');
    secureStore.biometricOutcome = BiometricOutcome.SUCCESS;
    await secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, 'old password');
    expect(await codeOf(() => wallet.readBiometricPassword({ title: 'Confirm' }))).toBe('INVALID_PASSWORD');
  });

  it('is not throttled and clears earlier typed failures', async () => {
    const { wallet, account } = await setup();

    await wallet.enableBiometricUnlock(TEST_PASSWORD);

    for (let i = 0; i < 5; i += 1) {
      await codeOf(() => wallet.revealMnemonic(account.keyringId, 'wrong password'));
    }

    expect(await codeOf(() => wallet.revealMnemonic(account.keyringId, TEST_PASSWORD))).toBe('PASSWORD_ATTEMPTS_EXCEEDED');
    const password = await wallet.readBiometricPassword({ title: 'Confirm' });

    await expect(wallet.revealMnemonic(account.keyringId, password)).resolves.toBe(TEST_MNEMONIC);
  });
});

describe('WalletService import without the password', () => {
  const vaultOf = (wallet: WalletService): VaultService => (wallet as unknown as { vaultService: VaultService }).vaultService;

  it('adds keyrings with the unlocked session key, and the vault still opens with the password', async () => {
    const { wallet, accounts } = await setup();

    await wallet.addMnemonicKeyring(OTHER_MNEMONIC, 'Second');
    await wallet.importPrivateKey(PRIVATE_KEY);
    wallet.lock();
    expect(vaultOf(wallet).hasSessionKey()).toBe(false);
    expect(await codeOf(() => wallet.importPrivateKey('02'.repeat(32)))).toBe('WALLET_LOCKED');

    await wallet.unlock(TEST_PASSWORD);
    expect(accounts.getAccounts()).toHaveLength(3);
    await expect(wallet.revealMnemonic(accounts.getAccounts()[1].keyringId, TEST_PASSWORD)).resolves.toBe(OTHER_MNEMONIC);
  });

  it('keeps importing after a password change, a removal and a biometric unlock', async () => {
    const { wallet, accounts } = await setup();
    const NEXT = 'another sturdy passphrase 42';

    await wallet.changePassword(TEST_PASSWORD, NEXT);
    const imported = await wallet.importPrivateKey(PRIVATE_KEY);

    await wallet.removeAccount(imported.id, NEXT);
    await wallet.addMnemonicKeyring(OTHER_MNEMONIC);
    await wallet.enableBiometricUnlock(NEXT);
    wallet.lock();
    await wallet.unlockWithBiometrics({ title: 'Unlock' });
    await wallet.importPrivateKey(PRIVATE_KEY);
    wallet.lock();
    await wallet.unlock(NEXT);
    expect(accounts.getAccounts()).toHaveLength(3);
    expect(vaultOf(wallet).hasSessionKey()).toBe(true);
  });

  it('wipes the session key on reset', async () => {
    const { container, wallet } = await setup();

    expect(vaultOf(wallet).hasSessionKey()).toBe(true);
    await container.appResetService.resetAll();
    expect(vaultOf(wallet).hasSessionKey()).toBe(false);
  });
});

describe('WalletService.restoreWallet', () => {
  const keyrings = [
    { id: 'hd', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1 },
    { id: 'pk', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 2 },
  ] as const;

  it('creates one vault with every keyring and rebuilds accounts at their indices', async () => {
    const { container } = createTestContainer();
    const selected = await container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [{ keyringId: 'hd', name: 'Main', hdIndex: 0 }, { keyringId: 'hd', name: 'Far', hdIndex: 4 }, { keyringId: 'pk', name: 'Key', hdIndex: 0 }],
      password: TEST_PASSWORD,
    });

    expect(selected.name).toBe('Main');
    expect(container.accountService.getCurrentAccount()?.id).toBe(selected.id);
    expect(container.accountService.getAccounts().map(item => [item.name, item.hdIndex])).toEqual([['Main', 0], ['Far', 4], ['Key', 0]]);
    expect(await container.walletService.getStatus()).toBe('unlocked');
  });

  it('lets the restored session import without the password', async () => {
    const { container } = createTestContainer();

    await container.walletService.restoreWallet({ keyrings: [keyrings[1]], accounts: [{ keyringId: 'pk', name: 'Key', hdIndex: 0 }], password: TEST_PASSWORD });
    await container.walletService.addMnemonicKeyring(OTHER_MNEMONIC);
    container.walletService.lock();
    await container.walletService.unlock(TEST_PASSWORD);
    expect(container.accountService.getAccounts()).toHaveLength(2);
  });

  it('adds index 0 for a keyring the backup lists without accounts', async () => {
    const { container } = createTestContainer();

    await container.walletService.restoreWallet({ keyrings: [...keyrings], accounts: [{ keyringId: 'pk', name: 'Key', hdIndex: 0 }], password: TEST_PASSWORD });
    expect(container.accountService.getAccounts().map(item => item.keyringId).sort()).toEqual(['hd', 'pk']);
  });

  it('rejects invalid input before touching storage', async () => {
    const { container } = createTestContainer();
    const restore = (input: Partial<Parameters<typeof container.walletService.restoreWallet>[0]>) => codeOf(() => container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [],
      password: TEST_PASSWORD,
      ...input,
    }));

    expect(await restore({ keyrings: [] })).toBe('INVALID_REQUEST');
    expect(await restore({ keyrings: [keyrings[0], keyrings[0]] })).toBe('INVALID_REQUEST');
    expect(await restore({ accounts: [{ keyringId: 'missing', name: 'x', hdIndex: 0 }] })).toBe('INVALID_REQUEST');
    expect(await restore({ keyrings: [{ ...keyrings[0], mnemonic: 'abandon' }] })).toBe('INVALID_REQUEST');
    expect(await restore({ keyrings: [{ ...keyrings[1], privateKey: 'zz' }] })).toBe('INVALID_REQUEST');
    expect(await restore({ password: 'short' })).toBe('WEAK_PASSWORD');
    // Hardened (2^31+) and out-of-range indices would only fail after the vault was written.
    expect(await restore({ accounts: [{ keyringId: 'hd', name: 'x', hdIndex: 2 ** 31 }] })).toBe('INVALID_REQUEST');
    expect(await restore({ accounts: [{ keyringId: 'hd', name: 'x', hdIndex: 2 ** 32 }] })).toBe('INVALID_REQUEST');
    expect(await restore({ accounts: [{ keyringId: 'hd', name: 'x', hdIndex: -1 }] })).toBe('INVALID_REQUEST');
    expect(await restore({ accounts: [{ keyringId: 'hd', name: 'x', hdIndex: 1 }, { keyringId: 'hd', name: 'y', hdIndex: 1 }] })).toBe('INVALID_REQUEST');
    expect(await container.walletService.getStatus()).toBe('empty');
  });

  it('restores avatar colors and the selected account', async () => {
    const { container } = createTestContainer();
    const selected = await container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [{ keyringId: 'hd', name: 'Main', hdIndex: 0 }, { keyringId: 'pk', name: 'Key', hdIndex: 0, avatarColor: 'teal' }],
      selected: { keyringId: 'pk', hdIndex: 0 },
      password: TEST_PASSWORD,
    });

    expect(selected).toMatchObject({ name: 'Key', avatarColor: 'teal' });
    expect(container.accountService.getCurrentAccount()?.id).toBe(selected.id);
  });

  it('keeps the default color of backed-up accounts without one instead of picking a random one', async () => {
    const { container } = createTestContainer();

    await container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [{ keyringId: 'hd', name: 'Main', hdIndex: 0 }, { keyringId: 'hd', name: 'Second', hdIndex: 1 }, { keyringId: 'pk', name: 'Key', hdIndex: 0, avatarColor: 'teal' }],
      password: TEST_PASSWORD,
    });

    expect(container.accountService.getAccounts().map(item => item.avatarColor)).toEqual([undefined, undefined, 'teal']);
  });

  it('lets biometrics be enabled right after the restore without another password check', async () => {
    const { container } = createTestContainer();
    const verify = jest.spyOn(VaultService.prototype, 'verifyPassword');

    await container.walletService.restoreWallet({ keyrings: [...keyrings], accounts: [], password: TEST_PASSWORD });
    await container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    expect(verify).not.toHaveBeenCalled();
    verify.mockRestore();
  });

  it('removes the new vault again when an account cannot be rebuilt', async () => {
    const { container } = createTestContainer();
    const original = container.accountService.appendAccount.bind(container.accountService);
    let calls = 0;

    jest.spyOn(container.accountService, 'appendAccount').mockImplementation(async (...args) => {
      calls += 1;

      if (calls === 2) {
        throw new Error('derivation failed');
      }

      return original(...args);
    });

    expect(await catchError(() => container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [{ keyringId: 'hd', name: 'Main', hdIndex: 0 }, { keyringId: 'pk', name: 'Key', hdIndex: 0 }],
      password: TEST_PASSWORD,
    }))).toEqual(new Error('derivation failed'));
    expect(await container.walletService.getStatus()).toBe('empty');
    expect(container.accountService.getAccounts()).toEqual([]);
    jest.restoreAllMocks();
  });

  it('does not overwrite an existing wallet', async () => {
    const { wallet } = await setup();

    expect(await codeOf(() => wallet.restoreWallet({ keyrings: [...keyrings], accounts: [], password: TEST_PASSWORD }))).toBe('WALLET_ALREADY_EXISTS');
  });
});
