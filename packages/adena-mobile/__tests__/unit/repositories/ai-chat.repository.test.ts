import { AI_CHAT_KEY_PREFIX } from '../../../src/migration/storage-keys';
import { StorageAiChatRepository } from '../../../src/repositories/ai-chat.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageAiChatRepository', () => {
  it('isolates network/account scopes even when identifiers contain dots', () => {
    const repository = new StorageAiChatRepository(new MemoryKeyValueStore());
    const first = { networkId: 'a.b', accountId: 'c' };
    const second = { networkId: 'a', accountId: 'b.c' };

    repository.save(first, 'first');
    repository.save(second, 'second');
    expect(repository.load(first)).toBe('first');
    expect(repository.load(second)).toBe('second');
    repository.clear(first);
    expect(repository.load(first)).toBeUndefined();
    expect(repository.load(second)).toBe('second');
  });

  it('removes exactly one account across networks without matching identifier suffixes', () => {
    const store = new MemoryKeyValueStore();
    const repository = new StorageAiChatRepository(store);
    const first = { networkId: 'mainnet', accountId: 'a' };
    const second = { networkId: 'testnet', accountId: 'a' };
    const other = { networkId: 'mainnet', accountId: 'prefix.a' };

    repository.save(first, 'first');
    repository.save(second, 'second');
    repository.save(other, 'other');
    store.setString('unrelated.a', 'keep');
    store.setString(`${AI_CHAT_KEY_PREFIX}{corrupt`, 'keep');
    repository.removeAccount('a');
    expect(repository.load(first)).toBeUndefined();
    expect(repository.load(second)).toBeUndefined();
    expect(repository.load(other)).toBe('other');
    expect(store.getString('unrelated.a')).toBe('keep');
  });
});
