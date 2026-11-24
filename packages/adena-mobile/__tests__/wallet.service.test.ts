import { isAppError } from '../src/core/errors';
import { BiometricOutcome } from '../src/security/memory-secure-store';
import { SecureKey } from '../src/security/secure-keys';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const PRIVATE_KEY = '1'.repeat(64);

describe('WalletService', () => {
  it('creates a wallet whose vault never stores the mnemonic in plain text', async () => {
    const { container, secureStore } = createTestContainer();
    const account = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    expect(await container.walletService.getStatus()).toBe('unlocked');
    expect(account).toMatchObject({ name: 'Account 1', hdIndex: 0, keyringType: 'HD_WALLET' });
    const vault = await secureStore.getItem(SecureKey.VAULT);

    expect(vault).not.toContain('abandon');
  });

  it('locks, rejects a wrong password and unlocks with the right one', async () => {
    const { container } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    container.walletService.lock();
    expect(await container.walletService.getStatus()).toBe('locked');

    const wrong = await container.walletService.unlock('wrong password').catch(error => error);

    expect(isAppError(wrong, 'INVALID_PASSWORD')).toBe(true);

    await container.walletService.unlock(TEST_PASSWORD);
    expect(await container.walletService.getStatus()).toBe('unlocked');
  });

  it('derives sequential HD accounts with distinct addresses on every network', async () => {
    const { container } = createTestContainer();
    const first = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const second = await container.accountService.createAccount(first.keyringId, 'HD_WALLET');

    expect(second.hdIndex).toBe(1);

    for (const network of container.networkService.getNetworks()) {
      const a = container.accountService.getAddress(first, network);
      const b = container.accountService.getAddress(second, network);

      expect(a.startsWith(`${network.addressPrefix}1`)).toBe(true);
      expect(a).not.toBe(b);
    }
  });

  it('imports a private key into its own keyring and rejects duplicates', async () => {
    const { container } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    const imported = await container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');

    expect(imported.keyringType).toBe('PRIVATE_KEY');
    expect(container.accountService.getCurrentAccount()?.id).toBe(imported.id);

    const duplicate = await container.walletService.importPrivateKey(PRIVATE_KEY).catch(error => error);

    expect(isAppError(duplicate, 'WALLET_ALREADY_EXISTS')).toBe(true);

    // The new keyring survives a lock/unlock cycle.
    container.walletService.lock();
    await container.walletService.unlock(TEST_PASSWORD);
    await expect(container.keyringSession.withKeyPair(imported.keyringId, 0, async pair => pair.publicKey.length)).resolves.toBe(33);
  });

  it('drops a keyring from the vault when its last account is removed', async () => {
    const { container } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const imported = await container.walletService.importPrivateKey(PRIVATE_KEY);

    await container.walletService.removeAccount(imported.id, TEST_PASSWORD);
    container.walletService.lock();
    await container.walletService.unlock(TEST_PASSWORD);

    const missing = await container.keyringSession.withKeyPair(imported.keyringId, 0, async () => 0).catch(error => error);

    expect(isAppError(missing, 'WALLET_NOT_FOUND')).toBe(true);
  });

  it('unlocks with biometrics only after the user enabled it', async () => {
    const { container, secureStore } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    expect(await container.walletService.isBiometricUnlockEnabled()).toBe(false);

    await container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    container.walletService.lock();
    await container.walletService.unlockWithBiometrics({ title: 'Unlock' });
    expect(await container.walletService.getStatus()).toBe('unlocked');

    secureStore.biometricOutcome = BiometricOutcome.CANCEL;
    container.walletService.lock();
    const canceled = await container.walletService.unlockWithBiometrics({ title: 'Unlock' }).catch(error => error);

    expect(isAppError(canceled, 'BIOMETRICS_CANCELED')).toBe(true);
  });

  it('reveals the recovery phrase only with the password', async () => {
    const { container } = createTestContainer();
    const account = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    await expect(container.walletService.revealMnemonic(account.keyringId, TEST_PASSWORD)).resolves.toBe(TEST_MNEMONIC);
    const denied = await container.walletService.revealMnemonic(account.keyringId, 'nope-nope').catch(error => error);

    expect(isAppError(denied, 'INVALID_PASSWORD')).toBe(true);
  });

  it('rebuilds account metadata when general storage was lost', async () => {
    const { container, keyValueStore } = createTestContainer();
    const original = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    container.walletService.lock();
    keyValueStore.clearAll();

    await container.walletService.unlock(TEST_PASSWORD);
    const [restored] = container.accountService.getAccounts();

    expect(restored).toMatchObject({ keyringId: original.keyringId, hdIndex: 0, publicKey: original.publicKey });
  });

  it('wipes every trace on reset', async () => {
    const { container, secureStore, keyValueStore } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    await container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    container.addressBookService.add({ name: 'Friend', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' }, container.networkService.getCurrentNetwork());
    await container.appResetService.resetAll();
    expect(keyValueStore.getAllKeys()).toEqual(['schema.version']);
    expect(await container.walletService.getStatus()).toBe('empty');
    expect(container.accountService.getAccounts()).toHaveLength(0);
    expect(await secureStore.hasItem(SecureKey.VAULT)).toBe(false);
    expect(await secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD)).toBe(false);
    expect(container.keyringSession.isUnlocked()).toBe(false);
    // Fresh schema is stamped so the next onboarding starts from a clean, current layout.
    expect(container.addressBookService.getEntries()).toHaveLength(0);
    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: 'another password' });
    expect(container.accountService.getAccounts()).toHaveLength(1);
  });
});
