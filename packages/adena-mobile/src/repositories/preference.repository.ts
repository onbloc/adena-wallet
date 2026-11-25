import { CurrencyCode, isCurrencyCode, isLanguageCode, isThemePreference, LanguageCode, ThemePreference } from '../domain/preferences';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export interface Preferences {
  biometricUnlockEnabled: boolean;
  hapticsEnabled: boolean;
  currency: CurrencyCode;
  language: LanguageCode;
  theme: ThemePreference;
  hideSmallBalances: boolean;
  hideUnknownTokens: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  biometricUnlockEnabled: false,
  hapticsEnabled: true,
  currency: CurrencyCode.USD,
  language: LanguageCode.EN,
  theme: ThemePreference.SYSTEM,
  hideSmallBalances: true,
  hideUnknownTokens: true,
};

// Values no longer supported (or corrupt) fall back to the defaults.
const sanitize = (stored: Partial<Preferences> | null | undefined): Preferences => {
  const merged = { ...DEFAULT_PREFERENCES, ...stored };

  return {
    ...merged,
    currency: isCurrencyCode(merged.currency) ? merged.currency : DEFAULT_PREFERENCES.currency,
    language: isLanguageCode(merged.language) ? merged.language : DEFAULT_PREFERENCES.language,
    theme: isThemePreference(merged.theme) ? merged.theme : DEFAULT_PREFERENCES.theme,
  };
};

export interface PreferenceRepository {
  get(): Preferences;
  update(patch: Partial<Preferences>): Preferences;
  clear(): void;
}

export class StoragePreferenceRepository implements PreferenceRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(): Preferences {
    return sanitize(readJson<Partial<Preferences>>(this.store, StorageKey.PREFERENCES));
  }

  update(patch: Partial<Preferences>): Preferences {
    const next = sanitize({ ...this.get(), ...patch });

    writeJson(this.store, StorageKey.PREFERENCES, next);
    return next;
  }

  clear(): void {
    this.store.remove(StorageKey.PREFERENCES);
  }
}
