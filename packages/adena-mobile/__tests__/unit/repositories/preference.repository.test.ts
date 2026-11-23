import { StorageKey } from '../../../src/migration/storage-keys';
import { DEFAULT_PREFERENCES, StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StoragePreferenceRepository', () => {
  let store: MemoryKeyValueStore;
  let repository: StoragePreferenceRepository;

  beforeEach(() => {
    store = new MemoryKeyValueStore();
    repository = new StoragePreferenceRepository(store);
  });

  it('returns defaults when empty', () => {
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toEqual({ biometricUnlockEnabled: false, hapticsEnabled: true });
  });

  it('merges patches and persists the result', () => {
    expect(repository.update({ biometricUnlockEnabled: true })).toEqual({ biometricUnlockEnabled: true, hapticsEnabled: true });
    expect(repository.update({ hapticsEnabled: false })).toEqual({ biometricUnlockEnabled: true, hapticsEnabled: false });
    expect(repository.update({})).toEqual({ biometricUnlockEnabled: true, hapticsEnabled: false });
    expect(JSON.parse(store.getString(StorageKey.PREFERENCES)!)).toEqual({ biometricUnlockEnabled: true, hapticsEnabled: false });
  });

  it('fills missing keys from defaults and ignores corrupt data', () => {
    store.setString(StorageKey.PREFERENCES, JSON.stringify({ hapticsEnabled: false }));
    expect(repository.get()).toEqual({ biometricUnlockEnabled: false, hapticsEnabled: false });
    store.setString(StorageKey.PREFERENCES, 'garbage');
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
    store.setString(StorageKey.PREFERENCES, 'null');
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
  });

  it('does not let callers mutate the defaults', () => {
    repository.get().hapticsEnabled = false;
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
  });

  it('clear restores defaults', () => {
    repository.update({ hapticsEnabled: false });
    repository.clear();
    expect(store.getString(StorageKey.PREFERENCES)).toBeUndefined();
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
  });
});
