import { KeyringType } from '../../../src/crypto/keyring';
import { StorageKey } from '../../../src/migration/storage-keys';
import { SecureKey } from '../../../src/security/secure-keys';
import { catchError } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

// A restore that is cut short (app killed) is rolled back on the next launch.
describe('WalletService.restoreWallet restore marker', () => {
  const keyrings = [
    { id: 'hd', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1 },
    { id: 'pk', type: KeyringType.PRIVATE_KEY, privateKey: '1'.repeat(64), createdAt: 2 },
  ] as const;

  it('marks the restore pending until it finishes and does not roll back one still running', async () => {
    const { container, keyValueStore } = createTestContainer();
    let marked: string | undefined;
    const restoring = container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [{ keyringId: 'hd', name: 'Main', hdIndex: 0 }],
      password: TEST_PASSWORD,
      backupId: 'b'.repeat(32),
      onRestored: () => {
        marked = keyValueStore.getString(StorageKey.RESTORE_PENDING);
      },
    });

    for (let tries = 0; keyValueStore.getString(StorageKey.RESTORE_PENDING) === undefined && tries < 500; tries += 1) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Queued behind the running restore, which clears the marker itself.
    expect(await container.walletService.getStatus()).toBe('unlocked');
    await restoring;
    expect(JSON.parse(marked!)).toEqual({ backupId: 'b'.repeat(32) });
    expect(keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
    expect(container.accountService.getAccounts()).toHaveLength(2);
  });

  it('rolls back a restore interrupted before its accounts were written on the next launch', async () => {
    const { container, secureStore, keyValueStore } = createTestContainer();

    jest.spyOn(container.accountService, 'appendAccount').mockImplementation(() => new Promise(() => undefined));
    void container.walletService.restoreWallet({ keyrings: [...keyrings], accounts: [{ keyringId: 'hd', name: 'Far', hdIndex: 3 }], password: TEST_PASSWORD });

    for (let tries = 0; !(await secureStore.hasItem(SecureKey.VAULT)) && tries < 500; tries += 1) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    jest.restoreAllMocks();

    const relaunched = createTestContainer({ relaunch: { secureStore, keyValueStore } });

    expect(await relaunched.container.walletService.getStatus()).toBe('empty');
    expect(await secureStore.hasItem(SecureKey.VAULT)).toBe(false);
    expect(keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
  });

  it('clears the marker when a restore fails and undoes itself', async () => {
    const { container, keyValueStore } = createTestContainer();

    expect(await catchError(() => container.walletService.restoreWallet({
      keyrings: [...keyrings],
      accounts: [],
      password: TEST_PASSWORD,
      onRestored: () => {
        throw new Error('status not saved');
      },
    }))).toEqual(new Error('status not saved'));
    expect(keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
    expect(await container.walletService.getStatus()).toBe('empty');
  });
});
