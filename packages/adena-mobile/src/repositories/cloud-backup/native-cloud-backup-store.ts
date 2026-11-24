import { AppError, AppErrorCode } from '../../core/errors';
import { CLOUD_BACKUP_ERROR, Spec } from '../../native/NativeAdenaCloudBackup';
import { BACKUP_FILE_PATTERN, CloudBackupFile, CloudBackupProvider, CloudBackupStore } from './cloud-backup-store';

const PROVIDER_NAME: Record<CloudBackupProvider, string> = {
  icloud: 'iCloud',
  'google-drive': 'Google Drive',
};

const toAppError = (error: unknown, provider: CloudBackupProvider): AppError => {
  const name = PROVIDER_NAME[provider];

  switch ((error as { code?: string })?.code) {
    case CLOUD_BACKUP_ERROR.UNAVAILABLE:
      return new AppError(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE, `${name} is not available on this device.`, { cause: error });
    case CLOUD_BACKUP_ERROR.NOT_SIGNED_IN:
      return new AppError(AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN, `Sign in to ${name} to continue.`, { cause: error });
    case CLOUD_BACKUP_ERROR.CANCELED:
      return new AppError(AppErrorCode.USER_REJECTED, `${name} access was canceled.`, { cause: error });
    case CLOUD_BACKUP_ERROR.QUOTA:
      return new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA, `Your ${name} storage is full.`, { cause: error });
    case CLOUD_BACKUP_ERROR.NETWORK:
      return new AppError(AppErrorCode.NETWORK_ERROR, `${name} could not be reached. Check your connection.`, { cause: error });
    case CLOUD_BACKUP_ERROR.NOT_FOUND:
      return new AppError(AppErrorCode.BACKUP_NOT_FOUND, `The backup was not found in ${name}.`, { cause: error });
    default:
      return new AppError(AppErrorCode.STORAGE_ERROR, `The ${name} backup could not be completed.`, { cause: error });
  }
};

// A native promise that never settles (e.g. a sign-in activity that was killed) must not block the
// service queue forever. Sign-in waits for the user, so it gets longer.
export interface NativeCallTimeouts {
  callMs: number;
  signInMs: number;
}

export const NATIVE_CALL_TIMEOUTS: NativeCallTimeouts = { callMs: 120_000, signInMs: 300_000 };

// Adapts the AdenaCloudBackup TurboModule. A build without the module reports itself unavailable.
export class NativeCloudBackupStore implements CloudBackupStore {
  constructor(
    private readonly native: Spec | null,
    readonly provider: CloudBackupProvider,
    private readonly timeouts: NativeCallTimeouts = NATIVE_CALL_TIMEOUTS,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!this.native) {
      return false;
    }

    try {
      return await this.withTimeout(this.native.isAvailable(), this.timeouts.callMs);
    }
    catch {
      return false;
    }
  }

  signIn(): Promise<void> {
    return this.call(native => native.signIn(), this.timeouts.signInMs);
  }

  async list(): Promise<CloudBackupFile[]> {
    const files = await this.call(native => native.list());

    return files
      .filter(file => BACKUP_FILE_PATTERN.test(file.name))
      .map(file => ({ name: file.name, modifiedAt: Number(file.modifiedAt) || 0 }));
  }

  read(name: string): Promise<string> {
    return this.call(native => native.read(checkedName(name)));
  }

  // Reads the file back: a store that silently dropped or truncated the write fails here.
  async write(name: string, contents: string): Promise<void> {
    await this.call(native => native.write(checkedName(name), contents));

    if ((await this.read(name)) !== contents) {
      throw new AppError(AppErrorCode.STORAGE_ERROR, `The ${PROVIDER_NAME[this.provider]} backup could not be verified.`);
    }
  }

  remove(name: string): Promise<void> {
    return this.call(native => native.remove(checkedName(name)));
  }

  private async call<T>(task: (native: Spec) => Promise<T>, timeoutMs = this.timeouts.callMs): Promise<T> {
    if (!this.native) {
      throw toAppError({ code: CLOUD_BACKUP_ERROR.UNAVAILABLE }, this.provider);
    }

    try {
      return await this.withTimeout(task(this.native), timeoutMs);
    }
    catch (error) {
      throw error instanceof AppError ? error : toAppError(error, this.provider);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AppError(AppErrorCode.NETWORK_ERROR, `${PROVIDER_NAME[this.provider]} did not respond. Try again.`)),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([promise, timeout]);
    }
    finally {
      clearTimeout(timer);
    }
  }
}

const checkedName = (name: string): string => {
  if (!BACKUP_FILE_PATTERN.test(name)) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid backup file name');
  }

  return name;
};
