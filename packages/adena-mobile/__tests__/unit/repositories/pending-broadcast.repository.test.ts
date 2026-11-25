import { StorageKey } from '../../../src/migration/storage-keys';
import { chainIdOfNetworkId, StoragePendingBroadcastRepository } from '../../../src/repositories/pending-broadcast.repository';
import { BUILT_IN_NETWORKS } from '../../../src/resources';
import { writeJson } from '../../../src/storage/key-value-store';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const record = (hash: string, accountId: string, chainId: string) => ({ hashes: [hash], accountId, chainId, createdAt: 1 });

describe('StoragePendingBroadcastRepository', () => {
  let store: MemoryKeyValueStore;
  let repository: StoragePendingBroadcastRepository;

  beforeEach(() => {
    store = new MemoryKeyValueStore();
    repository = new StoragePendingBroadcastRepository(store);
  });

  it('scopes records per account and chain', () => {
    repository.save(record('h1', 'a', 'c1'));
    repository.save(record('h2', 'a', 'c2'));

    expect(repository.get('a', 'c1')).toEqual(record('h1', 'a', 'c1'));
    expect(repository.get('a', 'c2')).toEqual(record('h2', 'a', 'c2'));
    expect(repository.get('b', 'c1')).toBeUndefined();
  });

  it('removes a record only when it tracks the hash', () => {
    repository.save({ ...record('h1', 'a', 'c1'), hashes: ['h1', 'h2'] });
    repository.remove('a', 'c1', 'stale');
    expect(repository.get('a', 'c1')).toBeDefined();

    repository.remove('a', 'c1', 'h2');
    expect(repository.get('a', 'c1')).toBeUndefined();
  });

  it('discards a single hash and drops the record once none is left', () => {
    repository.save({ ...record('h1', 'a', 'c1'), hashes: ['h1', 'h2'], sequence: '3' });
    repository.discardHash('a', 'c1', 'h2');
    expect(repository.get('a', 'c1')).toEqual({ ...record('h1', 'a', 'c1'), sequence: '3' });

    repository.discardHash('a', 'c1', 'h1');
    expect(repository.get('a', 'c1')).toBeUndefined();
  });

  it('reads a record of the previous version, keyed by network id, under its chain id', () => {
    const builtIn = BUILT_IN_NETWORKS[0];

    writeJson(store, StorageKey.PENDING_BROADCASTS, {
      [`a:${builtIn.id}`]: { hash: 'OLD', accountId: 'a', networkId: builtIn.id, createdAt: 5 },
      'a:custom:dev-1:http://localhost:26657': { hash: 'CUSTOM', accountId: 'a', networkId: 'custom:dev-1:http://localhost:26657', createdAt: 6 },
    });

    expect(repository.get('a', builtIn.chainId)).toEqual({ hashes: ['OLD'], accountId: 'a', chainId: builtIn.chainId, createdAt: 5 });
    expect(repository.get('a', 'dev-1')).toEqual({ hashes: ['CUSTOM'], accountId: 'a', chainId: 'dev-1', createdAt: 6 });
    repository.remove('a', 'dev-1', 'CUSTOM');
    expect(repository.get('a', builtIn.chainId)?.hashes).toEqual(['OLD']);
    expect(chainIdOfNetworkId('custom:test-5:https://rpc.example:443')).toBe('test-5');
  });

  it('removeAccount drops only that account', () => {
    repository.save(record('h1', 'a', 'c1'));
    repository.save(record('h2', 'a', 'c2'));
    repository.save(record('h3', 'ab', 'c1'));
    repository.removeAccount('a');

    expect(repository.get('a', 'c1')).toBeUndefined();
    expect(repository.get('a', 'c2')).toBeUndefined();
    expect(repository.get('ab', 'c1')).toEqual(record('h3', 'ab', 'c1'));
  });
});
