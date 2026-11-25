import { AppError, AppErrorCode } from '../../core/errors';
import { CloudBackupFile, CloudBackupProvider, CloudBackupStore, UploadState } from './cloud-backup-store';

export interface MemoryCloudBackupStoreOptions {
  provider?: CloudBackupProvider;
  available?: boolean;
  // Google Drive style: reads and writes fail until signIn().
  requiresSignIn?: boolean;
  now?: () => number;
  // Shares one cloud between several stores, like two devices on the same account.
  files?: Map<string, { contents: string; modifiedAt: number }>;
  // iCloud style: a written file stays uploading until finishUpload() or failUpload().
  backgroundUploads?: boolean;
}

// In-memory store for tests and previews. `failNext` makes the next call reject with the given error.
// Files without an entry in `uploads` count as uploaded.
export class MemoryCloudBackupStore implements CloudBackupStore {
  readonly provider: CloudBackupProvider;
  readonly files: Map<string, { contents: string; modifiedAt: number }>;
  readonly uploads = new Map<string, UploadState | AppError>();
  backgroundUploads: boolean;
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
    this.backgroundUploads = options.backgroundUploads ?? false;
  }

  finishUpload(name: string): void {
    this.uploads.delete(name);
  }

  failUpload(name: string, error: AppError): void {
    this.uploads.set(name, error);
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

    if (this.files.has(name)) {
      throw new AppError(AppErrorCode.STORAGE_ERROR, 'The backup file already exists.');
    }

    this.files.set(name, { contents, modifiedAt: this.now() });

    if (this.backgroundUploads) {
      this.uploads.set(name, UploadState.UPLOADING);
    }
  }

  async remove(name: string): Promise<void> {
    this.check();
    this.files.delete(name);
    this.uploads.delete(name);
  }

  async uploadStatus(name: string): Promise<UploadState> {
    this.check();
    const upload = this.uploads.get(name);

    if (!this.files.has(name)) {
      throw new AppError(AppErrorCode.BACKUP_NOT_FOUND, 'The backup was not found.');
    }

    if (upload instanceof AppError) {
      throw upload;
    }

    return upload ?? UploadState.UPLOADED;
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
