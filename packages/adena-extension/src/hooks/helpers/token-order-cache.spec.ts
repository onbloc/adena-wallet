import {
  buildTokenOrderScope,
  clearTokenOrderCache,
  readTokenOrder,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  TOKEN_ORDER_EPOCH_CACHE_KEY,
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
      // Entry writes only: gating the epoch write too would deadlock a reset
      // against the very write it is waiting to observe.
      if (mockSetGate && key.startsWith('TOKEN_ORDER:')) {
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

  it('evicts the stalest scopes and keeps the one just written', async () => {
    for (let index = 0; index < 40; index += 1) {
      await writeTokenOrder(buildTokenOrderScope(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(entryKeys().length).toBe(32);
    expect(
      await readTokenOrder(buildTokenOrderScope('account-39', 'gnoland-1', 'atomone-1')),
    ).toEqual(['token-39:gnoland-1']);
  });

  it('leaves other cache keys alone when pruning', async () => {
    mockArea['GRC721_SYNC'] = { untouched: true };

    for (let index = 0; index < 40; index += 1) {
      await writeTokenOrder(buildTokenOrderScope(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
  });

  it('treats a malformed stored value as no order at all', async () => {
    await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
    const [key] = entryKeys();
    mockArea[key] = { order: 'not-an-array', updatedAt: 1 };

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

    it('drops a write still queued behind it', async () => {
      const release = holdWrites();

      const first = writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      const second = writeTokenOrder(SCOPE_B, ['b:gnoland-1']);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([first, second, clearing]);

      // The first landed and was removed; the second never ran at all.
      expect(await readTokenOrder(SCOPE_A)).toBeNull();
      expect(await readTokenOrder(SCOPE_B)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('never reads an order another window landed after the reset', async () => {
      const otherWindow = loadInAnotherWindow();
      const release = holdWrites();

      // Window B is inside `storage.set` and cannot be called back; window A
      // resets. B's module-local queue and epoch are invisible to A.
      const writingInB = otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();
      release();
      await writingInB;

      expect(await readTokenOrder(SCOPE_A)).toBeNull();
      expect(await otherWindow.readTokenOrder(SCOPE_A)).toBeNull();
    });

    it('sweeps away what another window landed, on the next write', async () => {
      const otherWindow = loadInAnotherWindow();
      const release = holdWrites();

      const writingInB = otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();
      release();
      await writingInB;

      // The stranded entry belongs to a superseded generation; the next write
      // through either window is what finally removes it.
      await writeTokenOrder(SCOPE_B, ['b:gnoland-1']);

      expect(entryKeys().length).toBe(1);
      expect(await readTokenOrder(SCOPE_B)).toEqual(['b:gnoland-1']);
    });

    it('stores again normally once it is done', async () => {
      await writeTokenOrder(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();

      const fresh = buildTokenOrderScope('new-account', 'gnoland-1', 'atomone-1');
      await writeTokenOrder(fresh, ['c:gnoland-1']);

      expect(await readTokenOrder(fresh)).toEqual(['c:gnoland-1']);
      expect(mockArea[TOKEN_ORDER_EPOCH_CACHE_KEY]).toBe(1);
    });
  });
});
