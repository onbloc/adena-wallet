import { AppErrorCode, isAppError } from '../../../../src/core/errors';
import NativeAdenaCloudBackup, { CLOUD_BACKUP_ERROR, Spec } from '../../../../src/native/NativeAdenaCloudBackup';
import { backupFileName, backupVersionFileName, CloudBackupProvider } from '../../../../src/repositories/cloud-backup/cloud-backup-store';
import { NativeCloudBackupStore } from '../../../../src/repositories/cloud-backup/native-cloud-backup-store';
import { catchError } from '../../../helpers/service-fakes';

const NAME = backupFileName('a'.repeat(32));

const createNative = (): jest.Mocked<Spec> => {
  const files = new Map<string, string>();

  return {
    isAvailable: jest.fn(async () => true),
    signIn: jest.fn(async () => undefined),
    list: jest.fn(async () => [...files.keys()].map(name => ({ name, modifiedAt: 5 }))),
    read: jest.fn(async (name: string) => files.get(name) ?? ''),
    write: jest.fn(async (name: string, contents: string) => {
      files.set(name, contents);
    }),
    remove: jest.fn(async (name: string) => {
      files.delete(name);
    }),
    getConstants: jest.fn(),
  } as unknown as jest.Mocked<Spec>;
};

const codeOf = async (run: () => unknown): Promise<unknown> => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

describe('NativeCloudBackupStore', () => {
  it('reports itself unavailable when the native module is missing (Jest has none)', async () => {
    expect(NativeAdenaCloudBackup).toBeNull();
    const store = new NativeCloudBackupStore(null, CloudBackupProvider.ICLOUD);

    expect(await store.isAvailable()).toBe(false);
    expect(await codeOf(() => store.list())).toBe(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE);
    expect(await codeOf(() => store.signIn())).toBe(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE);
  });

  it('treats a failing availability check as unavailable', async () => {
    const native = createNative();

    native.isAvailable.mockRejectedValue(new Error('boom'));
    expect(await new NativeCloudBackupStore(native, CloudBackupProvider.ICLOUD).isAvailable()).toBe(false);
  });

  it('writes, verifies, lists, reads and removes backup files', async () => {
    const native = createNative();
    const store = new NativeCloudBackupStore(native, CloudBackupProvider.GOOGLE_DRIVE);

    expect(store.provider).toBe('google-drive');
    expect(await store.isAvailable()).toBe(true);
    await store.signIn();
    await store.write(NAME, '{"a":1}');
    expect(native.read).toHaveBeenCalledWith(NAME);
    expect(await store.list()).toEqual([{ name: NAME, modifiedAt: 5 }]);
    expect(await store.read(NAME)).toBe('{"a":1}');
    await store.remove(NAME);
    expect(await store.list()).toEqual([]);
  });

  it('times out a native call that never settles, so the service queue keeps moving', async () => {
    const native = createNative();
    const store = new NativeCloudBackupStore(native, CloudBackupProvider.GOOGLE_DRIVE, { callMs: 10, signInMs: 20 });
    const never = () => new Promise<never>(() => undefined);

    native.signIn.mockImplementation(never);
    native.list.mockImplementation(never);
    native.isAvailable.mockImplementation(never);
    expect(await codeOf(() => store.signIn())).toBe(AppErrorCode.NETWORK_ERROR);
    expect(await codeOf(() => store.list())).toBe(AppErrorCode.NETWORK_ERROR);
    expect(await store.isAvailable()).toBe(false);

    // Settled calls clear their timer and are unaffected.
    native.list.mockResolvedValue([]);
    expect(await store.list()).toEqual([]);
  });

  it('fails a write whose stored copy differs', async () => {
    const native = createNative();

    native.read.mockResolvedValue('truncated');
    expect(await codeOf(() => new NativeCloudBackupStore(native, CloudBackupProvider.ICLOUD).write(NAME, 'full'))).toBe(AppErrorCode.STORAGE_ERROR);
  });

  it('ignores foreign files and refuses unexpected names', async () => {
    const native = createNative();
    const store = new NativeCloudBackupStore(native, CloudBackupProvider.ICLOUD);

    const version = backupVersionFileName('a'.repeat(32), 12, 'f'.repeat(16));

    native.list.mockResolvedValue([{ name: 'notes.txt', modifiedAt: 1 }, { name: NAME, modifiedAt: Number.NaN }, { name: version, modifiedAt: 2 }]);
    expect(await store.list()).toEqual([{ name: NAME, modifiedAt: 0 }, { name: version, modifiedAt: 2 }]);

    for (const name of ['../vault.json', 'adena-backup-x.json', '', NAME.replace('.json', '.01-ffffffffffffffff.json'), NAME.replace('.json', '.1-fff.json')]) {
      expect(await codeOf(() => store.read(name))).toBe(AppErrorCode.INVALID_REQUEST);
      expect(await codeOf(() => store.write(name, 'x'))).toBe(AppErrorCode.INVALID_REQUEST);
      expect(await codeOf(() => store.remove(name))).toBe(AppErrorCode.INVALID_REQUEST);
    }

    expect(native.read).not.toHaveBeenCalled();
    expect(native.write).not.toHaveBeenCalled();
  });

  it.each([
    [CLOUD_BACKUP_ERROR.UNAVAILABLE, AppErrorCode.CLOUD_BACKUP_UNAVAILABLE],
    [CLOUD_BACKUP_ERROR.NOT_SIGNED_IN, AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN],
    [CLOUD_BACKUP_ERROR.CANCELED, AppErrorCode.USER_REJECTED],
    [CLOUD_BACKUP_ERROR.QUOTA, AppErrorCode.CLOUD_BACKUP_QUOTA],
    [CLOUD_BACKUP_ERROR.NETWORK, AppErrorCode.NETWORK_ERROR],
    [CLOUD_BACKUP_ERROR.NOT_FOUND, AppErrorCode.BACKUP_NOT_FOUND],
    [CLOUD_BACKUP_ERROR.FAILED, AppErrorCode.STORAGE_ERROR],
    ['E_SOMETHING_NEW', AppErrorCode.STORAGE_ERROR],
  ])('maps native %s to %s', async (nativeCode, appCode) => {
    const native = createNative();

    native.read.mockRejectedValue(Object.assign(new Error('native'), { code: nativeCode }));
    const error = await catchError(() => new NativeCloudBackupStore(native, CloudBackupProvider.ICLOUD).read(NAME));

    expect(isAppError(error, appCode)).toBe(true);
    expect((error as Error).message).toMatch(/iCloud/);
  });
});
