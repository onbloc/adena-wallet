import { StorageKey } from '../../../src/migration/storage-keys';
import { StorageAddressBookRepository } from '../../../src/repositories/address-book.repository';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('StorageAddressBookRepository', () => {
  it('round-trips entries and defaults to empty', () => {
    const store = new MemoryKeyValueStore();
    const repository = new StorageAddressBookRepository(store);
    const entry = { id: '1', name: 'Alice', address: 'g1a', createdAt: 1 };

    expect(repository.getAll()).toEqual([]);
    repository.saveAll([entry]);
    expect(repository.getAll()).toEqual([entry]);
    repository.saveAll([]);
    expect(repository.getAll()).toEqual([]);
  });

  it.each(['oops', 'null'])('returns empty for corrupt data %p', (raw) => {
    const store = new MemoryKeyValueStore();

    store.setString(StorageKey.ADDRESS_BOOK, raw);
    expect(new StorageAddressBookRepository(store).getAll()).toEqual([]);
  });
});
