import { toHex } from '@cosmjs/encoding';
import { createMMKV, deleteMMKV, MMKV } from 'react-native-mmkv';

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

const metaStoreFor = (id: string): MmkvKeyValueStore => new MmkvKeyValueStore(createMMKV({ id: `${id}.meta` }));

// The MMKV encryption key lives in the keychain, so the data file is useless off-device.
export const createEncryptedMmkvStore = (id: string, secureStore: SecureStore): Promise<KeyValueStore> =>
  openGuardedStore({
    secureStore,
    meta: metaStoreFor(id),
    open: encryptionKey => new MmkvKeyValueStore(createMMKV({ id, encryptionKey, encryptionType: 'AES-256' })),
    generateKey: () => toHex(randomBytes(ENCRYPTION_KEY_BYTES)),
  });

export const resetEncryptedMmkvStore = (id: string, secureStore: SecureStore): Promise<void> =>
  resetUnreadableStorage({
    secureStore,
    meta: metaStoreFor(id),
    deleteData: () => {
      deleteMMKV(id);
    },
  });
