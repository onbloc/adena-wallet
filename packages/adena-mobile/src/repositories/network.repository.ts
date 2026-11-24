import { Network } from '../domain/network';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

interface NetworkDocument {
  customNetworks: Network[];
  currentNetworkId: string | null;
}

const EMPTY: NetworkDocument = { customNetworks: [], currentNetworkId: null };

export interface NetworkRepository {
  getCustomNetworks(): Network[];
  saveCustomNetworks(networks: Network[]): void;
  getCurrentNetworkId(): string | null;
  setCurrentNetworkId(networkId: string): void;
  clear(): void;
}

export class StorageNetworkRepository implements NetworkRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): NetworkDocument {
    return readJson<NetworkDocument>(this.store, StorageKey.NETWORKS) ?? EMPTY;
  }

  private write(document: NetworkDocument): void {
    writeJson(this.store, StorageKey.NETWORKS, document);
  }

  getCustomNetworks(): Network[] {
    return this.read().customNetworks;
  }

  saveCustomNetworks(networks: Network[]): void {
    this.write({ ...this.read(), customNetworks: networks });
  }

  getCurrentNetworkId(): string | null {
    return this.read().currentNetworkId;
  }

  setCurrentNetworkId(networkId: string): void {
    this.write({ ...this.read(), currentNetworkId: networkId });
  }

  clear(): void {
    this.store.remove(StorageKey.NETWORKS);
  }
}
