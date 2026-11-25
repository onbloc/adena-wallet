import { ConnectedApp } from '../domain/dapp';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export interface ConnectedAppRepository {
  getAll(): ConnectedApp[];
  saveAll(apps: ConnectedApp[]): void;
  clear(): void;
}

export class StorageConnectedAppRepository implements ConnectedAppRepository {
  constructor(private readonly store: KeyValueStore) {}

  getAll(): ConnectedApp[] {
    return readJson<ConnectedApp[]>(this.store, StorageKey.CONNECTED_APPS) ?? [];
  }

  saveAll(apps: ConnectedApp[]): void {
    writeJson(this.store, StorageKey.CONNECTED_APPS, apps);
  }

  clear(): void {
    this.store.remove(StorageKey.CONNECTED_APPS);
  }
}
