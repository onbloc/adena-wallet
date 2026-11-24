import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { CANARY_KEY, CanaryGuardedStore, META_INITIALIZED_KEY, openGuardedStore, resetUnreadableStorage } from '../../../src/storage/guarded-store';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('CanaryGuardedStore', () => {
  it('hides the canary from reads, writes, removes and listings', () => {
    const inner = new MemoryKeyValueStore();
    const store = new CanaryGuardedStore(inner);

    inner.setString(CANARY_KEY, 'secret');
    store.setString('a', '1');
    store.setString(CANARY_KEY, 'overwrite');
    store.remove(CANARY_KEY);

    expect(store.getString(CANARY_KEY)).toBeUndefined();
    expect(inner.getString(CANARY_KEY)).toBe('secret');
    expect(store.getString('a')).toBe('1');
    expect(store.getAllKeys()).toEqual(['a']);
    store.remove('a');
    expect(store.getString('a')).toBeUndefined();
  });

  it('restores the canary after clearAll', () => {
    const inner = new MemoryKeyValueStore();
    const store = new CanaryGuardedStore(inner);

    store.setString('a', '1');
    store.clearAll();
    expect(inner.getAllKeys()).toEqual([CANARY_KEY]);
    expect(inner.getString(CANARY_KEY)).toBe('adena-general-v1');
    expect(store.getAllKeys()).toEqual([]);
  });
});

describe('openGuardedStore', () => {
  const setup = () => {
    const secureStore = new MemorySecureStore();
    const meta = new MemoryKeyValueStore();
    const files = new Map<string, MemoryKeyValueStore>();
    const open = jest.fn((key: string) => {
      if (!files.has(key)) {
        files.set(key, new MemoryKeyValueStore());
      }

      return files.get(key) as MemoryKeyValueStore;
    });
    const generateKey = jest.fn(() => 'generated-key');

    return { secureStore, meta, files, open, generateKey, deps: { secureStore, meta, open, generateKey } };
  };

  it('initializes a fresh install', async () => {
    const { secureStore, meta, files, open, deps } = setup();
    const store = await openGuardedStore(deps);

    expect(await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY)).toBe('generated-key');
    expect(open).toHaveBeenCalledWith('generated-key');
    expect(files.get('generated-key')?.getString(CANARY_KEY)).toBe('adena-general-v1');
    expect(meta.getString(META_INITIALIZED_KEY)).toBe('1');
    expect(store).toBeInstanceOf(CanaryGuardedStore);
  });

  it('reopens an initialized install with its existing key', async () => {
    const { generateKey, deps } = setup();
    const first = await openGuardedStore(deps);

    first.setString('a', '1');

    const second = await openGuardedStore(deps);

    expect(generateKey).toHaveBeenCalledTimes(1);
    expect(second.getString('a')).toBe('1');
  });

  it('adopts an existing key on a store without the initialized marker', async () => {
    const { secureStore, generateKey, deps } = setup();

    await secureStore.setItem(SecureKey.STORAGE_ENCRYPTION_KEY, 'old-key');
    await openGuardedStore(deps);
    expect(generateKey).not.toHaveBeenCalled();
  });

  it('refuses to start over when the key is missing', async () => {
    const { secureStore, meta, deps } = setup();

    meta.setString(META_INITIALIZED_KEY, '1');
    await expect(openGuardedStore(deps)).rejects.toThrow('The storage key for this install is missing.');
    expect(await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY)).toBeNull();
  });

  it('refuses to start over when the data cannot be decrypted', async () => {
    const { secureStore, meta, files, deps } = setup();

    await openGuardedStore(deps);
    await secureStore.setItem(SecureKey.STORAGE_ENCRYPTION_KEY, 'wrong-key');

    const error = await openGuardedStore(deps).catch(caught => caught);

    expect(isAppError(error, AppErrorCode.STORAGE_UNREADABLE)).toBe(true);
    expect(error.message).toBe('App data could not be decrypted.');
    expect(files.get('wrong-key')?.getString(CANARY_KEY)).toBeUndefined();
    expect(meta.getString(META_INITIALIZED_KEY)).toBe('1');
  });

  it('treats a non-"1" marker as not initialized', async () => {
    const { meta, deps } = setup();

    meta.setString(META_INITIALIZED_KEY, 'true');
    await expect(openGuardedStore(deps)).resolves.toBeInstanceOf(CanaryGuardedStore);
  });
});

describe('resetUnreadableStorage', () => {
  it('deletes data, the key and the marker', async () => {
    const secureStore = new MemorySecureStore();
    const meta = new MemoryKeyValueStore();
    const deleteData = jest.fn();

    await secureStore.setItem(SecureKey.STORAGE_ENCRYPTION_KEY, 'k');
    await secureStore.setItem(SecureKey.VAULT, 'vault');
    meta.setString(META_INITIALIZED_KEY, '1');

    await resetUnreadableStorage({ secureStore, meta, deleteData });

    expect(deleteData).toHaveBeenCalledTimes(1);
    expect(await secureStore.getItem(SecureKey.STORAGE_ENCRYPTION_KEY)).toBeNull();
    expect(await secureStore.getItem(SecureKey.VAULT)).toBe('vault');
    expect(meta.getAllKeys()).toEqual([]);
  });
});
