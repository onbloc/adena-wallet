import { toHex } from '@cosmjs/encoding';
import { createMMKV, deleteMMKV, MMKV } from 'react-native-mmkv';

import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { randomBytes } from '../utils/id';
import { openGuardedStore, resetUnreadableStorage } from './guarded-store';
import { KeyValueStore } from './key-value-store';

export class MmkvKeyValueStore implements KeyValueStore {
  constructor(private readonly mmkv: MMKV) {}

  getString(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  setString(key: string, value: string): void {
    this.mmkv.set(key, value);
  }

  remove(key: string): void {
    this.mmkv.remove(key);
  }

  getAllKeys(): string[] {
    return this.mmkv.getAllKeys();
  }

  clearAll(): void {
    this.mmkv.clearAll();
  }
}

// AES-256 key is 32 bytes; 16 random bytes hex-encoded fill it exactly.
const ENCRYPTION_KEY_BYTES = 16;

const generateKey = (): string => toHex(randomBytes(ENCRYPTION_KEY_BYTES));

const metaStoreFor = (id: string): MmkvKeyValueStore => new MmkvKeyValueStore(createMMKV({ id: `${id}.meta` }));

// Encrypted instances opened in this JS runtime; MMKV keeps AppState listeners on them.
const liveInstances = new Map<string, MMKV>();

// The MMKV encryption key lives in the keychain, so the data file is useless off-device.
export const createEncryptedMmkvStore = (id: string, secureStore: SecureStore): Promise<KeyValueStore> =>
  openGuardedStore({
    secureStore,
    meta: metaStoreFor(id),
    open: (encryptionKey) => {
      const mmkv = createMMKV({ id, encryptionKey, encryptionType: 'AES-256' });

      liveInstances.set(id, mmkv);
      return new MmkvKeyValueStore(mmkv);
    },
    generateKey,
  });

export const resetEncryptedMmkvStore = async (id: string, secureStore: SecureStore): Promise<void> => {
  const live = liveInstances.get(id);

  if (!live) {
    return resetUnreadableStorage({
      secureStore,
      meta: metaStoreFor(id),
      deleteData: () => {
        deleteMMKV(id);
      },
    });
  }

  // Deleting a live instance leaves its listeners on freed native state (mmkv#1082): wipe and re-key it instead.
  const nextKey = generateKey();

  live.clearAll();
  live.encrypt(nextKey, 'AES-256');
  await secureStore.setItem(SecureKey.STORAGE_ENCRYPTION_KEY, nextKey);
  metaStoreFor(id).clearAll();
};
