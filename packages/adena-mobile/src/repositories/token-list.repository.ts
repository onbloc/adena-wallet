import { ManagedToken } from '../domain/token';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

type TokenListDocument = Record<string, ManagedToken[]>;

const listKey = (accountId: string, networkId: string): string => `${accountId}:${networkId}`;

// The user's token list per account and network (visibility, custom additions).
export interface TokenListRepository {
  get(accountId: string, networkId: string): ManagedToken[] | undefined;
  save(accountId: string, networkId: string, tokens: ManagedToken[]): void;
  removeAccount(accountId: string): void;
  clear(): void;
}

export class StorageTokenListRepository implements TokenListRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): TokenListDocument {
    return readJson<TokenListDocument>(this.store, StorageKey.TOKEN_LISTS) ?? {};
  }

  get(accountId: string, networkId: string): ManagedToken[] | undefined {
    return this.read()[listKey(accountId, networkId)];
  }

  save(accountId: string, networkId: string, tokens: ManagedToken[]): void {
    writeJson(this.store, StorageKey.TOKEN_LISTS, { ...this.read(), [listKey(accountId, networkId)]: tokens });
  }

  removeAccount(accountId: string): void {
    const next = Object.fromEntries(Object.entries(this.read()).filter(([key]) => !key.startsWith(`${accountId}:`)));

    writeJson(this.store, StorageKey.TOKEN_LISTS, next);
  }

  clear(): void {
    this.store.remove(StorageKey.TOKEN_LISTS);
  }
}
