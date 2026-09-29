import {
  buildTokenOrderCacheKey,
  clearTokenOrderCache,
  readTokenOrder,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  writeTokenOrder,
} from './token-order-cache';

/** Stands in for the whole `chrome.storage.local` area. */
const mockArea: Record<string, unknown> = {};

jest.mock('@common/storage', () => {
  const actual = jest.requireActual('@common/storage');

  class MockChromeCacheStorage {
    get = jest.fn(async (key: string) => mockArea[key]);

    set = jest.fn(async (key: string, value: unknown) => {
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
    jest.clearAllMocks();
  });

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
