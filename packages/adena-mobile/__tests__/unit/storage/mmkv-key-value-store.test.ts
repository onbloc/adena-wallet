import { MMKV } from 'react-native-mmkv';

import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { CANARY_KEY, CanaryGuardedStore, META_INITIALIZED_KEY } from '../../../src/storage/guarded-store';
import { createEncryptedMmkvStore, MmkvKeyValueStore, resetEncryptedMmkvStore } from '../../../src/storage/mmkv-key-value-store';

const mockInstances = new Map<string, Map<string, string>>();
const mockCreated: { id: string; encryptionKey?: string; encryptionType?: string }[] = [];

const mockFakeMmkv = (id: string): MMKV => {
  const items = mockInstances.get(id) ?? new Map<string, string>();

  mockInstances.set(id, items);

  return {
    getString: (key: string) => items.get(key),
    set: (key: string, value: string) => void items.set(key, value),
    remove: (key: string) => items.delete(key),
    getAllKeys: () => [...items.keys()],
    clearAll: () => items.clear(),
  } as unknown as MMKV;
};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn((config: { id: string; encryptionKey?: string; encryptionType?: string }) => {
    mockCreated.push(config);

    return mockFakeMmkv(config.id);
  }),
  deleteMMKV: jest.fn((id: string) => mockInstances.delete(id)),
}));

beforeEach(() => {
  mockInstances.clear();
  mockCreated.length = 0;
});

describe('MmkvKeyValueStore', () => {
  it('delegates to the MMKV instance', () => {
    const store = new MmkvKeyValueStore(mockFakeMmkv('plain'));

    store.setString('a', '1');
    store.setString('b', '2');
    expect(store.getString('a')).toBe('1');
    expect(store.getString('missing')).toBeUndefined();
    expect(store.getAllKeys()).toEqual(['a', 'b']);
    store.remove('a');
    expect(store.getAllKeys()).toEqual(['b']);
    store.clearAll();
    expect(store.getAllKeys()).toEqual([]);
  });
});

describe('createEncryptedMmkvStore', () => {
  it('opens an AES-256 store with a generated keychain key', async () => {
    const secureStore = new MemorySecureStore();
    const store = await createEncryptedMmkvStore('general', secureStore);
    const key = await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY);

    expect(store).toBeInstanceOf(CanaryGuardedStore);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(mockCreated).toEqual([{ id: 'general.meta' }, { id: 'general', encryptionKey: key, encryptionType: 'AES-256' }]);
    expect(mockInstances.get('general.meta')?.get(META_INITIALIZED_KEY)).toBe('1');
    expect(mockInstances.get('general')?.has(CANARY_KEY)).toBe(true);
  });

  it('reuses the stored key on the next launch', async () => {
    const secureStore = new MemorySecureStore();

    (await createEncryptedMmkvStore('general', secureStore)).setString('x', 'y');

    const reopened = await createEncryptedMmkvStore('general', secureStore);

    expect(reopened.getString('x')).toBe('y');
  });
});

describe('resetEncryptedMmkvStore', () => {
  it('deletes the data file, the key and the meta store', async () => {
    const secureStore = new MemorySecureStore();
    const { deleteMMKV } = jest.requireMock('react-native-mmkv');

    await createEncryptedMmkvStore('general', secureStore);
    await resetEncryptedMmkvStore('general', secureStore);

    expect(deleteMMKV).toHaveBeenCalledWith('general');
    expect(mockInstances.has('general')).toBe(false);
    expect(await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY)).toBeNull();
    expect(mockInstances.get('general.meta')?.size).toBe(0);
  });
});
