import { AppError, AppErrorCode } from '../core/errors';
import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { KeyValueStore } from './key-value-store';

export const CANARY_KEY = '__adena.canary';
const CANARY_VALUE = 'adena-general-v1';

export const META_INITIALIZED_KEY = 'initialized';

// Keeps a canary entry that proves the store was decrypted with the right key.
// The canary is hidden from callers and survives clearAll (wallet reset).
export class CanaryGuardedStore implements KeyValueStore {
  constructor(private readonly inner: KeyValueStore) {}

  getString(key: string): string | undefined {
    return key === CANARY_KEY ? undefined : this.inner.getString(key);
  }

  setString(key: string, value: string): void {
    if (key !== CANARY_KEY) {
      this.inner.setString(key, value);
    }
  }

  remove(key: string): void {
    if (key !== CANARY_KEY) {
      this.inner.remove(key);
    }
  }

  getAllKeys(): string[] {
    return this.inner.getAllKeys().filter(key => key !== CANARY_KEY);
  }

  clearAll(): void {
    this.inner.clearAll();
    this.inner.setString(CANARY_KEY, CANARY_VALUE);
  }
}

export interface GuardedStoreDeps {
  secureStore: SecureStore;
  // Plain marker store deleted together with the data file; it never holds secrets.
  meta: KeyValueStore;
  open: (encryptionKey: string) => KeyValueStore;
  generateKey: () => string;
}

const unreadable = (message: string): AppError => new AppError(AppErrorCode.STORAGE_UNREADABLE, message);

// Refuses to start over silently when an initialized install lost its key or can no
// longer decrypt its data (an undecodable MMKV file opens as an empty map).
export const openGuardedStore = async ({ secureStore, meta, open, generateKey }: GuardedStoreDeps): Promise<KeyValueStore> => {
  const initialized = meta.getString(META_INITIALIZED_KEY) === '1';
  let encryptionKey = await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY);

  if (!encryptionKey) {
    if (initialized) {
      throw unreadable('The storage key for this install is missing.');
    }

    encryptionKey = generateKey();
    await secureStore.setItem(SecureKey.STORAGE_ENCRYPTION_KEY, encryptionKey);
  }

  const store = open(encryptionKey);

  if (store.getString(CANARY_KEY) !== CANARY_VALUE) {
    if (initialized) {
      throw unreadable('App data could not be decrypted.');
    }

    store.setString(CANARY_KEY, CANARY_VALUE);
  }

  meta.setString(META_INITIALIZED_KEY, '1');
  return new CanaryGuardedStore(store);
};

export interface StorageRecoveryDeps {
  secureStore: SecureStore;
  meta: KeyValueStore;
  deleteData: () => void;
}

// Drops unreadable general data and its key. The vault is kept, so the wallet unlocks
// with its password and accounts are rebuilt from the keyrings.
export const resetUnreadableStorage = async ({ secureStore, meta, deleteData }: StorageRecoveryDeps): Promise<void> => {
  deleteData();
  await secureStore.removeItem(SecureKey.STORAGE_ENCRYPTION_KEY);
  meta.clearAll();
};
