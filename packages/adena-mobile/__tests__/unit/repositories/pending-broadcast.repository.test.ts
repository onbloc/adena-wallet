import { StorageKey } from '../../../src/migration/storage-keys';
import { chainIdOfNetworkId, StoragePendingBroadcastRepository } from '../../../src/repositories/pending-broadcast.repository';
import { BUILT_IN_NETWORKS } from '../../../src/resources';
import { writeJson } from '../../../src/storage/key-value-store';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const record = (hash: string, accountId: string, chainId: string, createdAt = 1) => ({ hashes: [hash], accountId, chainId, createdAt });

describe('StoragePendingBroadcastRepository', () => {
  let store: MemoryKeyValueStore;
  let repository: StoragePendingBroadcastRepository;

  beforeEach(() => {
    store = new MemoryKeyValueStore();
    repository = new StoragePendingBroadcastRepository(store);
  });

  it('scopes records per account and chain', () => {
    repository.add(record('h1', 'a', 'c1'));
    repository.add(record('h2', 'a', 'c2'));

    expect(repository.list('a', 'c1')).toEqual([{ ...record('h1', 'a', 'c1'), id: 'h1' }]);
    expect(repository.list('a', 'c2')).toEqual([{ ...record('h2', 'a', 'c2'), id: 'h2' }]);
    expect(repository.list('b', 'c1')).toEqual([]);
  });

  it('keeps several records of one scope apart, oldest first', () => {
    repository.add({ ...record('h2', 'a', 'c1', 2), sequence: '4' });
    repository.add({ ...record('h1', 'a', 'c1', 1), sequence: '3' });

    expect(repository.list('a', 'c1').map(item => [item.id, item.hashes, item.sequence])).toEqual([['h1', ['h1'], '3'], ['h2', ['h2'], '4']]);
    expect(repository.find('a', 'c1', 'h2')?.sequence).toBe('4');
  });

  it('removes only the record that tracks the hash', () => {
    repository.add({ ...record('h1', 'a', 'c1'), hashes: ['h1', 'h2'] });
    repository.add(record('h3', 'a', 'c1', 2));

    expect(repository.remove('a', 'c1', 'stale')).toBe(false);
    expect(repository.list('a', 'c1')).toHaveLength(2);

    expect(repository.remove('a', 'c1', 'h2')).toBe(true);
    expect(repository.list('a', 'c1').map(item => item.id)).toEqual(['h3']);
  });

  it('discards a single hash and drops only its record once none is left', () => {
    repository.add({ ...record('h1', 'a', 'c1'), hashes: ['h1', 'h2'], sequence: '3' });
    repository.add(record('h3', 'a', 'c1', 2));
    repository.discardHash('a', 'c1', 'h1');
    // The id stays stable after its first hash is gone.
    expect(repository.find('a', 'c1', 'h2')).toEqual({ ...record('h2', 'a', 'c1'), id: 'h1', sequence: '3' });

    repository.discardHash('a', 'c1', 'h2');
    expect(repository.list('a', 'c1').map(item => item.id)).toEqual(['h3']);
  });

  it('does not revive a removed record on update', () => {
    const added = repository.add(record('h1', 'a', 'c1'));

    repository.remove('a', 'c1', 'h1');
    repository.update({ ...added, sequence: '3' });
    expect(repository.list('a', 'c1')).toEqual([]);
  });

  it('reads a record of the previous version, keyed by network id, under its chain id', () => {
    const builtIn = BUILT_IN_NETWORKS[0];

    writeJson(store, StorageKey.PENDING_BROADCASTS, {
      [`a:${builtIn.id}`]: { hash: 'OLD', accountId: 'a', networkId: builtIn.id, createdAt: 5 },
      'a:custom:dev-1:http://localhost:26657': { hash: 'CUSTOM', accountId: 'a', networkId: 'custom:dev-1:http://localhost:26657', createdAt: 6 },
    });

    expect(repository.list('a', builtIn.chainId)).toEqual([{ id: `a:${builtIn.id}`, hashes: ['OLD'], accountId: 'a', chainId: builtIn.chainId, createdAt: 5 }]);
    expect(repository.list('a', 'dev-1')).toMatchObject([{ hashes: ['CUSTOM'], accountId: 'a', chainId: 'dev-1', createdAt: 6 }]);
    repository.remove('a', 'dev-1', 'CUSTOM');
    expect(repository.find('a', builtIn.chainId, 'OLD')).toBeDefined();
    expect(chainIdOfNetworkId('custom:test-5:https://rpc.example:443')).toBe('test-5');
  });

  it('keeps both legacy records of the built-in and a custom network of the same chain', () => {
    const builtIn = BUILT_IN_NETWORKS[0];
    const custom = `custom:${builtIn.chainId}:http://localhost:26657`;

    writeJson(store, StorageKey.PENDING_BROADCASTS, {
      [`a:${builtIn.id}`]: { hash: 'DEFAULT', accountId: 'a', networkId: builtIn.id, createdAt: 5 },
      [`a:${custom}`]: { hash: 'CUSTOM', accountId: 'a', networkId: custom, createdAt: 6 },
    });

    expect(repository.list('a', builtIn.chainId).map(item => item.hashes)).toEqual([['DEFAULT'], ['CUSTOM']]);
    repository.remove('a', builtIn.chainId, 'DEFAULT');
    expect(repository.list('a', builtIn.chainId).map(item => item.hashes)).toEqual([['CUSTOM']]);
  });

  it('reads a record written by the previous chain-scoped version under its storage key', () => {
    writeJson(store, StorageKey.PENDING_BROADCASTS, { 'a:c1': { hashes: ['h1', 'h2'], accountId: 'a', chainId: 'c1', createdAt: 1, sequence: '3' } });

    expect(repository.list('a', 'c1')).toEqual([{ id: 'a:c1', hashes: ['h1', 'h2'], accountId: 'a', chainId: 'c1', createdAt: 1, sequence: '3' }]);
    repository.discardHash('a', 'c1', 'h2');
    expect(repository.list('a', 'c1')).toMatchObject([{ id: 'a:c1', hashes: ['h1'] }]);
  });

  it('removeAccount drops only that account', () => {
    repository.add(record('h1', 'a', 'c1'));
    repository.add(record('h2', 'a', 'c2'));
    repository.add(record('h3', 'ab', 'c1'));
    repository.removeAccount('a');

    expect(repository.list('a', 'c1')).toEqual([]);
    expect(repository.list('a', 'c2')).toEqual([]);
    expect(repository.list('ab', 'c1')).toEqual([{ ...record('h3', 'ab', 'c1'), id: 'h3' }]);
  });
});
