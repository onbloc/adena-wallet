import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// Remembers answered dApp requests so reopening the same link cannot prompt again.
export interface ProcessedDappRequestRepository {
  has(key: string): boolean;
  add(key: string): void;
  remove(key: string): void;
}

interface ProcessedEntry {
  key: string;
  at: number;
}

export const PROCESSED_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PROCESSED_REQUESTS = 500;

export class StorageProcessedDappRequestRepository implements ProcessedDappRequestRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly now: () => number = Date.now,
    private readonly ttlMs = PROCESSED_REQUEST_TTL_MS,
    private readonly maxEntries = MAX_PROCESSED_REQUESTS,
  ) {}

  has(key: string): boolean {
    return this.live().some(entry => entry.key === key);
  }

  add(key: string): void {
    const entries = [...this.live().filter(entry => entry.key !== key), { key, at: this.now() }];

    writeJson(this.store, StorageKey.PROCESSED_DAPP_REQUESTS, entries.slice(-this.maxEntries));
  }

  remove(key: string): void {
    writeJson(this.store, StorageKey.PROCESSED_DAPP_REQUESTS, this.live().filter(entry => entry.key !== key));
  }

  private live(): ProcessedEntry[] {
    const entries = readJson<ProcessedEntry[]>(this.store, StorageKey.PROCESSED_DAPP_REQUESTS);
    const cutoff = this.now() - this.ttlMs;

    return Array.isArray(entries)
      ? entries.filter(entry => typeof entry?.key === 'string' && typeof entry.at === 'number' && entry.at > cutoff)
      : [];
  }
}

export class MemoryProcessedDappRequestRepository implements ProcessedDappRequestRepository {
  private readonly keys = new Set<string>();

  has(key: string): boolean {
    return this.keys.has(key);
  }

  add(key: string): void {
    this.keys.add(key);
  }

  remove(key: string): void {
    this.keys.delete(key);
  }
}
