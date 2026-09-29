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
 * Two properties of the storage layout do the coordination work, because every
 * extension window runs its own JavaScript context and shares only
 * `chrome.storage.local`:
 *
 * - One key per scope, so a write never merges a map another window is also
 *   holding, and two windows saving different scopes cannot clobber each other.
 * - The live generation is recorded in storage and stamped into every key, so
 *   a write from before a wallet reset — including one already in flight in
 *   another window — is never read afterwards, and is swept up by the next
 *   write or reset. Module-local state cannot invalidate a write from a
 *   context it does not share; the stored generation can.
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

/** The generation a wallet that has never been reset writes under. */
const INITIAL_EPOCH = 0;

let cacheStorage: ChromeCacheStorage | null = null;

/**
 * The writes this context has asked for but may not have landed yet.
 *
 * A reset waits on it so its sweep can see what those writes wrote. It says
 * nothing about other windows — the stored generation covers those.
 */
let pendingWrites: Promise<void> = Promise.resolve();

/**
 * Counts resets this context has been told about, by any window.
 *
 * A read is only trustworthy if this has not moved while it was in flight:
 * `chrome.storage.local.get` is asynchronous, so a read that starts before a
 * reset can finish after it and come back holding the new generation. The
 * generation alone cannot tell those apart — a counter taken either side of
 * the read can.
 */
let resetSignal = 0;

/** Whether the `storage.onChanged` subscription is in place. */
let watchingForReset = false;

/**
 * The generation handed back for a read that a reset overtook.
 *
 * Never equal to a real generation, so a write carrying it is always dropped.
 */
const STALE_EPOCH = -1;

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

  watchForReset();

  return cacheStorage;
}

/**
 * Listen for the generation changing, wherever it is changed from.
 *
 * This is the only way one extension window learns that another has reset the
 * wallet; everything else here is state that context cannot see. Without the
 * event API the generation comparison still stands on its own, just without
 * the mid-read protection.
 */
function watchForReset(): void {
  if (watchingForReset) {
    return;
  }
  watchingForReset = true;

  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !(TOKEN_ORDER_EPOCH_CACHE_KEY in changes)) {
        return;
      }
      resetSignal += 1;
    });
  } catch {
    watchingForReset = false;
  }
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

/** Prefix every entry of one generation shares. */
function epochPrefix(epoch: number): string {
  return `${TOKEN_ORDER_CACHE_KEY_PREFIX}${epoch}:`;
}

/**
 * The live generation. Absent or malformed reads as 0, which is also what a
 * wallet that has never been reset stores nothing for.
 */
async function readEpoch(storage: ChromeCacheStorage): Promise<number> {
  const stored = await storage.get(TOKEN_ORDER_EPOCH_CACHE_KEY).catch(() => null);
  const epoch = Number(stored);

  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : INITIAL_EPOCH;
}

/**
 * A stored order, with the generation it was read under.
 *
 * The generation goes back to {@link writeTokenOrder} when the rows are saved,
 * which is what pins a write to the wallet the rows came from.
 */
export interface StoredTokenOrder {
  /** Row keys in the order they last settled, or `null` when none is stored. */
  order: string[] | null;
  /** Hand this back to {@link writeTokenOrder} for the rows read under it. */
  epoch: number;
}

/**
 * The stored order for one scope, and the generation it belongs to.
 *
 * Only ever looks at the live generation, so an entry left behind by a write
 * that landed after a reset is invisible here however it got there. Superseded
 * entries are also removed on the way past — hiding them is not enough, since
 * their keys name accounts the wallet no longer has.
 *
 * Malformed values read back as `null` rather than throwing: the caller simply
 * orders by balance instead, which is what it would do on a cold cache.
 */
export async function readTokenOrder(scope: string): Promise<StoredTokenOrder> {
  const storage = getCacheStorage();
  if (!storage) {
    return { order: null, epoch: INITIAL_EPOCH };
  }

  const signalAtStart = resetSignal;

  const epoch = await readEpoch(storage);
  await sweepSupersededEntries(storage, epoch);

  const entry: TokenOrderEntry | null =
    (await storage.get(entryKey(epoch, scope)).catch(() => null)) ?? null;

  if (resetSignal !== signalAtStart) {
    // A reset landed while this read was in flight, so `epoch` may already be
    // the generation that replaced the wallet these rows belong to. Hand back
    // a generation no write can match instead of one that looks current.
    return { order: null, epoch: STALE_EPOCH };
  }

  const order = entry?.order;

  return {
    epoch,
    order: Array.isArray(order)
      ? order.filter((key): key is string => typeof key === 'string')
      : null,
  };
}

/**
 * Record the order the rows are in now, as of the generation they came from.
 *
 * Writes its own key and nothing else, so two windows saving different scopes
 * at the same time cannot overwrite each other.
 *
 * `epoch` is the one {@link readTokenOrder} handed back when these rows were
 * loaded — deliberately not read here. Reading it at save time leaves a window
 * where a reset can land while the read is in flight: the read then returns
 * the *new* generation, every check downstream agrees with it, and rows from
 * the deleted wallet are written into the generation that replaced it. Taking
 * the generation from when the rows were read closes that window, because that
 * read provably happened before the reset.
 *
 * A failed write only costs the next load its stable order, so it is logged
 * and swallowed, and the chain is kept alive either way.
 */
export async function writeTokenOrder(
  scope: string,
  order: string[],
  epoch: number,
): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const signalAtRequest = resetSignal;

  const write = pendingWrites.then(async () => {
    const liveEpoch = await readEpoch(storage);
    if (resetSignal !== signalAtRequest || liveEpoch !== epoch) {
      // A reset happened after these rows were read: the wallet they describe
      // is gone, so there is nothing worth saving.
      return;
    }

    const key = entryKey(epoch, scope);
    const entry: TokenOrderEntry = { order, updatedAt: Date.now() };

    await storage.set(key, entry);
    await pruneEntries(storage, epoch, key);
  });

  pendingWrites = write.catch(() => undefined);

  return write.catch((error) => {
    console.warn('[token-order] failed to store order', error);
  });
}

/**
 * Drop every stored order; the account ids in the keys go with them.
 *
 * Moving the generation on is what makes this hold against other windows: a
 * write already inside `storage.set` over there cannot be called back, but it
 * carries the old generation, so nothing reads it and the next write or reset
 * sweeps it away. Queueing behind this window's own pending writes lets those
 * land first so the sweep below can see them, and `useClear` closes the other
 * windows before calling this, which stops new writes from starting there.
 */
export async function clearTokenOrderCache(): Promise<void> {
  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  const remove = pendingWrites.then(async () => {
    const epoch = await readEpoch(storage);
    await storage.set(TOKEN_ORDER_EPOCH_CACHE_KEY, epoch + 1);

    await removeAllEntries(storage);

    // A write another window had already handed to `storage.set` cannot be
    // called back, and may land after the sweep above. Yield once so those
    // land, then take the area again. Anything later still is caught by the
    // sweep on the next read, which is what makes the keys go rather than
    // merely stop being read.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await removeAllEntries(storage);
  });

  pendingWrites = remove.then(
    () => undefined,
    () => undefined,
  );

  await remove.catch((error) => {
    console.warn('[token-order] failed to clear orders', error);
  });
}

/** Remove every token order entry, whatever generation it belongs to. */
async function removeAllEntries(storage: ChromeCacheStorage): Promise<void> {
  const entries = await storage.getByPrefix(TOKEN_ORDER_CACHE_KEY_PREFIX);
  await Promise.all(Object.keys(entries).map((key) => storage.remove(key)));
}

/**
 * Remove entries left behind by generations that are no longer live.
 *
 * These are the writes a reset could not call back — already inside
 * `storage.set` in another window when the generation moved on. Nothing reads
 * them, but their keys still name accounts the wallet no longer has, so they
 * are deleted rather than left to sit.
 *
 * Runs on every read rather than once per generation: a stranded write can
 * land at any point, including after a one-time sweep has been and gone, and
 * a read is the only thing guaranteed to follow it. Reads happen per scope and
 * are cached for the session, so this is a handful of scans; a failure just
 * leaves the keys to the next one.
 */
async function sweepSupersededEntries(storage: ChromeCacheStorage, epoch: number): Promise<void> {
  try {
    const entries = await storage.getByPrefix(TOKEN_ORDER_CACHE_KEY_PREFIX);
    const livePrefix = epochPrefix(epoch);
    const superseded = Object.keys(entries).filter((key) => !key.startsWith(livePrefix));

    if (superseded.length === 0) {
      return;
    }

    await Promise.all(superseded.map((key) => storage.remove(key)));
  } catch (error) {
    console.warn('[token-order] failed to sweep superseded orders', error);
  }
}

/**
 * Drop superseded generations, then the scopes past {@link MAX_CACHE_ENTRIES}.
 *
 * Entries from an older generation are the ones a reset could not call back —
 * a write another window had already started. Nothing reads them, and this is
 * what eventually removes them.
 *
 * `keptKey` — the entry just written — is held back from the ranking rather
 * than ranked with the others: entries written within the same millisecond
 * carry the same `updatedAt`, and a stable sort would then order them by
 * insertion and evict the newest one of the group, which is the entry the
 * caller is using right now.
 *
 * Removing a key is idempotent, so two windows pruning at once is harmless.
 */
async function pruneEntries(
  storage: ChromeCacheStorage,
  epoch: number,
  keptKey: string,
): Promise<void> {
  const entries = await storage.getByPrefix<TokenOrderEntry>(TOKEN_ORDER_CACHE_KEY_PREFIX);
  const livePrefix = epochPrefix(epoch);

  const superseded = Object.keys(entries).filter((key) => !key.startsWith(livePrefix));

  const live = Object.keys(entries).filter((key) => key.startsWith(livePrefix));
  const overflowing =
    live.length > MAX_CACHE_ENTRIES
      ? live
          .filter((key) => key !== keptKey)
          .sort((a, b) => (entries[b]?.updatedAt ?? 0) - (entries[a]?.updatedAt ?? 0))
          .slice(MAX_CACHE_ENTRIES - 1)
      : [];

  await Promise.all([...superseded, ...overflowing].map((key) => storage.remove(key)));
}
