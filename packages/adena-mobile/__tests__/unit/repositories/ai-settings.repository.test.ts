import { StorageKey } from '../../../src/migration/storage-keys';
import { AiProvider, DEFAULT_AI_SETTINGS, StorageAiSettingsRepository } from '../../../src/repositories/ai-settings.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageAiSettingsRepository', () => {
  it('keeps credentials only in secure storage and removes them on null', async () => {
    const store = new MemoryKeyValueStore();
    const secure = new MemorySecureStore();
    const repository = new StorageAiSettingsRepository(store, secure);

    repository.save({ provider: AiProvider.LOCAL, model: ' model-id ' });
    await repository.saveApiKey('test-secret');
    expect(repository.get()).toEqual({ provider: AiProvider.LOCAL, model: 'model-id' });
    expect(await secure.getItem(SecureKey.AI_API_KEY)).toBe('test-secret');
    expect(await repository.getApiKey()).toBe('test-secret');

    for (const key of store.getAllKeys()) {
      expect(store.getString(key)).not.toContain('test-secret');
    }

    await repository.saveApiKey(null);
    expect(await repository.getApiKey()).toBeNull();
  });

  it.each(['{broken', 'null', '{"provider":"bad","model":0}', '{"provider":false,"model":" "}'])('sanitizes invalid stored preferences %s', (value) => {
    const store = new MemoryKeyValueStore();

    store.setString(StorageKey.AI_SETTINGS, value);
    expect(new StorageAiSettingsRepository(store, new MemorySecureStore()).get()).toEqual(DEFAULT_AI_SETTINGS);
  });
});
