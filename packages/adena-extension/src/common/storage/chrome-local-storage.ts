import { Storage } from '.';
import { StorageMigrator, StorageModelLatest } from '@migrates/storage-migrator';

type StorageKeyTypes =
  | 'NETWORKS'
  | 'CURRENT_CHAIN_ID'
  | 'CURRENT_NETWORK_ID'
  | 'SERIALIZED'
  | 'ENCRYPTED_STORED_PASSWORD'
  | 'CURRENT_ACCOUNT_ID'
  | 'ACCOUNT_NAMES'
  | 'ESTABLISH_SITES'
  | 'ADDRESS_BOOK'
  | 'ACCOUNT_TOKEN_METAINFOS';

const StorageKeys: StorageKeyTypes[] = [
  'NETWORKS',
  'CURRENT_CHAIN_ID',
  'CURRENT_NETWORK_ID',
  'SERIALIZED',
  'ENCRYPTED_STORED_PASSWORD',
  'CURRENT_ACCOUNT_ID',
  'ACCOUNT_NAMES',
  'ESTABLISH_SITES',
  'ADDRESS_BOOK',
  'ACCOUNT_TOKEN_METAINFOS',
];

function isStorageKey(key: string): key is StorageKeyTypes {
  return StorageKeys.some((storageKey) => storageKey === key);
}

export class ChromeLocalStorage implements Storage {
  private static StorageKey = 'ADENA_DATA';

  private storage: chrome.storage.LocalStorageArea;

  private migrator: StorageMigrator;

  private current: StorageModelLatest | null = null;

  constructor() {
    this.storage = chrome.storage.local;
    this.migrator = new StorageMigrator(StorageMigrator.migrations(), this.storage);
  }

  public get = async (key: string) => {
    if (!isStorageKey(key)) {
      throw new Error('Unsupported key (' + key + ')');
    }
    const data = await this.getStorageData();
    return data?.data[key];
  };

  public set = async (key: string, value: any) => {
    await this.setStorageData(key, value);
  };

  public remove = async (key: string) => {
    return this.set(key, '');
  };

  public clear = async () => {
    await this.storage.clear();
  };

  public updatePassword = (password: string) => {
    this.migrator.setPassword(password);
  };

  private getStorageData = async (): Promise<StorageModelLatest | null> => {
    if (this.current === null) {
      const current = await this.migrator.getCurrent();
      const data = await this.migrator.migrate(current);
      this.current = data;
      return data;
    }
    return this.current;
  };

  private setStorageData = async (key: string, value: any) => {
    const current = await this.getStorageData();
    if (current === null) {
      return;
    }
    const storageData = {
      ...current,
      data: {
        ...current.data,
        [key]: value,
      },
    };
    await this.storage.set({
      [ChromeLocalStorage.StorageKey]: JSON.stringify(storageData),
    });
  };
}
