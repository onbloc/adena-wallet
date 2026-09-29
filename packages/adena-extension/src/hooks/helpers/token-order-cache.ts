/**
 * The order the token rows were last seen in, per account and chain.
 *
 * The wallet-main list is ordered by balance (see `sort-token-balances.ts`),
 * and balances arrive row by row: on a cold start every row begins with an
 * empty amount, sorts to the bottom, and jumps into place the moment its query
 * resolves. The list visibly reshuffles for as long as that takes.
 *
 * Remembering where the rows settled last time gives the list something stable
 * to render until the balances are all in. This is derived state — losing it
 * costs one reshuffled load and nothing else — so it lives outside the
 * migrated wallet blob in `ChromeCacheStorage`: no version bump, no migration.
 */

import { AdenaStorage, CacheValueType, TOKEN_ORDER_CACHE_KEY } from '@common/storage';
import { StorageManager } from '@common/storage/storage-manager';

export { TOKEN_ORDER_CACHE_KEY };

interface TokenOrderEntry {
  /** Row keys (see {@link tokenRowKey}) in the order they last settled. */
  order: string[];
  /** When this entry was last written; used to evict the stalest entries. */
  updatedAt: number;
}

type TokenOrderCache = Record<string, TokenOrderEntry>;

/**
 * How many account/chain entries to keep.
 *
 * One entry per account per chain would otherwise grow without bound as
 * accounts are added and networks switched, and nothing else prunes it —
 * an account removed from the wallet leaves its entry behind. Dropping the
 * stalest entry costs that account one reshuffled load when it comes back.
 */
const MAX_CACHE_ENTRIES = 32;

let cacheStorage: StorageManager<CacheValueType> | null = null;

/** Serialises writes so concurrent callers do not overwrite each other. */
let writeQueue: Promise<void> = Promise.resolve();

function getCacheStorage(): StorageManager<CacheValueType> | null {
  if (cacheStorage) {
    return cacheStorage;
  }

  try {
    cacheStorage = AdenaStorage.cache<CacheValueType>();
  } catch {
    // No chrome.storage available: the list falls back to balance order.
    return null;
  }

  return cacheStorage;
}

/**
 * Identifies one row across every list the wallet renders.
 *
 * `tokenId` alone is not unique — the same symbol exists on several chains
 * (ATONE on mainnet and testnet), and those are separate rows.
 */
export function tokenRowKey(tokenId: string, networkId: string): string {
  return `${tokenId}:${networkId}`;
}

/**
 * Scopes an entry to the exact inputs that decide which rows the list holds.
 *
 * All three matter. Accounts hold different tokens; the gno rows are filtered
 * by `networkId` (see `currentTokenMetainfos`), so switching networks swaps
 * the list wholesale; and the cosmos rows follow the active AtomOne network,
 * which can change while the gno network stays put. Leaving that last one out
 * would have the cosmos rows arrive as rows the stored order does not know,
 * sink to the bottom, and reshuffle on the way back up — the very thing the
 * order is here to prevent.
 */
export function buildTokenOrderCacheKey(
  accountId: string,
  networkId: string,
  cosmosNetworkId?: string | null,
): string {
  return `${accountId}:${networkId}:${cosmosNetworkId ?? 'none'}`;
}

/** The whole store, or an empty map when nothing has been stored yet. */
async function readTokenOrderStore(): Promise<TokenOrderCache> {
  const store = await getCacheStorage()
    ?.getToObject<TokenOrderCache>(TOKEN_ORDER_CACHE_KEY)
    .catch(() => null);

  return store || {};
}

/**
 * The stored order for one account/chain, or `null` when there is none.
 *
 * Malformed values read back as `null` rather than throwing: the caller simply
 * orders by balance instead, which is what it would do on a cold cache.
 */
export async function readTokenOrder(cacheKey: string): Promise<string[] | null> {
  const store = await readTokenOrderStore();
  const order = store[cacheKey]?.order;

  if (!Array.isArray(order)) {
    return null;
  }

  return order.filter((key): key is string => typeof key === 'string');
}

/**
 * Record the order the rows are in now.
 *
 * Writes are chained rather than fired in parallel: several screens mount
 * `useTokenBalance` at once, and an unserialised read-modify-write would have
 * each of them save over the entries the others just added.
 *
 * A failed write only costs the next load its stable order, so it is swallowed
 * and the queue is kept alive.
 */
export async function writeTokenOrder(cacheKey: string, order: string[]): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const write = writeQueue.then(async () => {
    const store = await readTokenOrderStore();
    const updated: TokenOrderCache = {
      ...store,
      [cacheKey]: { order, updatedAt: Date.now() },
    };

    await storage.setByObject(TOKEN_ORDER_CACHE_KEY, evictStaleEntries(updated, cacheKey));
  });

  writeQueue = write.catch(() => undefined);

  return write.catch((error) => {
    console.warn('[token-order] failed to store order', error);
  });
}

/** Drop every stored order; the account ids in the keys go with them. */
export async function clearTokenOrderCache(): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const remove = writeQueue.then(() => storage.remove(TOKEN_ORDER_CACHE_KEY));

  writeQueue = remove.then(
    () => undefined,
    () => undefined,
  );

  await remove.catch((error) => {
    console.warn('[token-order] failed to clear orders', error);
  });
}

/**
 * Keeps the newest {@link MAX_CACHE_ENTRIES} entries, dropping the rest.
 *
 * `keptKey` — the entry just written — is held back from the ranking rather
 * than ranked with the others: entries written within the same millisecond
 * carry the same `updatedAt`, and a stable sort would then order them by
 * insertion and evict the newest one of the group, which is the entry the
 * caller is using right now.
 */
function evictStaleEntries(store: TokenOrderCache, keptKey: string): TokenOrderCache {
  const keys = Object.keys(store);
  if (keys.length <= MAX_CACHE_ENTRIES) {
    return store;
  }

  const survivors = keys
    .filter((key) => key !== keptKey)
    .sort((a, b) => (store[b]?.updatedAt ?? 0) - (store[a]?.updatedAt ?? 0))
    .slice(0, MAX_CACHE_ENTRIES - 1);

  return [keptKey, ...survivors].reduce<TokenOrderCache>((acc, key) => {
    acc[key] = store[key];
    return acc;
  }, {});
}
