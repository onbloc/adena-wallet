import { StorageKey } from '../../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../../storage/key-value-store';

// Local record of the last backup made (or restored) on this device. Holds no secrets.
export interface CloudBackupState {
  backupId: string;
  fileName: string;
  // Header (createdAt) of the copy this device last wrote or restored; a different remote header means another write.
  backedUpAt: number;
  revision: number;
  // Hash of the account layout at backup time; a different current hash means the backup is outdated.
  fingerprint: string;
  mnemonicCount: number;
  privateKeyCount: number;
  // Written on this device but not confirmed uploaded yet (iCloud uploads in the background).
  uploading?: boolean;
}

export interface CloudBackupStateRepository {
  get(): CloudBackupState | null;
  save(state: CloudBackupState): void;
  clear(): void;
  // The state a cloud write would record, kept until that write is confirmed: a write that timed out
  // in JS may still land natively, and is then recognized as this device's own.
  getPendingWrite(): CloudBackupState | null;
  savePendingWrite(state: CloudBackupState): void;
  clearPendingWrite(): void;
  // Drops the record and pending write of this backup, or of any backup when null.
  forgetBackup(backupId: string | null): void;
}

const isState = (value: unknown): value is Omit<CloudBackupState, 'revision'> & { revision?: number } => {
  const state = value as Partial<CloudBackupState> | null;

  return typeof state?.backupId === 'string'
    && typeof state.fileName === 'string'
    && typeof state.backedUpAt === 'number'
    && typeof state.fingerprint === 'string'
    && typeof state.mnemonicCount === 'number'
    && typeof state.privateKeyCount === 'number';
};

export class StorageCloudBackupStateRepository implements CloudBackupStateRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(): CloudBackupState | null {
    return this.read(StorageKey.CLOUD_BACKUP);
  }

  save(state: CloudBackupState): void {
    writeJson(this.store, StorageKey.CLOUD_BACKUP, state);
  }

  clear(): void {
    this.store.remove(StorageKey.CLOUD_BACKUP);
  }

  getPendingWrite(): CloudBackupState | null {
    return this.read(StorageKey.CLOUD_BACKUP_PENDING_WRITE);
  }

  savePendingWrite(state: CloudBackupState): void {
    writeJson(this.store, StorageKey.CLOUD_BACKUP_PENDING_WRITE, state);
  }

  clearPendingWrite(): void {
    this.store.remove(StorageKey.CLOUD_BACKUP_PENDING_WRITE);
  }

  forgetBackup(backupId: string | null): void {
    if (backupId === null || this.get()?.backupId === backupId) {
      this.clear();
    }

    if (backupId === null || this.getPendingWrite()?.backupId === backupId) {
      this.clearPendingWrite();
    }
  }

  private read(key: StorageKey): CloudBackupState | null {
    const state = readJson<unknown>(this.store, key);

    // Records saved before revisions existed read as revision 0.
    return isState(state) ? { ...state, revision: typeof state.revision === 'number' && Number.isSafeInteger(state.revision) ? state.revision : 0 } : null;
  }
}
