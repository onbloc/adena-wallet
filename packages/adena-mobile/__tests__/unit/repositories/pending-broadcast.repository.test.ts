import { StoragePendingBroadcastRepository } from '../../../src/repositories/pending-broadcast.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const record = (hash: string, accountId: string, networkId: string) => ({ hash, accountId, networkId, createdAt: 1 });

describe('StoragePendingBroadcastRepository', () => {
  let repository: StoragePendingBroadcastRepository;

  beforeEach(() => {
    repository = new StoragePendingBroadcastRepository(new MemoryKeyValueStore());
  });

  it('scopes records per account and network', () => {
    repository.save(record('h1', 'a', 'n1'));
    repository.save(record('h2', 'a', 'n2'));

    expect(repository.get('a', 'n1')).toEqual(record('h1', 'a', 'n1'));
    expect(repository.get('a', 'n2')).toEqual(record('h2', 'a', 'n2'));
    expect(repository.get('b', 'n1')).toBeUndefined();
  });

  it('removes a record only when the hash matches', () => {
    repository.save(record('h1', 'a', 'n1'));
    repository.remove('a', 'n1', 'stale');
    expect(repository.get('a', 'n1')).toBeDefined();

    repository.remove('a', 'n1', 'h1');
    expect(repository.get('a', 'n1')).toBeUndefined();
  });

  it('removeAccount drops only that account', () => {
    repository.save(record('h1', 'a', 'n1'));
    repository.save(record('h2', 'a', 'n2'));
    repository.save(record('h3', 'ab', 'n1'));
    repository.removeAccount('a');

    expect(repository.get('a', 'n1')).toBeUndefined();
    expect(repository.get('a', 'n2')).toBeUndefined();
    expect(repository.get('ab', 'n1')).toEqual(record('h3', 'ab', 'n1'));
  });
});
