import { StorageKey } from '../../../src/migration/storage-keys';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { AppResetService } from '../../../src/services/app-reset.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { MigrationService } from '../../../src/services/migration.service';
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
    await new AppResetService(session, secureStore, keyValueStore, new MigrationService(keyValueStore, secureStore)).resetAll();

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

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    container.walletService.lock();

    for (let i = 0; i < 6; i++) {
      await container.walletService.unlock('wrong password').catch(() => undefined);
    }

    expect(await secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).toBe(true);
    await container.appResetService.resetAll();

    expect(await container.walletService.getStatus()).toBe('empty');
    expect(container.accountService.getAccounts()).toEqual([]);
    expect(await secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).toBe(false);
    now += 1;
    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: 'brand new password' });
    container.walletService.lock();
    await expect(container.walletService.unlock('brand new password')).resolves.toBeUndefined();
  });
});
