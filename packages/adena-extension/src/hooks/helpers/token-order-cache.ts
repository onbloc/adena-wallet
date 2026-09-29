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
 * Two things shape the storage layout, because every extension window runs its
 * own JavaScript context and shares only `chrome.storage.local`:
 *
 * - One key per scope, so a write never merges a map another window is also
 *   holding, and two windows saving different scopes cannot clobber each other.
 * - Keys carry a generation, bumped by a wallet reset. `chrome.storage` has no
 *   compare-and-set, so a write another window already handed to `storage.set`
 *   cannot be called back and may land after the reset has swept. The
 *   generation makes such an entry identifiable, and reads delete what they
 *   find from generations that are no longer live. The rebuilt wallet cannot
 *   read one either way — account ids are `uuidv4`, so a reset always yields a
 *   different scope — but it still names an account the wallet no longer has,
 *   which is why it is deleted rather than merely ignored.
 */

import {
  ChromeCacheStorage,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  TOKEN_ORDER_EPOCH_CACHE_KEY,
} from '@common/storage';

export { TOKEN_ORDER_CACHE_KEY_PREFIX, TOKEN_ORDER_EPOCH_CACHE_KEY };

interface TokenOrderEntry {
  /** Row keys (see {@link tokenRowKey}) in the order they last settled. */
  order: string[];
  /** When this entry was last written. */
  updatedAt: number;
}

/**
 * How long an untouched entry is kept.
 *
 * A saved order is rewritten whenever its rows move, so this only reaches
 * scopes nothing has opened in a long time — and anything a race stranded,
 * which would otherwise sit in storage naming a deleted account forever.
 * Losing an entry costs that scope a single reshuffled load.
 */
const ENTRY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The generation a wallet that has never been reset writes under. */
const INITIAL_EPOCH = 0;

let cacheStorage: ChromeCacheStorage | null = null;

/**
 * The writes this context has asked for but may not have landed yet, so a
 * reset can wait for them and sweep what they wrote.
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
 */
export function buildTokenOrderScope(
  accountId: string,
  networkId: string,
  cosmosNetworkId?: string | null,
): string {
  return `${accountId}:${networkId}:${cosmosNetworkId ?? 'none'}`;
}

/** The storage key one scope occupies in a given generation. */
function entryKey(epoch: number, scope: string): string {
  return `${TOKEN_ORDER_CACHE_KEY_PREFIX}${epoch}:${scope}`;
}

/** The live generation; absent or malformed counts as the first one. */
async function readEpoch(storage: ChromeCacheStorage): Promise<number> {
  const stored = await storage.get(TOKEN_ORDER_EPOCH_CACHE_KEY).catch(() => null);
  const epoch = Number(stored);

  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : INITIAL_EPOCH;
}

/**
 * The stored order for one scope, or `null` when there is none.
 *
 * Sweeps on the way past, which is what eventually removes an entry a race
 * stranded: a read is the one thing guaranteed to happen after such a write
 * lands.
 *
 * Malformed values read back as `null` rather than throwing: the caller simply
 * orders by balance instead, which is what it would do on a cold cache.
 */
export async function readTokenOrder(scope: string): Promise<string[] | null> {
  const storage = getCacheStorage();
  if (!storage) {
    return null;
  }

  const epoch = await readEpoch(storage);
  await sweepEntries(storage, epoch);

  const entry: TokenOrderEntry | null =
    (await storage.get(entryKey(epoch, scope)).catch(() => null)) ?? null;

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
    const epoch = await readEpoch(storage);
    const entry: TokenOrderEntry = { order, updatedAt: Date.now() };

    await storage.set(entryKey(epoch, scope), entry);
  });

  pendingWrites = write.catch(() => undefined);

  return write.catch((error) => {
    console.warn('[token-order] failed to store order', error);
  });
}

/**
 * Drop every stored order; the account ids in the keys go with them.
 *
 * Queued behind this window's own pending writes so those land first and the
 * sweep below can see them. A write already inside `storage.set` in another
 * window cannot be called back, so the generation is bumped first: whatever
 * lands afterwards is identifiable, and the next read deletes it.
 */
export async function clearTokenOrderCache(): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const remove = pendingWrites.then(async () => {
    const epoch = await readEpoch(storage);
    await storage.set(TOKEN_ORDER_EPOCH_CACHE_KEY, epoch + 1);

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
 * Delete entries from superseded generations, and ones nothing has touched in
 * {@link ENTRY_TTL_MS}.
 *
 * The first covers what a reset could not: a write another window had already
 * handed to `storage.set`. The second is the backstop for everything else —
 * including an entry written into the live generation because the write's own
 * read of the generation raced the reset — so no account id outlives the
 * wallet indefinitely.
 */
async function sweepEntries(storage: ChromeCacheStorage, epoch: number): Promise<void> {
  try {
    const entries = await storage.getByPrefix<TokenOrderEntry>(TOKEN_ORDER_CACHE_KEY_PREFIX);
    const livePrefix = `${TOKEN_ORDER_CACHE_KEY_PREFIX}${epoch}:`;
    const expiredBefore = Date.now() - ENTRY_TTL_MS;

    const stale = Object.keys(entries).filter((key) => {
      if (!key.startsWith(livePrefix)) {
        return true;
      }
      const updatedAt = entries[key]?.updatedAt;
      return typeof updatedAt !== 'number' || updatedAt < expiredBefore;
    });

    if (stale.length === 0) {
      return;
    }

    await Promise.all(stale.map((key) => storage.remove(key)));
  } catch (error) {
    console.warn('[token-order] failed to sweep stale orders', error);
  }
}
