import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export interface Preferences {
  biometricUnlockEnabled: boolean;
  hapticsEnabled: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  biometricUnlockEnabled: false,
  hapticsEnabled: true,
};

export interface PreferenceRepository {
  get(): Preferences;
  update(patch: Partial<Preferences>): Preferences;
  clear(): void;
}

export class StoragePreferenceRepository implements PreferenceRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(): Preferences {
    return { ...DEFAULT_PREFERENCES, ...readJson<Partial<Preferences>>(this.store, StorageKey.PREFERENCES) };
  }

  update(patch: Partial<Preferences>): Preferences {
    const next = { ...this.get(), ...patch };

    writeJson(this.store, StorageKey.PREFERENCES, next);
    return next;
  }

  clear(): void {
    this.store.remove(StorageKey.PREFERENCES);
  }
}
