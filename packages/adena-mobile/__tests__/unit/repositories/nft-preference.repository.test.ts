import { StorageKey } from '../../../src/migration/storage-keys';
import { StorageNftPreferenceRepository } from '../../../src/repositories/nft-preference.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageNftPreferenceRepository', () => {
  let store: MemoryKeyValueStore;
  let repository: StorageNftPreferenceRepository;

  beforeEach(() => {
    store = new MemoryKeyValueStore();
    repository = new StorageNftPreferenceRepository(store);
  });

  it('returns empty preferences by default', () => {
    expect(repository.get('a', 'n')).toEqual({ hidden: [], pinned: [] });
  });

  it('scopes preferences per account and network', () => {
    repository.save('a', 'n1', { hidden: ['x'], pinned: [] });
    repository.save('a', 'n2', { hidden: [], pinned: ['y'] });
    repository.save('b', 'n1', { hidden: ['z'], pinned: ['z'] });
    expect(repository.get('a', 'n1')).toEqual({ hidden: ['x'], pinned: [] });
    expect(repository.get('a', 'n2')).toEqual({ hidden: [], pinned: ['y'] });
    expect(repository.get('b', 'n1')).toEqual({ hidden: ['z'], pinned: ['z'] });
    expect(repository.get('b', 'n2')).toEqual({ hidden: [], pinned: [] });
  });

  it('removeAccount drops only that account, matching on the full id prefix', () => {
    repository.save('a', 'n1', { hidden: ['x'], pinned: [] });
    repository.save('ab', 'n1', { hidden: ['y'], pinned: [] });
    repository.removeAccount('a');
    expect(repository.get('a', 'n1')).toEqual({ hidden: [], pinned: [] });
    expect(repository.get('ab', 'n1')).toEqual({ hidden: ['y'], pinned: [] });
    repository.removeAccount('missing');
    expect(Object.keys(JSON.parse(store.getString(StorageKey.NFT_PREFERENCES)!))).toEqual(['ab:n1']);
  });

  it('removeAccount on an empty store writes an empty document', () => {
    repository.removeAccount('a');
    expect(store.getString(StorageKey.NFT_PREFERENCES)).toBe('{}');
  });

  it('treats corrupt data as empty and recovers on save', () => {
    store.setString(StorageKey.NFT_PREFERENCES, 'nope');
    expect(repository.get('a', 'n')).toEqual({ hidden: [], pinned: [] });
    repository.save('a', 'n', { hidden: ['h'], pinned: [] });
    expect(repository.get('a', 'n')).toEqual({ hidden: ['h'], pinned: [] });
  });
});
