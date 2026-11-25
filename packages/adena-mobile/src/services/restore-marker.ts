import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// Set before a backup restore writes the vault and cleared once accounts and backup status are saved,
// so a restore cut short is rolled back on the next launch. Holds no secrets.
export class RestoreMarker {
  constructor(private readonly store: KeyValueStore) {}

  isPending(): boolean {
    return this.store.getString(StorageKey.RESTORE_PENDING) !== undefined;
  }

  // The backup the pending restore comes from; null when none was recorded.
  getBackupId(): string | null {
    const backupId = readJson<{ backupId?: unknown }>(this.store, StorageKey.RESTORE_PENDING)?.backupId;

    return typeof backupId === 'string' ? backupId : null;
  }

  markPending(backupId: string | null): void {
    writeJson(this.store, StorageKey.RESTORE_PENDING, { backupId });
  }

  clear(): void {
    this.store.remove(StorageKey.RESTORE_PENDING);
  }
}
