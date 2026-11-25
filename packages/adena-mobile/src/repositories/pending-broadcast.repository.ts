import { StorageKey } from '../migration/storage-keys';
import { BUILT_IN_NETWORKS } from '../resources';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// A send whose outcome is unknown. Only hashes, ids and signer state, never the signed tx.
// Scoped by chain id, not network id: a custom network on the same chain shares the signer sequence.
export interface PendingBroadcastRecord {
  // The original tx plus any replacement signed with the same sequence, so at most one can commit.
  hashes: string[];
  accountId: string;
  chainId: string;
  createdAt: number;
  // Signer sequence shared by `hashes`; absent on records written before it was stored.
  sequence?: string;
  accountNumber?: string;
}

// Shape written by the previous version: one hash, scoped by network id.
interface LegacyPendingBroadcastRecord {
  hash: string;
  accountId: string;
  networkId: string;
  createdAt: number;
}

type StoredRecord = PendingBroadcastRecord | LegacyPendingBroadcastRecord;
type Document = Record<string, StoredRecord>;

const CUSTOM_NETWORK_PREFIX = 'custom:';

const scopeKey = (accountId: string, chainId: string): string => `${accountId}:${chainId}`;

// Built-in ids map through the network list; custom ids embed the chain id (`custom:<chainId>:<rpcUrl>`).
export const chainIdOfNetworkId = (networkId: string): string => {
  if (networkId.startsWith(CUSTOM_NETWORK_PREFIX)) {
    return networkId.slice(CUSTOM_NETWORK_PREFIX.length).split(':')[0];
  }

  return BUILT_IN_NETWORKS.find(network => network.id === networkId)?.chainId ?? networkId;
};

const normalize = (stored: StoredRecord): PendingBroadcastRecord => {
  if ('hashes' in stored && Array.isArray(stored.hashes)) {
    return stored;
  }

  const { hash, networkId, ...rest } = stored as LegacyPendingBroadcastRecord;

  return { ...rest, hashes: [hash], chainId: chainIdOfNetworkId(networkId) };
};

// At most one per account and chain, since sending there stays blocked while it exists.
export interface PendingBroadcastRepository {
  get(accountId: string, chainId: string): PendingBroadcastRecord | undefined;
  save(record: PendingBroadcastRecord): void;
  // Drops the whole record once one of its txs is resolved; no-op unless it tracks `hash`,
  // so a stale poll cannot drop a newer record.
  remove(accountId: string, chainId: string, hash: string): void;
  // Forgets one tx that was definitely not accepted; the record goes once no hash is left.
  discardHash(accountId: string, chainId: string, hash: string): void;
  removeAccount(accountId: string): void;
}

export class StoragePendingBroadcastRepository implements PendingBroadcastRepository {
  constructor(private readonly store: KeyValueStore) {}

  // Re-keys legacy records by chain id; if two map to the same scope, the first one is kept.
  private read(): Record<string, PendingBroadcastRecord> {
    const document = readJson<Document>(this.store, StorageKey.PENDING_BROADCASTS) ?? {};
    const records: Record<string, PendingBroadcastRecord> = {};

    for (const stored of Object.values(document)) {
      const record = normalize(stored);
      const key = scopeKey(record.accountId, record.chainId);

      records[key] = records[key] ?? record;
    }

    return records;
  }

  private write(records: Record<string, PendingBroadcastRecord>): void {
    writeJson(this.store, StorageKey.PENDING_BROADCASTS, records);
  }

  get(accountId: string, chainId: string): PendingBroadcastRecord | undefined {
    return this.read()[scopeKey(accountId, chainId)];
  }

  save(record: PendingBroadcastRecord): void {
    this.write({ ...this.read(), [scopeKey(record.accountId, record.chainId)]: record });
  }

  remove(accountId: string, chainId: string, hash: string): void {
    const records = this.read();
    const key = scopeKey(accountId, chainId);

    if (!records[key]?.hashes.includes(hash)) {
      return;
    }

    delete records[key];
    this.write(records);
  }

  discardHash(accountId: string, chainId: string, hash: string): void {
    const record = this.get(accountId, chainId);

    if (!record?.hashes.includes(hash)) {
      return;
    }

    if (record.hashes.length === 1) {
      this.remove(accountId, chainId, hash);
      return;
    }

    this.save({ ...record, hashes: record.hashes.filter(item => item !== hash) });
  }

  removeAccount(accountId: string): void {
    this.write(Object.fromEntries(Object.entries(this.read()).filter(([, record]) => record.accountId !== accountId)));
  }
}
