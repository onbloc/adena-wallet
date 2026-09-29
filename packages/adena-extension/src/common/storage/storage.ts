import { ChromeCacheStorage } from './chrome-cache-storage';
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

  private static cacheStorage: StorageManager<any> | null = null;

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

  /**
   * Derived caches, persisted but deliberately outside the migrated wallet
   * blob — see {@link ChromeCacheStorage}.
   */
  public static cache = <T extends string = string>(storage?: Storage): StorageManager<T> => {
    if (this.cacheStorage === null) {
      this.cacheStorage = new StorageManager<T>(storage ?? new ChromeCacheStorage());
    }
    return this.cacheStorage as StorageManager<T>;
  };
}
