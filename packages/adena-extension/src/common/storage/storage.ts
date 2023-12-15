import { ChromeLocalStorage } from './chrome-local-storage';
import { ChromeSessionStorage } from './chrome-session-storage';
import { StorageManager } from './storage-manager';

export interface StorageModel<T = any> {
  version: number;
  data: T;
}

export interface Storage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export class AdenaStorage {
  private static localStorage: StorageManager<any> | null = null;

  private static sessionStorage: StorageManager<any> | null = null;

  public static local = <T extends string = string>(storage?: Storage): StorageManager<T> => {
    if (this.localStorage === null) {
      this.localStorage = new StorageManager<T>(storage ?? new ChromeLocalStorage());
    }
    return this.localStorage as StorageManager<T>;
  };

  public static session = <T extends string = string>(storage?: Storage): StorageManager<T> => {
    if (this.sessionStorage === null) {
      this.sessionStorage = new StorageManager<T>(storage ?? new ChromeSessionStorage());
    }
    return this.sessionStorage as StorageManager<T>;
  };
}
