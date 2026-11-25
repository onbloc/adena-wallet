import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// A broadcast whose outcome is unknown. Only the hash and ids, never the signed tx.
export interface PendingBroadcastRecord {
  hash: string;
  accountId: string;
  networkId: string;
  createdAt: number;
}

type Document = Record<string, PendingBroadcastRecord>;

const scopeKey = (accountId: string, networkId: string): string => `${accountId}:${networkId}`;

// At most one per account and network, since sending there stays blocked while it exists.
export interface PendingBroadcastRepository {
  get(accountId: string, networkId: string): PendingBroadcastRecord | undefined;
  save(record: PendingBroadcastRecord): void;
  // No-op unless the stored hash matches, so a stale poll cannot drop a newer record.
  remove(accountId: string, networkId: string, hash: string): void;
  removeAccount(accountId: string): void;
}

export class StoragePendingBroadcastRepository implements PendingBroadcastRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): Document {
    return readJson<Document>(this.store, StorageKey.PENDING_BROADCASTS) ?? {};
  }

  get(accountId: string, networkId: string): PendingBroadcastRecord | undefined {
    return this.read()[scopeKey(accountId, networkId)];
  }

  save(record: PendingBroadcastRecord): void {
    writeJson(this.store, StorageKey.PENDING_BROADCASTS, { ...this.read(), [scopeKey(record.accountId, record.networkId)]: record });
  }

  remove(accountId: string, networkId: string, hash: string): void {
    const document = this.read();
    const key = scopeKey(accountId, networkId);

    if (document[key]?.hash !== hash) {
      return;
    }

    delete document[key];
    writeJson(this.store, StorageKey.PENDING_BROADCASTS, document);
  }

  removeAccount(accountId: string): void {
    writeJson(this.store, StorageKey.PENDING_BROADCASTS, Object.fromEntries(
      Object.entries(this.read()).filter(([, record]) => record.accountId !== accountId),
    ));
  }
}
