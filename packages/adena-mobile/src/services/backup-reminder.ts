import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore } from '../storage/key-value-store';

// Durable "this phrase was never saved" marker for a new wallet, kept until the user views the phrase or a cloud
// upload is confirmed. Lives in general storage, so a factory reset removes it with everything else.
export class BackupReminder {
  constructor(private readonly store: KeyValueStore) {}

  getKeyringId(): string | null {
    return this.store.getString(StorageKey.BACKUP_REQUIRED) ?? null;
  }

  require(keyringId: string): void {
    this.store.setString(StorageKey.BACKUP_REQUIRED, keyringId);
  }

  clear(keyringId?: string): void {
    if (keyringId === undefined || this.getKeyringId() === keyringId) {
      this.store.remove(StorageKey.BACKUP_REQUIRED);
    }
  }
}
