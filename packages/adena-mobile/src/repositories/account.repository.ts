import { Account } from '../domain/account';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

interface AccountDocument {
  accounts: Account[];
  currentAccountId: string | null;
}

const EMPTY: AccountDocument = { accounts: [], currentAccountId: null };

export interface AccountRepository {
  getAccounts(): Account[];
  saveAccounts(accounts: Account[]): void;
  getCurrentAccountId(): string | null;
  setCurrentAccountId(accountId: string | null): void;
  clear(): void;
}

export class StorageAccountRepository implements AccountRepository {
  constructor(private readonly store: KeyValueStore) {}

  private read(): AccountDocument {
    return readJson<AccountDocument>(this.store, StorageKey.ACCOUNTS) ?? EMPTY;
  }

  private write(document: AccountDocument): void {
    writeJson(this.store, StorageKey.ACCOUNTS, document);
  }

  getAccounts(): Account[] {
    return this.read().accounts;
  }

  saveAccounts(accounts: Account[]): void {
    this.write({ ...this.read(), accounts });
  }

  getCurrentAccountId(): string | null {
    return this.read().currentAccountId;
  }

  setCurrentAccountId(accountId: string | null): void {
    this.write({ ...this.read(), currentAccountId: accountId });
  }

  clear(): void {
    this.store.remove(StorageKey.ACCOUNTS);
  }
}
