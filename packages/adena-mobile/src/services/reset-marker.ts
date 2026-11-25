import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore } from '../storage/key-value-store';

// Set before a factory reset starts deleting and removed with the general storage wipe,
// so a reset that failed part way is still visible after a restart.
export class ResetMarker {
  constructor(private readonly store: KeyValueStore) {}

  isPending(): boolean {
    return this.store.getString(StorageKey.RESET_PENDING) !== undefined;
  }

  markPending(): void {
    this.store.setString(StorageKey.RESET_PENDING, '1');
  }
}
