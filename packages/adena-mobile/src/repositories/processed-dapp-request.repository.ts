import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

export const ProcessedDappRequestState = {
  // Approved and still signing or broadcasting.
  IN_PROGRESS: 'in_progress',
  // Broadcast with an unknown outcome; the hash lets the dApp track it.
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export type ProcessedDappRequestState = (typeof ProcessedDappRequestState)[keyof typeof ProcessedDappRequestState];

// What a duplicate of the request is answered with. Only public data: never signed bytes, keys or account details.
export interface ProcessedDappRequest {
  state: ProcessedDappRequestState;
  // A broadcast transaction (pending or done).
  tx?: { hash: string; height?: string; committed?: boolean };
  // The failure the dApp was answered with (failed or pending).
  error?: { code: string; message: string };
}

// Remembers answered dApp requests so reopening the same link cannot prompt again.
export interface ProcessedDappRequestRepository {
  get(key: string): ProcessedDappRequest | undefined;
  has(key: string): boolean;
  set(key: string, record: ProcessedDappRequest): void;
  remove(key: string): void;
}

interface ProcessedEntry extends Partial<ProcessedDappRequest> {
  key: string;
  at: number;
}

export const PROCESSED_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PROCESSED_REQUESTS = 500;

const STATES: string[] = Object.values(ProcessedDappRequestState);

const toRecord = ({ state, tx, error }: ProcessedEntry): ProcessedDappRequest => ({
  // Entries written before states existed only say the request was answered.
  state: state && STATES.includes(state) ? state : ProcessedDappRequestState.DONE,
  ...(typeof tx?.hash === 'string' ? { tx } : {}),
  ...(typeof error?.code === 'string' && typeof error.message === 'string' ? { error } : {}),
});

export class StorageProcessedDappRequestRepository implements ProcessedDappRequestRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly now: () => number = Date.now,
    private readonly ttlMs = PROCESSED_REQUEST_TTL_MS,
    private readonly maxEntries = MAX_PROCESSED_REQUESTS,
  ) {}

  get(key: string): ProcessedDappRequest | undefined {
    const entry = this.live().find(item => item.key === key);

    return entry ? toRecord(entry) : undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, record: ProcessedDappRequest): void {
    const entries = [...this.live().filter(entry => entry.key !== key), { ...record, key, at: this.now() }];

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
  private readonly records = new Map<string, ProcessedDappRequest>();

  get(key: string): ProcessedDappRequest | undefined {
    return this.records.get(key);
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  set(key: string, record: ProcessedDappRequest): void {
    this.records.set(key, record);
  }

  remove(key: string): void {
    this.records.delete(key);
  }
}
