import { CommonError } from '@common/errors/common';
import { Storage } from '.';

/** Where each GRC721 indexer walk left off; see `token.grc721-sync.ts`. */
export const GRC721_SYNC_CACHE_KEY = 'GRC721_SYNC';

/**
 * Prefix for the per-scope token order entries; see `token-order-cache.ts`.
 *
 * One key per account/network scope rather than a single map of them all.
 * Extension windows each run their own JavaScript context, so a shared map
 * would have two windows read the same value and each write it back, dropping
 * whichever scope the other had just saved. Separate keys remove the
 * read-modify-write entirely: a write only ever touches its own scope.
 */
export const TOKEN_ORDER_CACHE_KEY_PREFIX = 'TOKEN_ORDER:';

/**
 * Which generation of token order entries is the live one.
 *
 * A wallet reset moves it on, and entry keys carry the generation they were
 * written under, so an order written by another extension window that lands
 * after the reset is simply never read — module-local state cannot invalidate
 * a write from a context it does not share. See `token-order-cache.ts`.
 */
export const TOKEN_ORDER_EPOCH_CACHE_KEY = 'TOKEN_ORDER_EPOCH';

export type CacheValueType = typeof GRC721_SYNC_CACHE_KEY | typeof TOKEN_ORDER_EPOCH_CACHE_KEY;

/**
 * Every key this storage owns. `clear()` walks this list instead of calling
 * `chrome.storage.local.clear()`, which would take the wallet blob with it.
 */
const CACHE_STORAGE_KEYS: CacheValueType[] = [GRC721_SYNC_CACHE_KEY, TOKEN_ORDER_EPOCH_CACHE_KEY];

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

  /**
   * Drops only this storage's own keys.
   *
   * `chrome.storage.local` is shared with the wallet blob `ADENA_DATA`, so the
   * area-wide `clear()` the Storage interface suggests would destroy the
   * encrypted seed — a caller reaching for "clear the caches" must not be able
   * to do that.
   */
  public clear = async (): Promise<void> => {
    const scopedKeys = Object.keys(await this.getByPrefix(TOKEN_ORDER_CACHE_KEY_PREFIX));
    await this.storage.remove([...CACHE_STORAGE_KEYS, ...scopedKeys]);
  };

  /**
   * Every entry this storage owns whose key starts with `prefix`.
   *
   * Needed by the key families that are written one key per scope: their key
   * names are not known ahead of time, so neither pruning them nor clearing
   * them can work from a fixed list. Reads the area in one call and filters,
   * rather than reading each key in turn.
   */
  public getByPrefix = async <T = unknown>(prefix: string): Promise<Record<string, T>> => {
    const values = await this.storage.get(null);

    return Object.fromEntries(
      Object.entries(values ?? {}).filter(([key]) => key.startsWith(prefix)),
    );
  };
}
