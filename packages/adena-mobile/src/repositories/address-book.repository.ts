import { AddressBookEntry } from '../domain/address-book';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// Wallet-wide address book, kept in the encrypted general store.
export interface AddressBookRepository {
  getAll(): AddressBookEntry[];
  saveAll(entries: AddressBookEntry[]): void;
}

export class StorageAddressBookRepository implements AddressBookRepository {
  constructor(private readonly store: KeyValueStore) {}

  getAll(): AddressBookEntry[] {
    return readJson<AddressBookEntry[]>(this.store, StorageKey.ADDRESS_BOOK) ?? [];
  }

  saveAll(entries: AddressBookEntry[]): void {
    writeJson(this.store, StorageKey.ADDRESS_BOOK, entries);
  }
}
