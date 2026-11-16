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
 * Each scope gets its own key, so a write never merges a map another extension
 * window may be holding, and two windows saving different scopes cannot
 * clobber each other.
 *
 * `chrome.storage` has no compare-and-set, so a write another window already
 * handed to `storage.set` cannot be called back and may land after a reset has
 * swept. Rather than trying to win that race, {@link sweepTokenOrders} decides
 * what is stale by comparing stored keys against the accounts the wallet
 * actually has — a fact that does not depend on timing. Whenever it lands, an
 * entry for an account the wallet no longer holds is removed on the next read.
 */

import { ChromeCacheStorage, TOKEN_ORDER_CACHE_KEY_PREFIX } from '@common/storage';

export { TOKEN_ORDER_CACHE_KEY_PREFIX };

interface TokenOrderEntry {
  /** Row keys (see {@link tokenRowKey}) in the order they last settled. */
  order: string[];
}

let cacheStorage: ChromeCacheStorage | null = null;

/**
 * The writes this context has asked for but may not have landed yet, so a
 * reset can wait for them and remove what they wrote.
 */
let pendingWrites: Promise<void> = Promise.resolve();

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
 *
 * The account id comes first so {@link sweepTokenOrders} can read it back out.
 */
export function buildTokenOrderScope(
  accountId: string,
  networkId: string,
  cosmosNetworkId?: string | null,
): string {
  return `${accountId}:${networkId}:${cosmosNetworkId ?? 'none'}`;
}

/** The storage key one scope occupies. */
function entryKey(scope: string): string {
  return `${TOKEN_ORDER_CACHE_KEY_PREFIX}${scope}`;
}

/** The account a stored key belongs to, or `null` if it is not one of ours. */
function accountIdOf(key: string): string | null {
  if (!key.startsWith(TOKEN_ORDER_CACHE_KEY_PREFIX)) {
    return null;
  }

  const [accountId] = key.slice(TOKEN_ORDER_CACHE_KEY_PREFIX.length).split(':');

  return accountId || null;
}

/**
 * The stored order for one scope, or `null` when there is none.
 *
 * Malformed values read back as `null` rather than throwing: the caller simply
 * orders by balance instead, which is what it would do on a cold cache.
 */
export async function readTokenOrder(scope: string): Promise<string[] | null> {
  const storage = getCacheStorage();
  if (!storage) {
    return null;
  }

  const entry: TokenOrderEntry | null =
    (await storage.get(entryKey(scope)).catch(() => null)) ?? null;

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
 * A failed write only costs the next load its stable order, so it is logged
 * and swallowed, and the chain is kept alive either way.
 */
export async function writeTokenOrder(scope: string, order: string[]): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const write = pendingWrites.then(async () => {
    const entry: TokenOrderEntry = { order };
    await storage.set(entryKey(scope), entry);
  });

  pendingWrites = write.catch(() => undefined);

  return write.catch((error) => {
    console.warn('[token-order] failed to store order', error);
  });
}

/**
 * Remove every order belonging to an account the wallet does not have.
 *
 * This is what makes a stored account id go away for good, and it does not
 * depend on catching anything at the right moment: a key either names one of
 * the wallet's accounts or it does not. An entry stranded by a write that
 * landed after a reset — which `chrome.storage` gives no way to prevent — is
 * simply removed the next time this runs.
 *
 * `liveAccountIds` must be the wallet's real account list. Callers that cannot
 * establish it (locked, still loading) must not call this: an empty list here
 * would mean every stored order is stale.
 */
export async function sweepTokenOrders(liveAccountIds: string[]): Promise<void> {
  const storage = getCacheStorage();
  if (!storage || liveAccountIds.length === 0) {
    return;
  }

  try {
    const live = new Set(liveAccountIds);
    const entries = await storage.getByPrefix(TOKEN_ORDER_CACHE_KEY_PREFIX);

    const stale = Object.keys(entries).filter((key) => {
      const accountId = accountIdOf(key);
      return accountId !== null && !live.has(accountId);
    });

    if (stale.length === 0) {
      return;
    }

    await Promise.all(stale.map((key) => storage.remove(key)));
  } catch (error) {
    console.warn('[token-order] failed to sweep orders', error);
  }
}

/**
 * Drop every stored order; the account ids in the keys go with them.
 *
 * Queued behind this window's own pending writes so those land first and the
 * removal below covers them. A write already inside `storage.set` in another
 * window cannot be called back and may land afterwards; {@link
 * sweepTokenOrders} removes it once the rebuilt wallet reads a list, since the
 * account it names is not one the wallet has.
 */
export async function clearTokenOrderCache(): Promise<void> {
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
