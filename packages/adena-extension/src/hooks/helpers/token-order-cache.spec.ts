import {
  buildTokenOrderCacheKey,
  clearTokenOrderCache,
  readTokenOrder,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  writeTokenOrder,
} from './token-order-cache';

/** Stands in for the whole `chrome.storage.local` area. */
const mockArea: Record<string, unknown> = {};

/** When set, holds every `storage.set` open until it resolves. */
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

function scopedKeys(): string[] {
  return Object.keys(mockArea).filter((key) => key.startsWith(TOKEN_ORDER_CACHE_KEY_PREFIX));
}

describe('token order cache', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockArea)) {
      delete mockArea[key];
    }
    mockSetGate = null;
    jest.clearAllMocks();
  });

  /** Holds every `storage.set` open until the returned function is called. */
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

  it('reads back the order it stored', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');

    await writeTokenOrder(key, ['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);

    expect(await readTokenOrder(key)).toEqual(['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);
  });

  it('returns null when nothing is stored for the scope', async () => {
    await writeTokenOrder(buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1'), [
      'gnot:gnoland-1',
    ]);

    expect(
      await readTokenOrder(buildTokenOrderCacheKey('account-2', 'gnoland-1', 'atomone-1')),
    ).toBeNull();
  });

  it('gives every scope its own key, so a write cannot clobber another', async () => {
    const first = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    const second = buildTokenOrderCacheKey('account-1', 'test5', null);

    await Promise.all([
      writeTokenOrder(first, ['a:gnoland-1']),
      writeTokenOrder(second, ['b:test5']),
    ]);

    expect(first).not.toBe(second);
    expect(await readTokenOrder(first)).toEqual(['a:gnoland-1']);
    expect(await readTokenOrder(second)).toEqual(['b:test5']);
  });

  it('keeps a writer in another window from dropping this scope', async () => {
    const mine = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    const theirs = buildTokenOrderCacheKey('account-2', 'gnoland-1', 'atomone-1');

    // The interleaving two extension windows would produce. Separate keys mean
    // neither write is a merge of a map the other is also holding.
    await writeTokenOrder(mine, ['a:gnoland-1']);
    await writeTokenOrder(theirs, ['b:gnoland-1']);
    await writeTokenOrder(mine, ['a:gnoland-1', 'c:gnoland-1']);

    expect(await readTokenOrder(mine)).toEqual(['a:gnoland-1', 'c:gnoland-1']);
    expect(await readTokenOrder(theirs)).toEqual(['b:gnoland-1']);
  });

  it('replaces the stored order when the rows move', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');

    await writeTokenOrder(key, ['a:gnoland-1', 'b:gnoland-1']);
    await writeTokenOrder(key, ['b:gnoland-1', 'a:gnoland-1']);

    expect(await readTokenOrder(key)).toEqual(['b:gnoland-1', 'a:gnoland-1']);
  });

  it('evicts the stalest scopes and keeps the one just written', async () => {
    for (let index = 0; index < 40; index += 1) {
      await writeTokenOrder(buildTokenOrderCacheKey(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(scopedKeys().length).toBe(32);
    expect(
      await readTokenOrder(buildTokenOrderCacheKey('account-39', 'gnoland-1', 'atomone-1')),
    ).toEqual(['token-39:gnoland-1']);
  });

  it('leaves other cache keys alone when pruning', async () => {
    mockArea['GRC721_SYNC'] = { untouched: true };

    for (let index = 0; index < 40; index += 1) {
      await writeTokenOrder(buildTokenOrderCacheKey(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
  });

  it('treats a malformed stored value as no order at all', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    mockArea[key] = { order: 'not-an-array', updatedAt: 1 };

    expect(await readTokenOrder(key)).toBeNull();
  });

  it('survives a storage read that throws', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    Object.defineProperty(mockArea, key, {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('storage unavailable');
      },
    });

    expect(await readTokenOrder(key)).toBeNull();
  });

  it('removes an order whose write was still in flight when the reset ran', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    const release = holdWrites();

    // The write has called `storage.set`, which has not landed yet — a bare
    // prefix scan would see nothing and let the set restore the key afterwards.
    const writing = writeTokenOrder(key, ['a:gnoland-1']);
    const clearing = clearTokenOrderCache();
    release();
    await Promise.all([writing, clearing]);

    expect(await readTokenOrder(key)).toBeNull();
    expect(scopedKeys()).toEqual([]);
  });

  it('drops a write still queued behind the reset', async () => {
    const first = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    const second = buildTokenOrderCacheKey('account-2', 'gnoland-1', 'atomone-1');
    const release = holdWrites();

    const writingFirst = writeTokenOrder(first, ['a:gnoland-1']);
    const writingSecond = writeTokenOrder(second, ['b:gnoland-1']);
    const clearing = clearTokenOrderCache();
    release();
    await Promise.all([writingFirst, writingSecond, clearing]);

    // The first landed and was removed; the second never ran at all.
    expect(await readTokenOrder(first)).toBeNull();
    expect(await readTokenOrder(second)).toBeNull();
    expect(scopedKeys()).toEqual([]);
  });

  it('stores again normally once the reset is done', async () => {
    await clearTokenOrderCache();

    const key = buildTokenOrderCacheKey('new-account', 'gnoland-1', 'atomone-1');
    await writeTokenOrder(key, ['a:gnoland-1']);

    expect(await readTokenOrder(key)).toEqual(['a:gnoland-1']);
  });

  it('drops every stored order on clear, and only those', async () => {
    mockArea['GRC721_SYNC'] = { untouched: true };
    await writeTokenOrder(buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1'), [
      'a:gnoland-1',
    ]);
    await writeTokenOrder(buildTokenOrderCacheKey('account-2', 'test5', null), ['b:test5']);

    await clearTokenOrderCache();

    expect(scopedKeys()).toEqual([]);
    expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
  });
});
