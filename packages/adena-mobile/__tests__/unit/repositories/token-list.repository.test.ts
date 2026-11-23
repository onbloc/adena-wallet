import { ManagedToken } from '../../../src/domain/token';
import { StorageKey } from '../../../src/migration/storage-keys';
import { StorageTokenListRepository } from '../../../src/repositories/token-list.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const token = (id: string): ManagedToken => ({ id, visible: true, source: 'default' } as ManagedToken);

describe('StorageTokenListRepository', () => {
  let store: MemoryKeyValueStore;
  let repository: StorageTokenListRepository;

  beforeEach(() => {
    store = new MemoryKeyValueStore();
    repository = new StorageTokenListRepository(store);
  });

  it('returns undefined for an unknown list but keeps an empty saved list', () => {
    expect(repository.get('a', 'n')).toBeUndefined();
    repository.save('a', 'n', []);
    expect(repository.get('a', 'n')).toEqual([]);
  });

  it('scopes lists per account and network', () => {
    repository.save('a', 'n1', [token('t1')]);
    repository.save('a', 'n2', [token('t2')]);
    repository.save('a', 'n1', [token('t3')]);
    expect(repository.get('a', 'n1')).toEqual([token('t3')]);
    expect(repository.get('a', 'n2')).toEqual([token('t2')]);
  });

  it('removeAccount drops only that account', () => {
    repository.save('a', 'n1', [token('t1')]);
    repository.save('ab', 'n1', [token('t2')]);
    repository.removeAccount('a');
    expect(repository.get('a', 'n1')).toBeUndefined();
    expect(repository.get('ab', 'n1')).toEqual([token('t2')]);
  });

  it('clear removes everything; corrupt data reads as empty', () => {
    repository.save('a', 'n1', [token('t1')]);
    repository.clear();
    expect(store.getString(StorageKey.TOKEN_LISTS)).toBeUndefined();
    store.setString(StorageKey.TOKEN_LISTS, '{');
    expect(repository.get('a', 'n1')).toBeUndefined();
    repository.removeAccount('a');
    expect(store.getString(StorageKey.TOKEN_LISTS)).toBe('{}');
  });
});
