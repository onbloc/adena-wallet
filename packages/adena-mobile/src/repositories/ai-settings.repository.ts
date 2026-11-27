import { AI_CONFIG } from '../config/ai';
import { StorageKey } from '../migration/storage-keys';
import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export const AiProvider = {
  OPENAI: 'openai',
  LOCAL: 'local',
} as const;

export type AiProvider = (typeof AiProvider)[keyof typeof AiProvider];

export interface AiSettings {
  provider: AiProvider;
  // Hosted model id; ignored by the on-device provider.
  model: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = { provider: AiProvider.OPENAI, model: AI_CONFIG.defaultModel };

const isProvider = (value: unknown): value is AiProvider => value === AiProvider.OPENAI || value === AiProvider.LOCAL;

// Unsupported or corrupt values fall back to the defaults.
const sanitize = (stored: Partial<AiSettings> | null | undefined): AiSettings => ({
  provider: isProvider(stored?.provider) ? stored.provider : DEFAULT_AI_SETTINGS.provider,
  model: typeof stored?.model === 'string' && stored.model.trim() !== '' ? stored.model.trim() : DEFAULT_AI_SETTINGS.model,
});

export interface AiSettingsRepository {
  get(): AiSettings;
  save(settings: AiSettings): AiSettings;
  getApiKey(): Promise<string | null>;
  // null removes the key.
  saveApiKey(apiKey: string | null): Promise<void>;
}

// Preferences live in general storage; the API key only in the keychain.
export class StorageAiSettingsRepository implements AiSettingsRepository {
  constructor(private readonly store: KeyValueStore, private readonly secureStore: SecureStore) {}

  get(): AiSettings {
    return sanitize(readJson<Partial<AiSettings>>(this.store, StorageKey.AI_SETTINGS));
  }

  save(settings: AiSettings): AiSettings {
    const next = sanitize(settings);

    writeJson(this.store, StorageKey.AI_SETTINGS, next);
    return next;
  }

  getApiKey(): Promise<string | null> {
    return this.secureStore.getItem(SecureKey.AI_API_KEY);
  }

  async saveApiKey(apiKey: string | null): Promise<void> {
    if (apiKey === null) {
      await this.secureStore.removeItem(SecureKey.AI_API_KEY);
      return;
    }

    await this.secureStore.setItem(SecureKey.AI_API_KEY, apiKey);
  }
}
