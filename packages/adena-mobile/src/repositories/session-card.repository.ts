import { CardRecord } from '../domain/session-card';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// Non-secret records of the cards this device issued, keyed by session address.
export interface SessionCardRepository {
  list(accountId: string, chainId: string): CardRecord[];
  listAll(): CardRecord[];
  get(sessionAddress: string): CardRecord | undefined;
  save(record: CardRecord): void;
  remove(sessionAddress: string): void;
}

type Document = Record<string, CardRecord>;

const isRecord = (value: unknown): value is CardRecord => {
  const record = value as Partial<CardRecord> | null;

  return Boolean(record)
    && typeof record?.sessionAddress === 'string'
    && typeof record.accountId === 'string'
    && typeof record.chainId === 'string'
    && typeof record.name === 'string'
    && typeof record.publicKey === 'string'
    && typeof record.createdAt === 'number';
};

export class StorageSessionCardRepository implements SessionCardRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): Document {
    const document = readJson<Document>(this.store, StorageKey.SESSION_CARDS);

    if (!document || typeof document !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(document).filter(([key, value]) => isRecord(value) && value.sessionAddress === key));
  }

  list(accountId: string, chainId: string): CardRecord[] {
    return this.listAll().filter(record => record.accountId === accountId && record.chainId === chainId);
  }

  listAll(): CardRecord[] {
    return Object.values(this.read()).sort((a, b) => b.createdAt - a.createdAt);
  }

  get(sessionAddress: string): CardRecord | undefined {
    return this.read()[sessionAddress];
  }

  save(record: CardRecord): void {
    writeJson(this.store, StorageKey.SESSION_CARDS, { ...this.read(), [record.sessionAddress]: record });
  }

  remove(sessionAddress: string): void {
    const { [sessionAddress]: _removed, ...rest } = this.read();

    writeJson(this.store, StorageKey.SESSION_CARDS, rest);
  }
}
