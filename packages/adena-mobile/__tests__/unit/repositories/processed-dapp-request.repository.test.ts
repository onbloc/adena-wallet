import { MemoryProcessedDappRequestRepository, StorageProcessedDappRequestRepository } from '../../../src/repositories/processed-dapp-request.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageProcessedDappRequestRepository', () => {
  it('remembers keys across instances on the same store', () => {
    const store = new MemoryKeyValueStore();

    new StorageProcessedDappRequestRepository(store).add('a');
    expect(new StorageProcessedDappRequestRepository(store).has('a')).toBe(true);
    expect(new StorageProcessedDappRequestRepository(store).has('b')).toBe(false);
  });

  it('forgets keys after the TTL', () => {
    let now = 1_000;
    const repository = new StorageProcessedDappRequestRepository(new MemoryKeyValueStore(), () => now, 100);

    repository.add('a');
    now = 1_099;
    expect(repository.has('a')).toBe(true);
    now = 1_100;
    expect(repository.has('a')).toBe(false);
  });

  it('keeps only the newest entries', () => {
    const repository = new StorageProcessedDappRequestRepository(new MemoryKeyValueStore(), Date.now, 60_000, 2);

    ['a', 'b', 'c'].forEach(key => repository.add(key));
    expect(['a', 'b', 'c'].map(key => repository.has(key))).toEqual([false, true, true]);
  });

  it('removes a key for every instance on the same store', () => {
    const store = new MemoryKeyValueStore();

    ['a', 'b'].forEach(key => new StorageProcessedDappRequestRepository(store).add(key));
    new StorageProcessedDappRequestRepository(store).remove('a');
    expect(['a', 'b'].map(key => new StorageProcessedDappRequestRepository(store).has(key))).toEqual([false, true]);
  });

  it('ignores corrupted storage', () => {
    const store = new MemoryKeyValueStore();

    store.setString('processed-dapp-requests', '{"not":"a list"}');
    expect(new StorageProcessedDappRequestRepository(store).has('a')).toBe(false);
  });
});

describe('MemoryProcessedDappRequestRepository', () => {
  it('remembers keys', () => {
    const repository = new MemoryProcessedDappRequestRepository();

    repository.add('a');
    expect(repository.has('a')).toBe(true);
    repository.remove('a');
    expect(repository.has('a')).toBe(false);
  });
});
