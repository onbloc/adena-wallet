import { AppError, AppErrorCode, isAppError } from '../../../../src/core/errors';
import { MemoryCloudBackupStore } from '../../../../src/repositories/cloud-backup/memory-cloud-backup-store';
import { catchError } from '../../../helpers/service-fakes';

const NAME = 'adena-backup-0123456789abcdef0123456789abcdef.json';

const codeOf = async (run: () => unknown): Promise<unknown> => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

describe('MemoryCloudBackupStore', () => {
  it('stores files with their write time', async () => {
    const store = new MemoryCloudBackupStore({ now: () => 42 });

    expect(store.provider).toBe('icloud');
    await store.write(NAME, 'data');
    expect(await store.list()).toEqual([{ name: NAME, modifiedAt: 42 }]);
    expect(await store.read(NAME)).toBe('data');
    await store.remove(NAME);
    await store.remove(NAME);
    expect(await codeOf(() => store.read(NAME))).toBe(AppErrorCode.BACKUP_NOT_FOUND);
  });

  it('needs sign-in when configured like Google Drive', async () => {
    const store = new MemoryCloudBackupStore({ provider: 'google-drive', requiresSignIn: true });

    expect(await codeOf(() => store.list())).toBe(AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN);
    await store.signIn();
    expect(store.signInCalls).toBe(1);
    expect(await store.list()).toEqual([]);
  });

  it('can be unavailable or fail once', async () => {
    const unavailable = new MemoryCloudBackupStore({ available: false });

    expect(await unavailable.isAvailable()).toBe(false);
    expect(await codeOf(() => unavailable.signIn())).toBe(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE);

    const store = new MemoryCloudBackupStore();

    store.failNext(new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA));
    expect(await codeOf(() => store.write(NAME, 'x'))).toBe(AppErrorCode.CLOUD_BACKUP_QUOTA);
    await store.write(NAME, 'x');
    expect(store.files.size).toBe(1);
  });
});
