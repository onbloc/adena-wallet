import { ChromeLocalStorage } from './chrome-local-storage';
import { Storage } from './storage';

type objectType = { [key in string]: any };

export class StorageManager<T extends string = string> {
  private storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage ?? new ChromeLocalStorage();
  }

  get = async (valueType: T): Promise<string> => {
    const value = await this.storage.get(valueType);
    return `${value}`;
  };

  set = async (valueType: T, value: string | number): Promise<void> => {
    await this.storage.set(valueType, `${value}`);
  };

  remove = async (valueType: T): Promise<void> => {
    await this.storage.remove(valueType);
  };

  clear = async (): Promise<void> => {
    await this.storage.clear();
  };

  getToNumbers = async (valueType: T): Promise<Array<number>> => {
    return this.storage.get(valueType);
  };

  setByNumbers = async (valueType: T, values: Array<number>): Promise<void> => {
    await this.storage.set(valueType, values);
  };

  getToObject = async <R extends objectType = objectType>(valueType: T): Promise<R> => {
    return this.storage.get(valueType);
  };

  setByObject = async (valueType: T, value: objectType): Promise<void> => {
    await this.storage.set(valueType, value);
  };

  updatePassword = async (password: string): Promise<void> => {
    if (this.storage instanceof ChromeLocalStorage) {
      let storagePassword = password;
      await this.storage.updatePassword(storagePassword);
      storagePassword = '';
    }
  };
}
