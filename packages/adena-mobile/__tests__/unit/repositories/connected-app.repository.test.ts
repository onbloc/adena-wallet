import { ConnectedApp } from '../../../src/domain/dapp';
import { StorageKey } from '../../../src/migration/storage-keys';
import { StorageConnectedAppRepository } from '../../../src/repositories/connected-app.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageConnectedAppRepository', () => {
  const app = { origin: 'https://a.test', name: 'A', networkId: 'n', accountId: 'acc', connectedAt: 1, lastUsedAt: 2 } as ConnectedApp;

  it('round-trips, clears and defaults to empty', () => {
    const store = new MemoryKeyValueStore();
    const repository = new StorageConnectedAppRepository(store);

    expect(repository.getAll()).toEqual([]);
    repository.saveAll([app]);
    expect(repository.getAll()).toEqual([app]);
    repository.clear();
    expect(store.getString(StorageKey.CONNECTED_APPS)).toBeUndefined();
    expect(repository.getAll()).toEqual([]);
  });

  it('returns empty for corrupt data', () => {
    const store = new MemoryKeyValueStore();

    store.setString(StorageKey.CONNECTED_APPS, '[{');
    expect(new StorageConnectedAppRepository(store).getAll()).toEqual([]);
  });
});
