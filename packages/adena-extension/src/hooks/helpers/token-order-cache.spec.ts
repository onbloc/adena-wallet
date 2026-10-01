import {
  buildTokenOrderScope,
  clearTokenOrderCache,
  readTokenOrder,
  sweepTokenOrders,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  writeTokenOrder,
} from './token-order-cache';

/** Stands in for the whole `chrome.storage.local` area, shared by every context. */
const mockArea: Record<string, unknown> = {};

/** When set, holds entry writes open until it resolves. */
let mockSetGate: Promise<void> | null = null;

jest.mock('@common/storage', () => {
  const actual = jest.requireActual('@common/storage');

  class MockChromeCacheStorage {
    get = jest.fn(async (key: string) => mockArea[key]);

    set = jest.fn(async (key: string, value: unknown) => {
      if (mockSetGate) {
        await mockSetGate;
      }
      mockArea[key] = value;
    });

    remove = jest.fn(async (key: string) => {
      delete mockArea[key];
    });

    getByPrefix = jest.fn(async (prefix: string) =>
      Object.fromEntries(Object.entries(mockArea).filter(([key]) => key.startsWith(prefix))),
    );
  }

  return { ...actual, ChromeCacheStorage: MockChromeCacheStorage };
});

type CacheModule = typeof import('./token-order-cache');

/**
 * A second copy of the module, standing in for another extension window: its
 * own module-local state, the same `mockArea` behind it.
 */
function loadInAnotherWindow(): CacheModule {
  let other: CacheModule = null as unknown as CacheModule;
  jest.isolateModules(() => {
    other = require('./token-order-cache');
  });
  return other;
}

function entryKeys(): string[] {
  return Object.keys(mockArea).filter((key) => key.startsWith(TOKEN_ORDER_CACHE_KEY_PREFIX));
}

/** Holds entry writes open until the returned function is called. */
function holdWrites(): () => void {
  let release: () => void = () => undefined;
  mockSetGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => {
    mockSetGate = null;
    release();
  };
}

const SCOPE_A = buildTokenOrderScope('account-1', 'gnoland-1', 'atomone-1');
const SCOPE_B = buildTokenOrderScope('account-2', 'gnoland-1', 'atomone-1');

describe('token order cache', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockArea)) {
      delete mockArea[key];
    }
    mockSetGate = null;
    jest.clearAllMocks();
  });

  it('reads back the order it stored', async () => {
    await writeTokenOrder(SCOPE_A, ['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);

    expect(await readTokenOrder(SCOPE_A)).toEqual([
      'gnot:gnoland-1',
      'gno.land/r/demo/foo:gnoland-1',
    ]);
  });

  it('returns null when nothing is stored for the scope', async () => {
    await writeTokenOrder(SCOPE_A, ['gnot:gnoland-1']);

    expect(await readTokenOrder(SCOPE_B)).toBeNull();
  });

  it('gives every scope its own key, so a write cannot clobber another', async () => {
    const other = buildTokenOrderScope('account-1', 'test5', null);

    await Promise.all([
      writeTokenOrder(SCOPE_A, ['a:gnoland-1']),
      writeTokenOrder(other, ['b:test5']),
    ]);

    expect(await readTokenOrder(SCOPE_A)).toEqual(['a:gnoland-1']);
    expect(await readTokenOrder(other)).toEqual(['b:test5']);
  });

  it('keeps a writer in another window from dropping this scope', async () => {
    const otherWindow = loadInAnotherWindow();

    await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
    await otherWindow.writeTokenOrder(SCOPE_B, ['b:gnoland-1']);
    await writeTokenOrder(SCOPE_A, ['a:gnoland-1', 'c:gnoland-1']);

    expect(await readTokenOrder(SCOPE_A)).toEqual(['a:gnoland-1', 'c:gnoland-1']);
    expect(await readTokenOrder(SCOPE_B)).toEqual(['b:gnoland-1']);
  });

  it('replaces the stored order when the rows move', async () => {
    await writeTokenOrder(SCOPE_A, ['a:gnoland-1', 'b:gnoland-1']);
    await writeTokenOrder(SCOPE_A, ['b:gnoland-1', 'a:gnoland-1']);

    expect(await readTokenOrder(SCOPE_A)).toEqual(['b:gnoland-1', 'a:gnoland-1']);
  });

  it('treats a malformed stored value as no order at all', async () => {
    await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
    const [key] = entryKeys();
    mockArea[key] = { order: 'not-an-array' };

    expect(await readTokenOrder(SCOPE_A)).toBeNull();
  });

  it('survives a storage read that throws', async () => {
    await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
    const [key] = entryKeys();
    Object.defineProperty(mockArea, key, {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('storage unavailable');
      },
    });

    expect(await readTokenOrder(SCOPE_A)).toBeNull();
  });

  describe('sweeping by account', () => {
    it('removes orders for accounts the wallet no longer has', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await writeTokenOrder(SCOPE_B, ['b:gnoland-1']);

      await sweepTokenOrders(['account-1']);

      expect(await readTokenOrder(SCOPE_A)).toEqual(['a:gnoland-1']);
      expect(await readTokenOrder(SCOPE_B)).toBeNull();
    });

    it('keeps every network and cosmos scope an account still has', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await writeTokenOrder(buildTokenOrderScope('account-1', 'test5', null), ['b:test5']);

      await sweepTokenOrders(['account-1']);

      expect(entryKeys().length).toBe(2);
    });

    it('does nothing when the account list is unknown', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);

      // Locked or still loading: no list is not the same as an empty one.
      await sweepTokenOrders([]);

      expect(await readTokenOrder(SCOPE_A)).toEqual(['a:gnoland-1']);
    });

    it('leaves other cache keys alone', async () => {
      mockArea['GRC721_SYNC'] = { untouched: true };
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);

      await sweepTokenOrders(['account-9']);

      expect(entryKeys()).toEqual([]);
      expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
    });
  });

  describe('wallet reset', () => {
    it('drops every stored order, and only those', async () => {
      mockArea['GRC721_SYNC'] = { untouched: true };
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await writeTokenOrder(SCOPE_B, ['b:gnoland-1']);

      await clearTokenOrderCache();

      expect(entryKeys()).toEqual([]);
      expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
    });

    it('removes an order whose write was still in flight', async () => {
      const release = holdWrites();

      // The write has called `storage.set`, which has not landed yet — a bare
      // prefix scan would see nothing and let the set restore the key after.
      const writing = writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([writing, clearing]);

      expect(await readTokenOrder(SCOPE_A)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('removes what another window stranded after the reset swept', async () => {
      const otherWindow = loadInAnotherWindow();
      const release = holdWrites();

      // Window B is inside `storage.set` and cannot be called back; window A
      // resets. B's write lands afterwards, so the reset cannot have removed it.
      const writingInB = otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([writingInB, clearing]);

      // The rebuilt wallet's accounts do not include the one that key names.
      await sweepTokenOrders(['rebuilt-account']);

      expect(entryKeys()).toEqual([]);
    });

    it('removes a stranded entry however late it lands', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();
      await sweepTokenOrders(['rebuilt-account']);

      // A late set from another window lands only now, after that sweep.
      mockArea[`${TOKEN_ORDER_CACHE_KEY_PREFIX}${SCOPE_A}`] = { order: ['a:gnoland-1'] };

      await sweepTokenOrders(['rebuilt-account']);

      expect(entryKeys()).toEqual([]);
    });

    it('stores again normally once it is done', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();

      const fresh = buildTokenOrderScope('new-account', 'gnoland-1', 'atomone-1');
      await writeTokenOrder(fresh, ['c:gnoland-1']);

      expect(await readTokenOrder(fresh)).toEqual(['c:gnoland-1']);
    });
  });
});
