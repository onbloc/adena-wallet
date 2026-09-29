/**
 * The order the token rows were last seen in, per account and network.
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
 *
 * Each scope is stored under its own key, so a write never has to merge a map
 * that another extension window may be writing at the same time.
 */

import { ChromeCacheStorage, TOKEN_ORDER_CACHE_KEY_PREFIX } from '@common/storage';

export { TOKEN_ORDER_CACHE_KEY_PREFIX };

interface TokenOrderEntry {
  /** Row keys (see {@link tokenRowKey}) in the order they last settled. */
  order: string[];
  /** When this entry was last written; used to evict the stalest entries. */
  updatedAt: number;
}

/**
 * How many account/network scopes to keep.
 *
 * One entry per account per network would otherwise grow without bound as
 * accounts are added and networks switched, and nothing else prunes it —
 * an account removed from the wallet leaves its entry behind. Dropping the
 * stalest entry costs that scope one reshuffled load when it comes back.
 */
const MAX_CACHE_ENTRIES = 32;

let cacheStorage: ChromeCacheStorage | null = null;

/**
 * The writes that have been asked for but may not have landed yet.
 *
 * Only a reset reads this: it has to wait for an in-flight `storage.set`
 * before it can know which keys are there to remove.
 */
let pendingWrites: Promise<void> = Promise.resolve();

/**
 * Bumped by {@link clearTokenOrderCache}. A write records this when it is
 * asked for and re-checks it when it runs, so a write from before a wallet
 * reset cannot land after it.
 */
let cacheEpoch = 0;

function getCacheStorage(): ChromeCacheStorage | null {
  if (cacheStorage) {
    return cacheStorage;
  }

  try {
    cacheStorage = new ChromeCacheStorage();
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
  return `${TOKEN_ORDER_CACHE_KEY_PREFIX}${accountId}:${networkId}:${cosmosNetworkId ?? 'none'}`;
}

/**
 * The stored order for one scope, or `null` when there is none.
 *
 * Malformed values read back as `null` rather than throwing: the caller simply
 * orders by balance instead, which is what it would do on a cold cache.
 */
export async function readTokenOrder(cacheKey: string): Promise<string[] | null> {
  const entry: TokenOrderEntry | null =
    (await getCacheStorage()
      ?.get(cacheKey)
      .catch(() => null)) ?? null;

  const order = entry?.order;
  if (!Array.isArray(order)) {
    return null;
  }

  return order.filter((key): key is string => typeof key === 'string');
}

/**
 * Record the order the rows are in now.
 *
 * Writes its own key and nothing else, so two windows saving different scopes
 * at the same time cannot overwrite each other.
 *
 * Chained onto {@link pendingWrites} — not to serialise the scopes, which the
 * separate keys already take care of, but so a reset can tell what is still in
 * flight and wait for it. `epoch` is taken when the caller asks for the write
 * and checked again when it runs: a reset moves the epoch on, and a write
 * still queued behind it is dropped rather than restoring an order for a
 * wallet that no longer exists.
 *
 * A failed write only costs the next load its stable order, so it is logged
 * and swallowed, and the chain is kept alive either way.
 */
export async function writeTokenOrder(cacheKey: string, order: string[]): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const epoch = cacheEpoch;

  const write = pendingWrites.then(async () => {
    if (epoch !== cacheEpoch) {
      return;
    }

    const entry: TokenOrderEntry = { order, updatedAt: Date.now() };
    await storage.set(cacheKey, entry);
    await evictStaleEntries(storage, cacheKey);
  });

  pendingWrites = write.catch(() => undefined);

  return write.catch((error) => {
    console.warn('[token-order] failed to store order', error);
  });
}

/**
 * Drop every stored order; the account ids in the keys go with them.
 *
 * Scanning for keys is not enough on its own. A write that has already called
 * `storage.set` has not necessarily landed, so the scan can come up empty and
 * the set can complete afterwards — putting the old account's key back after
 * the wallet that owned it is gone. Moving the epoch on first invalidates
 * every write that has not run yet, and queueing the removal behind the writes
 * already running lets those finish so the scan can see what they wrote.
 */
export async function clearTokenOrderCache(): Promise<void> {
  cacheEpoch += 1;

  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const remove = pendingWrites.then(async () => {
    const entries = await storage.getByPrefix(TOKEN_ORDER_CACHE_KEY_PREFIX);
    await Promise.all(Object.keys(entries).map((key) => storage.remove(key)));
  });

  pendingWrites = remove.then(
    () => undefined,
    () => undefined,
  );

  await remove.catch((error) => {
    console.warn('[token-order] failed to clear orders', error);
  });
}

/**
 * Prune the scopes past {@link MAX_CACHE_ENTRIES}, newest kept.
 *
 * `keptKey` — the entry just written — is held back from the ranking rather
 * than ranked with the others: entries written within the same millisecond
 * carry the same `updatedAt`, and a stable sort would then order them by
 * insertion and evict the newest one of the group, which is the entry the
 * caller is using right now.
 *
 * Removing a key is idempotent, so two windows pruning at once is harmless.
 */
async function evictStaleEntries(storage: ChromeCacheStorage, keptKey: string): Promise<void> {
  const entries = await storage.getByPrefix<TokenOrderEntry>(TOKEN_ORDER_CACHE_KEY_PREFIX);

  const keys = Object.keys(entries);
  if (keys.length <= MAX_CACHE_ENTRIES) {
    return;
  }

  const stale = keys
    .filter((key) => key !== keptKey)
    .sort((a, b) => (entries[b]?.updatedAt ?? 0) - (entries[a]?.updatedAt ?? 0))
    .slice(MAX_CACHE_ENTRIES - 1);

  await Promise.all(stale.map((key) => storage.remove(key)));
}
