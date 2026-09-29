import {
  buildTokenOrderCacheKey,
  clearTokenOrderCache,
  readTokenOrder,
  TOKEN_ORDER_CACHE_KEY,
  writeTokenOrder,
} from './token-order-cache';

const mockCacheValues: Record<string, unknown> = {};

const mockCacheStorage = {
  getToObject: jest.fn(async (key: string) => mockCacheValues[key]),
  setByObject: jest.fn(async (key: string, value: unknown) => {
    mockCacheValues[key] = value;
  }),
  remove: jest.fn(async (key: string) => {
    delete mockCacheValues[key];
  }),
};

jest.mock('@common/storage', () => {
  const actual = jest.requireActual('@common/storage');
  return {
    ...actual,
    AdenaStorage: {
      ...actual.AdenaStorage,
      // Resolved lazily, when the module under test first reaches for storage.
      cache: (): unknown => mockCacheStorage,
    },
  };
});

function storedEntries(): Record<string, { order: string[]; updatedAt: number }> {
  return (mockCacheValues[TOKEN_ORDER_CACHE_KEY] ?? {}) as Record<
    string,
    { order: string[]; updatedAt: number }
  >;
}

describe('token order cache', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockCacheValues)) {
      delete mockCacheValues[key];
    }
    jest.clearAllMocks();
  });

  it('reads back the order it stored', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');

    await writeTokenOrder(key, ['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);

    expect(await readTokenOrder(key)).toEqual(['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);
  });

  it('returns null when nothing is stored for the key', async () => {
    await writeTokenOrder(buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1'), [
      'gnot:gnoland-1',
    ]);

    expect(
      await readTokenOrder(buildTokenOrderCacheKey('account-2', 'gnoland-1', 'atomone-1')),
    ).toBeNull();
  });

  it('keeps one scope from overwriting another', async () => {
    const first = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    const second = buildTokenOrderCacheKey('account-1', 'test5', null);

    // Fired together: an unserialised read-modify-write loses one of them.
    await Promise.all([
      writeTokenOrder(first, ['a:gnoland-1']),
      writeTokenOrder(second, ['b:test5']),
    ]);

    expect(await readTokenOrder(first)).toEqual(['a:gnoland-1']);
    expect(await readTokenOrder(second)).toEqual(['b:test5']);
  });

  it('replaces the stored order when the rows move', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');

    await writeTokenOrder(key, ['a:gnoland-1', 'b:gnoland-1']);
    await writeTokenOrder(key, ['b:gnoland-1', 'a:gnoland-1']);

    expect(await readTokenOrder(key)).toEqual(['b:gnoland-1', 'a:gnoland-1']);
  });

  it('evicts the stalest entries and keeps the one just written', async () => {
    for (let index = 0; index < 40; index += 1) {
      await writeTokenOrder(buildTokenOrderCacheKey(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    const entries = storedEntries();

    expect(Object.keys(entries).length).toBe(32);
    expect(
      await readTokenOrder(buildTokenOrderCacheKey('account-39', 'gnoland-1', 'atomone-1')),
    ).toEqual(['token-39:gnoland-1']);
  });

  it('treats a malformed stored value as no order at all', async () => {
    const key = buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1');
    mockCacheValues[TOKEN_ORDER_CACHE_KEY] = { [key]: { order: 'not-an-array', updatedAt: 1 } };

    expect(await readTokenOrder(key)).toBeNull();
  });

  it('survives a storage read that throws', async () => {
    mockCacheStorage.getToObject.mockRejectedValueOnce(new Error('storage unavailable'));

    expect(
      await readTokenOrder(buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1')),
    ).toBeNull();
  });

  it('drops every stored order on clear', async () => {
    await writeTokenOrder(buildTokenOrderCacheKey('account-1', 'gnoland-1', 'atomone-1'), [
      'a:gnoland-1',
    ]);

    await clearTokenOrderCache();

    expect(mockCacheValues[TOKEN_ORDER_CACHE_KEY]).toBeUndefined();
  });
});
