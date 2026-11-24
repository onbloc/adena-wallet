import { ACCOUNT_PHOTO_KEY_PREFIX } from '../migration/storage-keys';
import { KeyValueStore } from '../storage/key-value-store';

export interface AccountPhotoRepository {
  get(accountId: string): string | undefined;
  save(accountId: string, dataUri: string): void;
  removeAccount(accountId: string): void;
}

export class StorageAccountPhotoRepository implements AccountPhotoRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(accountId: string): string | undefined {
    return this.store.getString(`${ACCOUNT_PHOTO_KEY_PREFIX}${accountId}`);
  }

  save(accountId: string, dataUri: string): void {
    this.store.setString(`${ACCOUNT_PHOTO_KEY_PREFIX}${accountId}`, dataUri);
  }

  removeAccount(accountId: string): void {
    this.store.remove(`${ACCOUNT_PHOTO_KEY_PREFIX}${accountId}`);
  }
}
