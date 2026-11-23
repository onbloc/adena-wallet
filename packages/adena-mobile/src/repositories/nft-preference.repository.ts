import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export interface NftPreferences {
  // Collection package paths.
  hidden: string[];
  pinned: string[];
}

const EMPTY: NftPreferences = { hidden: [], pinned: [] };

type Document = Record<string, NftPreferences>;

// Per account and network, like the extension's pinned GRC721 packages.
export interface NftPreferenceRepository {
  get(accountId: string, networkId: string): NftPreferences;
  save(accountId: string, networkId: string, preferences: NftPreferences): void;
  removeAccount(accountId: string): void;
}

export class StorageNftPreferenceRepository implements NftPreferenceRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): Document {
    return readJson<Document>(this.store, StorageKey.NFT_PREFERENCES) ?? {};
  }

  get(accountId: string, networkId: string): NftPreferences {
    return this.read()[`${accountId}:${networkId}`] ?? EMPTY;
  }

  save(accountId: string, networkId: string, preferences: NftPreferences): void {
    writeJson(this.store, StorageKey.NFT_PREFERENCES, { ...this.read(), [`${accountId}:${networkId}`]: preferences });
  }

  removeAccount(accountId: string): void {
    writeJson(this.store, StorageKey.NFT_PREFERENCES, Object.fromEntries(
      Object.entries(this.read()).filter(([key]) => !key.startsWith(`${accountId}:`)),
    ));
  }
}
