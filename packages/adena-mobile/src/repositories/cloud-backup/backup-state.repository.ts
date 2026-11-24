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
}

export interface CloudBackupStateRepository {
  get(): CloudBackupState | null;
  save(state: CloudBackupState): void;
  clear(): void;
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
    const state = readJson<unknown>(this.store, StorageKey.CLOUD_BACKUP);

    // Records saved before revisions existed read as revision 0.
    return isState(state) ? { ...state, revision: typeof state.revision === 'number' && Number.isSafeInteger(state.revision) ? state.revision : 0 } : null;
  }

  save(state: CloudBackupState): void {
    writeJson(this.store, StorageKey.CLOUD_BACKUP, state);
  }

  clear(): void {
    this.store.remove(StorageKey.CLOUD_BACKUP);
  }
}
