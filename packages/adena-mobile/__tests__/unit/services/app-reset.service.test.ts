import { AppErrorCode } from '../../../src/core/errors';
import { createContainer } from '../../../src/di/container';
import { ACCOUNT_PHOTO_KEY_PREFIX, StorageKey } from '../../../src/migration/storage-keys';
import { SecurePasswordAttemptRepository } from '../../../src/repositories/password-attempt.repository';
import { SecureVaultRepository } from '../../../src/repositories/vault.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { AppResetService } from '../../../src/services/app-reset.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { MigrationService } from '../../../src/services/migration.service';
import { PasswordAttemptLimiter } from '../../../src/services/password-attempt-limiter';
import { VaultService } from '../../../src/services/vault.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

describe('AppResetService', () => {
  it('removes every secret except the storage encryption key and wipes general storage', async () => {
    const secureStore = new MemorySecureStore();
    const keyValueStore = new MemoryKeyValueStore();
    const session = new KeyringSession();

    session.open([]);
    await Promise.all(Object.values(SecureKey).map(key => secureStore.setItem(key, 'x')));
    keyValueStore.setString(StorageKey.ACCOUNTS, '{}');
    keyValueStore.setString('anything', '1');
    keyValueStore.setString(`${ACCOUNT_PHOTO_KEY_PREFIX}acc-1`, 'data:image/jpeg;base64,AAAA');
    const vaultService = new VaultService(new SecureVaultRepository(secureStore), new ScryptXChaChaVaultCipher(), new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore)));

    await new AppResetService(session, vaultService, secureStore, keyValueStore, new MigrationService(keyValueStore, secureStore)).resetAll();

    expect(session.isUnlocked()).toBe(false);
    expect(await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY)).toBe('x');

    for (const key of [SecureKey.VAULT, SecureKey.BIOMETRIC_PASSWORD, SecureKey.PASSWORD_ATTEMPTS]) {
      expect(await secureStore.hasItem(key)).toBe(false);
    }

    // Fresh schema versions are stamped again.
    expect(await secureStore.getItem(SecureKey.SECURE_SCHEMA_VERSION)).toBe('1');
    expect(keyValueStore.getAllKeys()).toEqual([StorageKey.SCHEMA_VERSION]);
  });

  it('wipes a full wallet, including the password lockout, so onboarding can start over', async () => {
    let now = 1_000_000;
    const { container, secureStore } = createTestContainer({ now: () => now });
    const account = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = container.networkService.getCurrentNetwork();

    container.connectedAppService.touch('https://dapp.example.com', { name: 'Example' }, account.id, network.id);
    container.walletService.lock();

    for (let i = 0; i < 6; i++) {
      await container.walletService.unlock('wrong password').catch(() => undefined);
    }

    expect(await secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).toBe(true);
    await container.appResetService.resetAll();

    expect(await container.walletService.getStatus()).toBe('empty');
    expect(container.connectedAppService.getConnectedApps()).toEqual([]);
    expect(container.accountService.getAccounts()).toEqual([]);
    expect(await secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).toBe(false);
    now += 1;
    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: 'brand new password' });
    container.walletService.lock();
    await expect(container.walletService.unlock('brand new password')).resolves.toBeUndefined();
  });

  it('waits for an in-flight unlock re-save so the vault cannot come back after the reset', async () => {
    const secureStore = new MemorySecureStore();
    const keyValueStore = new MemoryKeyValueStore();
    const limiter = new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore));
    const repository = new SecureVaultRepository(secureStore);
    const pk = { id: 'pk', type: 'PRIVATE_KEY' as const, privateKey: '1'.repeat(64), createdAt: 1 };

    await new VaultService(repository, new ScryptXChaChaVaultCipher({ N: 2 ** 9, r: 8, p: 1 }), limiter).create([pk], TEST_PASSWORD);
    // Stronger settings make the unlock re-encrypt and re-save the vault.
    const vaultService = new VaultService(repository, new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }), limiter);
    const reset = new AppResetService(new KeyringSession(), vaultService, secureStore, keyValueStore, new MigrationService(keyValueStore, secureStore));
    const unlocking = vaultService.open(TEST_PASSWORD);

    await reset.resetAll();
    await unlocking;
    expect(await repository.exists()).toBe(false);
  });
  it('keeps a reset that failed part way retryable, even after a restart', async () => {
    const { container, secureStore, keyValueStore } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    jest.spyOn(secureStore, 'removeItem').mockRejectedValueOnce(new Error('Keychain locked'));
    await expect(container.appResetService.resetAll()).rejects.toThrow('Keychain locked');

    // A fresh container over the same storage stands in for an app restart.
    const restarted = createContainer({ secureStore, keyValueStore, vaultCipher: new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }) });

    expect(await restarted.walletService.getStatus()).toBe('locked');
    await expect(restarted.walletService.unlock(TEST_PASSWORD)).rejects.toMatchObject({ code: AppErrorCode.RESET_INCOMPLETE });

    await restarted.appResetService.resetAll();
    expect(await restarted.walletService.getStatus()).toBe('empty');
    expect(keyValueStore.getAllKeys()).toEqual([StorageKey.SCHEMA_VERSION]);
  });
});
