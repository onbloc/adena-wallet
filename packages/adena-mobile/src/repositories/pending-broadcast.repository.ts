import { StorageKey } from '../migration/storage-keys';
import { BUILT_IN_NETWORKS } from '../resources';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// A send whose outcome is unknown. Only hashes, ids and signer state, never the signed tx.
// Scoped by chain id, not network id: a custom network on the same chain shares the signer sequence.
export interface PendingBroadcastRecord {
  // Stable for the record's lifetime: its first hash, or the storage key of a legacy record.
  id: string;
  // The original tx plus any replacement signed with the same sequence, so at most one can commit.
  hashes: string[];
  accountId: string;
  chainId: string;
  createdAt: number;
  // Signer sequence shared by `hashes`; absent on records written before it was stored.
  sequence?: string;
  accountNumber?: string;
}

export type NewPendingBroadcastRecord = Omit<PendingBroadcastRecord, 'id'>;

// Shape written by the previous version: one hash, scoped by network id.
interface LegacyPendingBroadcastRecord {
  hash: string;
  accountId: string;
  networkId: string;
  createdAt: number;
}

type StoredRecord = PendingBroadcastRecord | NewPendingBroadcastRecord | LegacyPendingBroadcastRecord;
type Document = Record<string, StoredRecord>;

const CUSTOM_NETWORK_PREFIX = 'custom:';

// Built-in ids map through the network list; custom ids embed the chain id (`custom:<chainId>:<rpcUrl>`).
export const chainIdOfNetworkId = (networkId: string): string => {
  if (networkId.startsWith(CUSTOM_NETWORK_PREFIX)) {
    return networkId.slice(CUSTOM_NETWORK_PREFIX.length).split(':')[0];
  }

  return BUILT_IN_NETWORKS.find(network => network.id === networkId)?.chainId ?? networkId;
};

// Older documents are keyed by scope; the key stays the id so each stored record survives on its own.
const normalize = (key: string, stored: StoredRecord): PendingBroadcastRecord => {
  if ('hashes' in stored && Array.isArray(stored.hashes)) {
    return { ...stored, id: 'id' in stored && stored.id ? stored.id : key };
  }

  const { hash, networkId, ...rest } = stored as LegacyPendingBroadcastRecord;

  return { ...rest, id: key, hashes: [hash], chainId: chainIdOfNetworkId(networkId) };
};

const inScope = (accountId: string, chainId: string) => (record: PendingBroadcastRecord): boolean =>
  record.accountId === accountId && record.chainId === chainId;

// Several records may share an account and chain (e.g. legacy ones written per network); each is
// tracked and resolved on its own, and sending there stays blocked while any of them exists.
export interface PendingBroadcastRepository {
  // Oldest first.
  list(accountId: string, chainId: string): PendingBroadcastRecord[];
  // The record that tracks `hash`, if any.
  find(accountId: string, chainId: string, hash: string): PendingBroadcastRecord | undefined;
  add(record: NewPendingBroadcastRecord): PendingBroadcastRecord;
  // Replaces the record with the same id; no-op once it is gone, so a stale write cannot revive it.
  update(record: PendingBroadcastRecord): void;
  // Drops the record tracking `hash` once one of its txs is resolved; returns whether one was dropped.
  remove(accountId: string, chainId: string, hash: string): boolean;
  // Forgets one tx that was definitely not accepted; its record goes once no hash is left.
  discardHash(accountId: string, chainId: string, hash: string): void;
  removeAccount(accountId: string): void;
}

export class StoragePendingBroadcastRepository implements PendingBroadcastRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): Record<string, PendingBroadcastRecord> {
    const document = readJson<Document>(this.store, StorageKey.PENDING_BROADCASTS) ?? {};
    const records: Record<string, PendingBroadcastRecord> = {};

    for (const [key, stored] of Object.entries(document)) {
      const record = normalize(key, stored);

      records[record.id] = record;
    }

    return records;
  }

  private write(records: Record<string, PendingBroadcastRecord>): void {
    writeJson(this.store, StorageKey.PENDING_BROADCASTS, records);
  }

  list(accountId: string, chainId: string): PendingBroadcastRecord[] {
    return Object.values(this.read())
      .filter(inScope(accountId, chainId))
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  find(accountId: string, chainId: string, hash: string): PendingBroadcastRecord | undefined {
    return this.list(accountId, chainId).find(record => record.hashes.includes(hash));
  }

  add(record: NewPendingBroadcastRecord): PendingBroadcastRecord {
    const records = this.read();
    let id = record.hashes[0];

    for (let suffix = 1; records[id]; suffix += 1) {
      id = `${record.hashes[0]}#${suffix}`;
    }

    const added = { ...record, id };

    this.write({ ...records, [id]: added });
    return added;
  }

  update(record: PendingBroadcastRecord): void {
    const records = this.read();

    if (records[record.id]) {
      this.write({ ...records, [record.id]: record });
    }
  }

  remove(accountId: string, chainId: string, hash: string): boolean {
    const record = this.find(accountId, chainId, hash);

    if (!record) {
      return false;
    }

    const { [record.id]: _removed, ...rest } = this.read();

    this.write(rest);
    return true;
  }

  discardHash(accountId: string, chainId: string, hash: string): void {
    const record = this.find(accountId, chainId, hash);

    if (!record) {
      return;
    }

    if (record.hashes.length === 1) {
      this.remove(accountId, chainId, hash);
      return;
    }

    this.update({ ...record, hashes: record.hashes.filter(item => item !== hash) });
  }

  removeAccount(accountId: string): void {
    this.write(Object.fromEntries(Object.entries(this.read()).filter(([, record]) => record.accountId !== accountId)));
  }
}
