import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'correct horse battery staple';

describe('CloudBackupService across a reset', () => {
  it('drops a backup whose sign-in resumes after the wallet was reset and replaced', async () => {
    const { container, cloudBackupStore } = createTestContainer();
    const backup = container.cloudBackupService;

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const signIn = cloudBackupStore.signIn.bind(cloudBackupStore);
    let resume: () => void = () => undefined;

    jest.spyOn(cloudBackupStore, 'signIn').mockImplementationOnce(() => new Promise<void>((resolve) => {
      resume = () => void signIn().then(resolve);
    }));
    const pending = backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });

    await container.appResetService.resetAll();
    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    resume();

    expect(await pending.then(() => null, (error: unknown) => error)).toMatchObject({ code: 'WALLET_LOCKED' });
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
    expect(cloudBackupStore.files.size).toBe(0);
  });
});
