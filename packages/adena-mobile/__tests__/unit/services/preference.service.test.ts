import { DEFAULT_PREFERENCES, StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { PreferenceService } from '../../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('PreferenceService', () => {
  it('returns the defaults on a fresh install', () => {
    expect(new PreferenceService(new StoragePreferenceRepository(new MemoryKeyValueStore())).get()).toEqual(DEFAULT_PREFERENCES);
  });

  it('merges and persists patches', () => {
    const store = new MemoryKeyValueStore();
    const service = new PreferenceService(new StoragePreferenceRepository(store));

    expect(service.update({ hapticsEnabled: false })).toEqual({ ...DEFAULT_PREFERENCES, hapticsEnabled: false });
    expect(new PreferenceService(new StoragePreferenceRepository(store)).get().hapticsEnabled).toBe(false);
    expect(service.update({})).toEqual({ ...DEFAULT_PREFERENCES, hapticsEnabled: false });
  });

  it('notifies subscribers after updates until they unsubscribe', () => {
    const service = new PreferenceService(new StoragePreferenceRepository(new MemoryKeyValueStore()));
    const listener = jest.fn(() => expect(service.get().theme).toBe('dark'));
    const unsubscribe = service.subscribe(listener);

    service.update({ theme: 'dark' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    service.update({ theme: 'light' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
