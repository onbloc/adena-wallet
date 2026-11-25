import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { backupVersionFileName, parseBackupFileName } from '../../../src/repositories/cloud-backup/cloud-backup-store';
import { FREE_PASSWORD_ATTEMPTS } from '../../../src/services/password-attempt-limiter';
import { catchError } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'violet orbit lantern 42';
const OTHER_BACKUP_PASSWORD = 'amber canyon whistle 58';
const NEW_WALLET_PASSWORD = 'quiet meadow trumpet 7';

const codeOf = async (run: () => unknown): Promise<unknown> => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const setup = async () => {
  let clock = 1_700_000_000_000;
  const env = createTestContainer({ now: () => clock });

  await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

  return {
    ...env,
    backup: env.container.cloudBackupService,
    tick: (ms = 1000): void => {
      clock += ms;
    },
  };
};

const create = (backup: Awaited<ReturnType<typeof setup>>['backup'], backupPassword = BACKUP_PASSWORD) =>
  backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword, confirmPassword: backupPassword });

describe('CloudBackupService restore versions', () => {
  it('lets a restore open an older version that still uses an earlier backup password', async () => {
    const source = await setup();

    await create(source.backup);
    const original = [...source.cloudBackupStore.files.keys()][0];

    source.tick();
    await create(source.backup, OTHER_BACKUP_PASSWORD);
    const restoring = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } }).container.cloudBackupService;
    const [found, ...others] = await restoring.findBackups();

    expect(others).toEqual([]);
    expect(found.versions.map(version => version.revision)).toEqual([2, 1]);
    expect(found.fileName).toBe(found.versions[0].fileName);
    expect(found.versions[1]).toMatchObject({ fileName: original, revision: 1, current: false });
    expect(await codeOf(() => restoring.openBackup(found.fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.INVALID_PASSWORD);

    const content = await restoring.openBackup(found.versions[1].fileName, BACKUP_PASSWORD);

    expect(content.revision).toBe(1);
    await restoring.restoreWallet(content, NEW_WALLET_PASSWORD);
    expect((await restoring.findBackups())[0].versions.map(version => version.current)).toEqual([false, true]);
  });

  it('counts guesses on every version of a backup against one restore limit', async () => {
    const source = await setup();

    await create(source.backup);
    source.tick();
    await create(source.backup, OTHER_BACKUP_PASSWORD);
    const restoring = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } }).container.cloudBackupService;
    const [{ versions: [newest, older] }] = await restoring.findBackups();

    for (let attempt = 0; attempt < FREE_PASSWORD_ATTEMPTS + 1; attempt += 1) {
      const version = attempt % 2 === 0 ? newest : older;

      expect(await codeOf(() => restoring.openBackup(version.fileName, 'wrong password!'))).toBe(AppErrorCode.INVALID_PASSWORD);
    }

    expect(await codeOf(() => restoring.openBackup(older.fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED);
    expect(await codeOf(() => restoring.openBackup(newest.fileName, OTHER_BACKUP_PASSWORD))).toBe(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED);
  });

  it('leaves versions without a readable header out of the restore list', async () => {
    const source = await setup();

    await create(source.backup);
    const [[name, file]] = [...source.cloudBackupStore.files];
    const backupId = parseBackupFileName(name)!.backupId;
    const damaged = backupVersionFileName(backupId, 2, '0'.repeat(16));

    source.cloudBackupStore.files.set(damaged, { contents: '{}', modifiedAt: file.modifiedAt + 1 });
    const [found] = await createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } }).container.cloudBackupService.findBackups();

    expect(found.fileName).toBe(name);
    expect(found.versions.map(version => version.fileName)).toEqual([name]);
  });
});
