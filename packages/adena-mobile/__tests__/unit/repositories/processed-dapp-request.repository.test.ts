import { MemoryProcessedDappRequestRepository, ProcessedDappRequestState, StorageProcessedDappRequestRepository } from '../../../src/repositories/processed-dapp-request.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const DONE = { state: ProcessedDappRequestState.DONE };

describe('StorageProcessedDappRequestRepository', () => {
  it('keeps the state of each request across instances', () => {
    const store = new MemoryKeyValueStore();
    const pending = { state: ProcessedDappRequestState.PENDING, tx: { hash: 'HASH' }, error: { code: 'TRANSACTION_PENDING', message: 'pending' } };

    new StorageProcessedDappRequestRepository(store).set('a', { state: ProcessedDappRequestState.IN_PROGRESS });
    new StorageProcessedDappRequestRepository(store).set('a', pending);
    expect(new StorageProcessedDappRequestRepository(store).get('a')).toEqual(pending);
    expect(new StorageProcessedDappRequestRepository(store).get('b')).toBeUndefined();
  });

  it('reads entries stored before states as answered', () => {
    const store = new MemoryKeyValueStore();

    store.setString('processed-dapp-requests', JSON.stringify([{ key: 'a', at: Date.now() }]));
    expect(new StorageProcessedDappRequestRepository(store).get('a')).toEqual({ state: 'done' });
  });

  it('remembers keys across instances on the same store', () => {
    const store = new MemoryKeyValueStore();

    new StorageProcessedDappRequestRepository(store).set('a', DONE);
    expect(new StorageProcessedDappRequestRepository(store).has('a')).toBe(true);
    expect(new StorageProcessedDappRequestRepository(store).has('b')).toBe(false);
  });

  it('forgets keys after the TTL', () => {
    let now = 1_000;
    const repository = new StorageProcessedDappRequestRepository(new MemoryKeyValueStore(), () => now, 100);

    repository.set('a', DONE);
    now = 1_099;
    expect(repository.has('a')).toBe(true);
    now = 1_100;
    expect(repository.has('a')).toBe(false);
  });

  it('keeps only the newest entries', () => {
    const repository = new StorageProcessedDappRequestRepository(new MemoryKeyValueStore(), Date.now, 60_000, 2);

    ['a', 'b', 'c'].forEach(key => repository.set(key, DONE));
    expect(['a', 'b', 'c'].map(key => repository.has(key))).toEqual([false, true, true]);
  });

  it('removes a key for every instance on the same store', () => {
    const store = new MemoryKeyValueStore();

    ['a', 'b'].forEach(key => new StorageProcessedDappRequestRepository(store).set(key, DONE));
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

    repository.set('a', DONE);
    expect(repository.get('a')).toEqual(DONE);
    repository.remove('a');
    expect(repository.has('a')).toBe(false);
  });
});
