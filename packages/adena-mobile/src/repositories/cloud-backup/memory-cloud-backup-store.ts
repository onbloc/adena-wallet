import { AppError, AppErrorCode } from '../../core/errors';
import { CloudBackupFile, CloudBackupProvider, CloudBackupStore } from './cloud-backup-store';

export interface MemoryCloudBackupStoreOptions {
  provider?: CloudBackupProvider;
  available?: boolean;
  // Google Drive style: reads and writes fail until signIn().
  requiresSignIn?: boolean;
  now?: () => number;
  // Shares one cloud between several stores, like two devices on the same account.
  files?: Map<string, { contents: string; modifiedAt: number }>;
}

// In-memory store for tests and previews. `failNext` makes the next call reject with the given error.
export class MemoryCloudBackupStore implements CloudBackupStore {
  readonly provider: CloudBackupProvider;
  readonly files: Map<string, { contents: string; modifiedAt: number }>;
  available: boolean;
  signedIn: boolean;
  signInCalls = 0;
  private failure: AppError | null = null;
  private readonly now: () => number;

  constructor(options: MemoryCloudBackupStoreOptions = {}) {
    this.provider = options.provider ?? CloudBackupProvider.ICLOUD;
    this.available = options.available ?? true;
    this.signedIn = !options.requiresSignIn;
    this.now = options.now ?? Date.now;
    this.files = options.files ?? new Map();
  }

  failNext(error: AppError): void {
    this.failure = error;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async signIn(): Promise<void> {
    this.signInCalls += 1;
    this.check(false);
    this.signedIn = true;
  }

  async list(): Promise<CloudBackupFile[]> {
    this.check();
    return [...this.files].map(([name, file]) => ({ name, modifiedAt: file.modifiedAt }));
  }

  async read(name: string): Promise<string> {
    this.check();
    const file = this.files.get(name);

    if (!file) {
      throw new AppError(AppErrorCode.BACKUP_NOT_FOUND, 'The backup was not found.');
    }

    return file.contents;
  }

  async write(name: string, contents: string): Promise<void> {
    this.check();
    this.files.set(name, { contents, modifiedAt: this.now() });
  }

  async remove(name: string): Promise<void> {
    this.check();
    this.files.delete(name);
  }

  private check(requireSignIn = true): void {
    const failure = this.failure;

    this.failure = null;

    if (failure) {
      throw failure;
    }

    if (!this.available) {
      throw new AppError(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE, 'Cloud backup is not available on this device.');
    }

    if (requireSignIn && !this.signedIn) {
      throw new AppError(AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN, 'Sign in to continue.');
    }
  }
}
