import { CommonError } from '@common/errors/common';
import { Storage } from '.';

/**
 * Plain `chrome.storage.local` under its own top-level keys.
 *
 * Wallet state lives in the single migrated `ADENA_DATA` blob, which is what
 * makes adding a field there a schema change. Derived caches are not wallet
 * state: losing one costs a re-fetch and nothing else, so they are kept out of
 * that blob — no version bump, no migration, and a value written by a newer
 * build is simply ignored by an older one.
 *
 * Reads never throw on malformed data; callers see `undefined` and rebuild.
 */
export class ChromeCacheStorage implements Storage {
  private storage: chrome.storage.LocalStorageArea;

  constructor() {
    if (!chrome.storage) {
      throw new CommonError('FAILED_INITIALIZE_CHROME_API');
    }
    this.storage = chrome.storage.local;
  }

  public get = async (key: string): Promise<any> => {
    const values = await this.storage.get(key);
    return values?.[key];
  };

  public set = async (key: string, value: any): Promise<void> => {
    await this.storage.set({ [key]: value });
  };

  public remove = async (key: string): Promise<void> => {
    await this.storage.remove(key);
  };

  public clear = async (): Promise<void> => {
    await this.storage.clear();
  };
}
