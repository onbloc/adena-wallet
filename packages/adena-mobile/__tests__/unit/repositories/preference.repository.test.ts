import { CurrencyCode, LanguageCode, ThemePreference } from '../../../src/domain/preferences';
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
    expect(DEFAULT_PREFERENCES).toEqual({
      biometricUnlockEnabled: false, hapticsEnabled: true, currency: 'USD', language: 'en', theme: 'system', hideSmallBalances: true, hideUnknownTokens: true, swapSlippage: null, swapDeadlineMinutes: 10,
    });
  });

  it('persists swap settings and drops out-of-range values', () => {
    expect(repository.update({ swapSlippage: 1.5, swapDeadlineMinutes: 30 })).toMatchObject({ swapSlippage: 1.5, swapDeadlineMinutes: 30 });
    expect(new StoragePreferenceRepository(store).get()).toMatchObject({ swapSlippage: 1.5, swapDeadlineMinutes: 30 });
    expect(repository.update({ swapSlippage: null })).toMatchObject({ swapSlippage: null });
    store.setString(StorageKey.PREFERENCES, JSON.stringify({ swapSlippage: 90, swapDeadlineMinutes: 0.5 }));
    expect(repository.get()).toMatchObject({ swapSlippage: null, swapDeadlineMinutes: 10 });
  });

  it('merges patches and persists the result', () => {
    expect(repository.update({ biometricUnlockEnabled: true })).toEqual({ ...DEFAULT_PREFERENCES, biometricUnlockEnabled: true });
    expect(repository.update({ hapticsEnabled: false })).toEqual({ ...DEFAULT_PREFERENCES, biometricUnlockEnabled: true, hapticsEnabled: false });
    expect(repository.update({})).toEqual({ ...DEFAULT_PREFERENCES, biometricUnlockEnabled: true, hapticsEnabled: false });
    expect(JSON.parse(store.getString(StorageKey.PREFERENCES)!)).toEqual({ ...DEFAULT_PREFERENCES, biometricUnlockEnabled: true, hapticsEnabled: false });
  });

  it('fills missing keys from defaults and ignores corrupt data', () => {
    store.setString(StorageKey.PREFERENCES, JSON.stringify({ hapticsEnabled: false }));
    expect(repository.get()).toEqual({ ...DEFAULT_PREFERENCES, hapticsEnabled: false });
    store.setString(StorageKey.PREFERENCES, 'garbage');
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
    store.setString(StorageKey.PREFERENCES, 'null');
    expect(repository.get()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists currency, language, theme and balance filters', () => {
    repository.update({ currency: CurrencyCode.USD, language: LanguageCode.EN, theme: ThemePreference.DARK, hideSmallBalances: false, hideUnknownTokens: false });
    expect(new StoragePreferenceRepository(store).get())
      .toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark', hideSmallBalances: false, hideUnknownTokens: false });
  });

  it('falls back to the defaults for unsupported currency, language or theme', () => {
    store.setString(StorageKey.PREFERENCES, JSON.stringify({ currency: 'KRW', language: 'ko', theme: 'sepia', hapticsEnabled: false }));
    expect(repository.get()).toEqual({ ...DEFAULT_PREFERENCES, hapticsEnabled: false });
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
