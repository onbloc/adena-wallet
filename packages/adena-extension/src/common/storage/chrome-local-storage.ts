import { CommonError } from '@common/errors/common';
import { StorageMigrator, StorageModelLatest } from '@migrates/storage-migrator';
import { Storage } from '.';

// Define the valid types of storage keys
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
  | 'ACCOUNT_TOKEN_METAINFOS'
  | 'QUESTIONNAIRE_EXPIRED_DATE'
  | 'WALLET_CREATION_GUIDE_CONFIRM_DATE'
  | 'ADD_ACCOUNT_GUIDE_CONFIRM_DATE'
  | 'ACCOUNT_GRC721_COLLECTIONS'
  | 'ACCOUNT_GRC721_PINNED_PACKAGES';

// List of all available storage keys
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
  'QUESTIONNAIRE_EXPIRED_DATE',
  'WALLET_CREATION_GUIDE_CONFIRM_DATE',
  'ADD_ACCOUNT_GUIDE_CONFIRM_DATE',
  'ACCOUNT_GRC721_COLLECTIONS',
  'ACCOUNT_GRC721_PINNED_PACKAGES',
];

// Function to validate if a given key is a valid storage key
function isStorageKey(key: string): key is StorageKeyTypes {
  return StorageKeys.some((storageKey) => storageKey === key);
}

// Class to handle Chrome's local storage with migration support
export class ChromeLocalStorage implements Storage {
  // Define the main storage key for the application
  private static StorageKey = 'ADENA_DATA';

  private storage: chrome.storage.LocalStorageArea;

  private migrator: StorageMigrator;

  private current: StorageModelLatest | null = null;

  constructor() {
    if (!chrome.storage) {
      throw new CommonError('FAILED_INITIALIZE_CHROME_API');
    }
    this.storage = chrome.storage.local;
    this.migrator = new StorageMigrator(StorageMigrator.migrations(), this.storage);
  }

  public get = async (key: string): Promise<any> => {
    if (!isStorageKey(key)) {
      throw new Error('Unsupported key (' + key + ')');
    }
    const data = await this.getStorageData();
    return data?.data?.[key];
  };

  public set = async (key: string, value: any): Promise<void> => {
    await this.setStorageData(key, value);
  };

  public remove = async (key: string): Promise<void> => {
    await this.set(key, '');
    await this.storage.remove(key);
  };

  public clear = async (): Promise<void> => {
    await this.storage.set({ [ChromeLocalStorage.StorageKey]: '{}' });
    await this.storage.clear();
  };

  public updatePassword = async (password: string): Promise<StorageModelLatest | null> => {
    const current = await this.migrator.getCurrent();
    this.current = await this.migrator.migrate(current, password);
    return this.current;
  };

  private getStorageData = async (): Promise<any | null> => {
    if (this.current === null) {
      return this.migrator.getCurrent();
    }
    return this.current;
  };

  private setStorageData = async (key: string, value: any): Promise<void> => {
    this.current = await this.getStorageData();
    if (!this.current) {
      return;
    }

    const storageData = {
      ...this.current,
      data: {
        ...this.current.data,
        [key]: value,
      },
    };

    this.current = storageData;
    await this.storage.set({
      [ChromeLocalStorage.StorageKey]: JSON.stringify(storageData),
    });
  };
}
