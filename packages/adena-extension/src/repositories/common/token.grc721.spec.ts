import { GnoProvider } from '@common/provider/gno/gno-provider';
import { StorageManager } from '@common/storage/storage-manager';
import { GRC721_TOKEN_PACKAGES } from '@common/utils/grc721-config';
import { NetworkMetainfo } from '@types';
import { AxiosInstance } from 'axios';
import { GRC721_RECONCILE_INTERVAL_MS, GRC721_SYNC_CACHE_KEY } from './token.grc721-sync';
import { TokenRepository } from './token';

const GRC721_PACKAGE = GRC721_TOKEN_PACKAGES[0].path;
const COLLECTION_ID = 'gno.land/r/gnoswap/gnft.GNFT.0000000';
const PACKAGE_PATH = 'gno.land/r/gnoswap/gnft';
const ADDRESS = 'g1fnakf9vrd6uqn8qdmp88yam4p0ngy572answ9f';
const OTHER_ADDRESS = 'g1y3uyaa63sjxvah2cx3c2usavwvx97kl8m2v7ye';
const OTHER_COLLECTION_ID = 'gno.land/r/demo/nft.ITEM.0000000';

const NETWORK = {
  id: 'gnoland-1',
  chainId: 'gnoland-1',
  networkId: 'gnoland-1',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.example',
  indexerUrl: 'https://indexer.example',
  apiUrl: 'https://api.example',
} as NetworkMetainfo;

type Attr = { key: string; value: string };

function event(type: string, attrs: Attr[], pkgPath = GRC721_PACKAGE): unknown {
  return { type, pkg_path: pkgPath, attrs };
}

function received(to: string, tokenId: string, token = COLLECTION_ID): unknown {
  return event('Transfer', [
    { key: 'token', value: token },
    { key: 'from', value: '' },
    { key: 'to', value: to },
    { key: 'tokenId', value: tokenId },
  ]);
}

function newToken(token: string, name: string, symbol: string): unknown {
  return event('NewToken', [
    { key: 'token', value: token },
    { key: 'name', value: name },
    { key: 'symbol', value: symbol },
  ]);
}

interface ChainState {
  funcs?: { name: string; results: { name: string; type: string }[] }[];
  /** Raw `evaluateFunction` replies, keyed by function name. */
  evaluations?: Record<string, { value: string; rest: string }>;
}

/** Enough of StorageManager for the GRC721 sync cursors, kept in memory. */
function makeSyncCache(): { storage: StorageManager; values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  const storage = {
    getToObject: jest.fn(async (key: string) => values[key]),
    setByObject: jest.fn(async (key: string, value: unknown) => {
      values[key] = value;
      values.__writes = ((values.__writes as number) ?? 0) + 1;
    }),
    remove: jest.fn(async (key: string) => {
      delete values[key];
    }),
  } as unknown as StorageManager;

  return { storage, values };
}

/**
 * One indexer reply per call, so a test can hand the first walk its history and
 * the next walk only what arrived after it. The last reply repeats once the
 * list runs out.
 */
function makeRepository(
  transactionEvents: unknown[][],
  chain: ChainState = {},
  options: {
    laterPages?: unknown[][][];
    latestBlockHeight?: number;
    blockHeight?: number;
    /** null drops the cursor cache, as when the chrome API is unavailable. */
    syncCache?: null;
    /** API replies by request URL; a URL without one fails like a 404. */
    api?: (url: string) => unknown;
    tokenUriCache?: StorageManager;
  } = {},
): {
  repository: TokenRepository;
  evaluateFunction: jest.Mock;
  post: jest.Mock;
  syncCacheValues: Record<string, unknown>;
  get: jest.Mock;
} {
  const pages = [transactionEvents, ...(options.laterPages ?? [])];
  const latestBlockHeight = options.latestBlockHeight ?? 500;
  const blockHeight = options.blockHeight ?? 100;
  let call = 0;

  const post = jest.fn(async () => {
    const page = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return {
      data: {
        data: {
          latestBlockHeight,
          getTransactions: page.map((events) => ({
            block_height: blockHeight,
            response: { events },
          })),
        },
      },
    };
  });

  const get = jest.fn(async (url: string) => {
    const payload = options.api?.(url);
    if (payload === undefined) {
      throw new Error('Request failed with status code 404');
    }
    return { data: { data: payload } };
  });

  const axiosInstance = { post, get } as unknown as AxiosInstance;
  const { storage: syncCache, values: syncCacheValues } = makeSyncCache();

  const evaluateFunction = jest.fn(
    async (
      _packagePath: string,
      functionName: string,
    ): Promise<{ value: string; rest: string } | null> => chain.evaluations?.[functionName] ?? null,
  );

  const gnoProvider = {
    evaluateFunction,
    getRealmDocument: jest.fn(async () => ({ funcs: chain.funcs ?? [] })),
  } as unknown as GnoProvider;

  const repository = new TokenRepository(
    {} as unknown as StorageManager,
    axiosInstance,
    NETWORK,
    gnoProvider,
    options.syncCache === null ? undefined : syncCache,
    options.tokenUriCache,
  );

  return {
    repository,
    evaluateFunction,
    post,
    syncCacheValues,
    get,
  };
}

/** The GraphQL document sent on the nth indexer call. */
const queryOf = (post: jest.Mock, call: number): string => post.mock.calls[call][1].query;

/**
 * The resume height in a query's `where` clause, or null when it walks from
 * genesis. `block_height` also names a selected field, so match the filter.
 */
const resumeHeightOf = (post: jest.Mock, call: number): number | null => {
  const matched = queryOf(post, call).match(/block_height: \{ gt: (\d+) \}/);
  return matched ? Number(matched[1]) : null;
};

describe('indexer sync cursor', () => {
  // Reconciliation is driven by the clock, so a test that moves it has to put
  // it back for the ones after it.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const announced = (): unknown[] => [newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')];
  const collectionIdsOf = async (repository: TokenRepository): Promise<string[]> =>
    (await repository.fetchGRC721Collections()).map((collection) => collection.collectionId || '');

  it('walks from genesis first, then resumes above the height it reached', async () => {
    const { repository, post, syncCacheValues } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
      },
    );

    await repository.fetchGRC721Collections();
    expect(resumeHeightOf(post, 0)).toBeNull();

    await repository.fetchGRC721Collections();
    expect(resumeHeightOf(post, 1)).toBe(120);

    // Cursors live in the cache store, not in the migrated wallet blob.
    const cursor = (syncCacheValues[GRC721_SYNC_CACHE_KEY] as Record<string, never>)[
      NETWORK.chainId
    ];
    expect(cursor).toBeTruthy();
  });

  it('keeps the collections of an earlier walk when the next one adds nothing', async () => {
    const { repository } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
        laterPages: [[]],
      },
    );

    await expect(collectionIdsOf(repository)).resolves.toEqual([COLLECTION_ID]);
    // Second walk returns no transactions; the stored candidate must survive.
    await expect(collectionIdsOf(repository)).resolves.toEqual([COLLECTION_ID]);
  });

  it('appends a newly announced collection to the stored ones', async () => {
    const { repository } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
        laterPages: [[[newToken(OTHER_COLLECTION_ID, 'Item', 'ITEM')]]],
      },
    );

    await repository.fetchGRC721Collections();

    await expect(collectionIdsOf(repository)).resolves.toEqual([
      COLLECTION_ID,
      OTHER_COLLECTION_ID,
    ]);
  });

  // A reset testnet or a re-index restarts the tip from zero. The signal is the
  // tip dropping, not the tip falling below the matched-event height: the
  // newest matching block sits far below the tip, so the latter only holds for
  // the brief window before the new chain grows past it.
  it('re-walks from genesis when the indexer tip has gone backwards', async () => {
    const { repository, post } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 400,
        latestBlockHeight: 4_000_000,
      },
    );

    await repository.fetchGRC721Collections();

    // Reset chain: the tip is far below what was seen, but still well above the
    // stored event height of 400 — the old check would have missed this.
    post.mockImplementation(async () => ({
      data: {
        data: {
          latestBlockHeight: 900,
          getTransactions: [{ block_height: 5, response: { events: announced() } }],
        },
      },
    }));

    const collectionIds = await collectionIdsOf(repository);

    expect(resumeHeightOf(post, 1)).toBe(400);
    expect(resumeHeightOf(post, 2)).toBeNull();
    // The re-walk replaces the stored list, so the id is not read as announced twice.
    expect(collectionIds).toEqual([COLLECTION_ID]);
  });

  it('keeps resuming while the indexer tip only grows', async () => {
    const { repository, post } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 400,
        latestBlockHeight: 4_000_000,
      },
    );

    await repository.fetchGRC721Collections();

    post.mockImplementation(async () => ({
      data: { data: { latestBlockHeight: 4_000_100, getTransactions: [] } },
    }));

    await repository.fetchGRC721Collections();

    expect(resumeHeightOf(post, 1)).toBe(400);
    // Still resuming — no genesis re-walk was issued.
    expect(post).toHaveBeenCalledTimes(2);
  });

  // The wallet's own network record id is local bookkeeping and survives a user
  // re-pointing that network at a different chain; the chain id does not.
  it('keys cursors by chain id', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
      },
    );

    await repository.fetchGRC721Collections();

    expect(Object.keys(syncCacheValues[GRC721_SYNC_CACHE_KEY] as object)).toEqual([
      NETWORK.chainId,
    ]);
  });

  // The cache is a convenience, not a dependency: without it (no chrome API,
  // a storage failure) every walk simply starts from genesis as it used to.
  it('still walks when no cursor cache is available', async () => {
    const { repository, post } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
        syncCache: null,
      },
    );

    await expect(collectionIdsOf(repository)).resolves.toEqual([COLLECTION_ID]);
    await expect(collectionIdsOf(repository)).resolves.toEqual([COLLECTION_ID]);

    expect(resumeHeightOf(post, 0)).toBeNull();
    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  it('drops every cursor when the cache is cleared', async () => {
    const { repository, post, syncCacheValues } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
      },
    );

    await repository.fetchGRC721Collections();
    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeTruthy();

    await repository.deleteGRC721SyncCache();

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
    await repository.fetchGRC721Collections();
    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  // A page whose transactions carry no usable height cannot advance the cursor.
  // Merging it anyway would replay the same range next walk and append the same
  // candidates again — and for the catalog a repeated collection id *is* the
  // ambiguity signal, so every collection would be dropped and the NFT list
  // would go permanently empty.
  it('does not fold in a page that carries no block height', async () => {
    const { repository, syncCacheValues, post } = makeRepository([announced()]);

    post.mockImplementation(async () => ({
      data: {
        data: {
          latestBlockHeight: 500,
          getTransactions: [{ response: { events: announced() } }],
        },
      },
    }));

    await repository.fetchGRC721Collections();

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
  });

  it('leaves the stored cursor untouched when a walk matches nothing new', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
        laterPages: [[]],
      },
    );

    await repository.fetchGRC721Collections();
    const afterFirst = JSON.stringify(syncCacheValues[GRC721_SYNC_CACHE_KEY]);
    const writesAfterFirst = (syncCacheValues.__writes as number) ?? 0;

    await repository.fetchGRC721Collections();

    expect(JSON.stringify(syncCacheValues[GRC721_SYNC_CACHE_KEY])).toBe(afterFirst);
    expect((syncCacheValues.__writes as number) ?? 0).toBe(writesAfterFirst);
  });

  // An indexer is only append-only from its own side: a re-index can repair a
  // transaction at an older height while the tip keeps advancing, so an event
  // can appear *below* the cursor. Nothing else recovers it — the tip never
  // drops — so the cursor is re-read in full once it is old enough.
  it('picks up an announcement backfilled below the cursor once the cursor is due', async () => {
    const { repository, post } = makeRepository([]);

    // OTHER at height 120 is there from the start; COLLECTION at 100 arrives later.
    const announcements = [{ height: 120, collectionId: OTHER_COLLECTION_ID }];

    // The indexer answers each query from its current state, oldest first.
    post.mockImplementation(async (_url: string, body: { query: string }) => {
      const matched = body.query.match(/block_height: \{ gt: (\d+) \}/);
      const fromBlockHeight = matched ? Number(matched[1]) : 0;

      return {
        data: {
          data: {
            latestBlockHeight: 4_000_000,
            getTransactions: announcements
              .filter((announcement) => announcement.height > fromBlockHeight)
              .sort((left, right) => left.height - right.height)
              .map((announcement) => ({
                block_height: announcement.height,
                response: { events: [newToken(announcement.collectionId, 'Name', 'SYM')] },
              })),
          },
        },
      };
    });

    await expect(collectionIdsOf(repository)).resolves.toEqual([OTHER_COLLECTION_ID]);

    // The indexer repairs the transaction it had missed, below the cursor.
    announcements.push({ height: 100, collectionId: COLLECTION_ID });

    await expect(collectionIdsOf(repository)).resolves.toEqual([OTHER_COLLECTION_ID]);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + GRC721_RECONCILE_INTERVAL_MS);

    await expect(collectionIdsOf(repository)).resolves.toEqual([
      COLLECTION_ID,
      OTHER_COLLECTION_ID,
    ]);
  });

  // A walk started before a wallet reset carries no abort signal, so it comes
  // back afterwards and would write its cursor into a fresh document.
  it('does not restore the cursors when a wallet reset lands mid-walk', async () => {
    const { repository, post, syncCacheValues } = makeRepository([]);

    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    post.mockImplementation(async () => {
      await held;
      return {
        data: {
          data: {
            latestBlockHeight: 500,
            getTransactions: [{ block_height: 120, response: { events: announced() } }],
          },
        },
      };
    });

    const walk = repository.fetchGRC721Collections();

    await repository.deleteGRC721SyncCache();

    release();
    // The read itself still answers; only its cursor write is thrown away.
    await expect(walk).resolves.toHaveLength(1);

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
  });

  // The invalidation is scoped to the walks the reset interrupted: a read that
  // starts afterwards has to keep its cursor as usual.
  it('stores the cursor again for a walk started after the reset', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [announced()],
      {},
      {
        blockHeight: 120,
      },
    );

    await repository.deleteGRC721SyncCache();
    await repository.fetchGRC721Collections();

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeTruthy();
  });
});

describe('fetchGRC721TokenUriBy', () => {
  // `TokenURI(tid) string` — the realm declares a single result, so there is no
  // error tuple to weigh.
  it('accepts a uri from a realm that returns a bare string', async () => {
    const { repository } = makeRepository([], {
      evaluations: { TokenURI: { value: 'ipfs://cid/1.png', rest: '' } },
    });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).resolves.toBe(
      'ipfs://cid/1.png',
    );
  });

  // `TokenURI(tid) (string, error)` with a nil error, which prints as
  // `(undefined)`.
  it('accepts a uri returned alongside a nil error', async () => {
    const { repository } = makeRepository([], {
      evaluations: {
        TokenURI: { value: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', rest: '(undefined)' },
      },
    });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).resolves.toBe(
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    );
  });

  // Go puts the error last, so a value before other results is still readable.
  it('accepts a uri from a realm with an extra result and a nil error', async () => {
    const { repository } = makeRepository([], {
      evaluations: { TokenURI: { value: 'ipfs://cid/1.png', rest: '(3 int64)\n(undefined)' } },
    });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).resolves.toBe(
      'ipfs://cid/1.png',
    );
  });

  it('rejects a uri returned alongside a non-nil error', async () => {
    const { repository } = makeRepository([], {
      evaluations: {
        TokenURI: {
          value: 'ipfs://stale',
          rest: '(&(struct{("token has no uri" string)} errors.errorString) *errors.errorString)',
        },
      },
    });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).rejects.toThrow(
      'not found token uri',
    );
  });

  it('rejects an empty uri', async () => {
    const { repository } = makeRepository([], {
      evaluations: { TokenURI: { value: '', rest: '(undefined)' } },
    });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).rejects.toThrow(
      'not found token uri',
    );
  });

  it('passes the token id through as the sole argument', async () => {
    const { repository, evaluateFunction } = makeRepository([], {
      evaluations: { TokenURI: { value: 'ipfs://cid/7.png', rest: '(undefined)' } },
    });

    await repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '7');

    expect(evaluateFunction).toHaveBeenCalledWith(PACKAGE_PATH, 'TokenURI', ['7']);
  });
});

describe('fetchGRC721Collections', () => {
  it('lists the collections announced by NewToken', async () => {
    const { repository } = makeRepository([[newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')]]);

    await expect(repository.fetchGRC721Collections()).resolves.toEqual([
      expect.objectContaining({
        collectionId: COLLECTION_ID,
        packagePath: PACKAGE_PATH,
        name: 'GNOSWAP NFT',
        symbol: 'GNFT',
        type: 'grc721',
        networkId: 'gnoland-1',
      }),
    ]);
  });

  it('drops a collection id announced twice, whose later events are ambiguous', async () => {
    const { repository } = makeRepository([
      [newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')],
      [newToken(COLLECTION_ID, 'Impostor', 'GNFT')],
      [newToken('gno.land/r/demo/nft.ITEM.0000000', 'Item', 'ITEM')],
    ]);

    const collections = await repository.fetchGRC721Collections();

    expect(collections.map((collection) => collection.collectionId)).toEqual([
      'gno.land/r/demo/nft.ITEM.0000000',
    ]);
  });

  it('ignores events from other packages and other event types', async () => {
    const { repository } = makeRepository([
      [
        newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT'),
        event(
          'NewToken',
          [
            { key: 'token', value: 'gno.land/r/demo/coin.COIN.0000000' },
            { key: 'name', value: 'Coin' },
            { key: 'symbol', value: 'COIN' },
          ],
          'gno.land/p/nt/grc20/v0',
        ),
        received(ADDRESS, '1'),
      ],
    ]);

    const collections = await repository.fetchGRC721Collections();

    expect(collections).toHaveLength(1);
    expect(collections[0].collectionId).toBe(COLLECTION_ID);
  });

  it('returns nothing without an indexer', async () => {
    const { repository } = makeRepository([[newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')]]);
    repository.setNetworkMetainfo({ ...NETWORK, indexerUrl: '' } as NetworkMetainfo);

    await expect(repository.fetchGRC721Collections()).resolves.toEqual([]);
  });
});

describe('GRC721 API', () => {
  const COLLECTIONS_URL = `https://api.example/v1/accounts/${ADDRESS}/grc721-tokens`;
  const ITEMS_URL = `${COLLECTIONS_URL}/${encodeURIComponent(COLLECTION_ID)}/items`;

  const item = (nftId: string, isOwned: boolean): unknown => ({
    tokenId: COLLECTION_ID,
    packagePath: PACKAGE_PATH,
    nftId,
    name: 'GNOSWAP NFT',
    symbol: 'GNFT',
    ownerAddress: isOwned ? ADDRESS : OTHER_ADDRESS,
    operatorAddress: isOwned ? '' : ADDRESS,
    isOwned,
  });

  const collection = {
    tokenId: COLLECTION_ID,
    packagePath: PACKAGE_PATH,
    name: 'GNOSWAP NFT',
    symbol: 'GNFT',
    tokenCount: 2,
    ownedCount: 1,
  };

  it('lists the collections the API reports, with the newest token as thumbnail', async () => {
    const { repository, post } = makeRepository(
      [[]],
      { funcs: [{ name: 'TokenURI', results: [{ name: '', type: 'string' }] }] },
      {
        api: (url) => {
          if (url === COLLECTIONS_URL) {
            return { items: [collection] };
          }
          if (url.startsWith(ITEMS_URL)) {
            return { items: [item('351', false)], page: { hasNext: true, cursor: 'MzUx' } };
          }
          return undefined;
        },
      },
    );

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([
      expect.objectContaining({
        collectionId: COLLECTION_ID,
        packagePath: PACKAGE_PATH,
        name: 'GNOSWAP NFT',
        tokenId: '351',
        isTokenUri: true,
      }),
    ]);
    expect(post).not.toHaveBeenCalled();
  });

  it('pages through the items', async () => {
    const { repository, get, post } = makeRepository(
      [[]],
      {},
      {
        api: (url) => {
          if (!url.startsWith(ITEMS_URL)) {
            return undefined;
          }
          return url.includes('cursor=MzUx')
            ? { items: [item('350', true)], page: { hasNext: false } }
            : { items: [item('351', false)], page: { hasNext: true, cursor: 'MzUx' } };
        },
      },
    );

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS, COLLECTION_ID);

    expect(tokens.map((token) => token.tokenId)).toEqual(['351', '350']);
    expect(get).toHaveBeenCalledTimes(2);
    expect(post).not.toHaveBeenCalled();
  });

  it('counts every token the account owns or operates', async () => {
    const { repository, get } = makeRepository(
      [[]],
      {},
      {
        api: (url) => (url === COLLECTIONS_URL ? { items: [collection] } : undefined),
      },
    );

    // Cards ask at once; they share one request.
    await expect(
      Promise.all([
        repository.fetchGRC721BalanceBy(PACKAGE_PATH, ADDRESS),
        repository.fetchGRC721BalanceBy('gno.land/r/demo/nft', ADDRESS),
      ]),
    ).resolves.toEqual([2, 0]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when the API fails, without walking the indexer', async () => {
    const { repository, post } = makeRepository([[received(ADDRESS, '7')]]);

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([]);
    await expect(
      repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS, COLLECTION_ID),
    ).resolves.toEqual([]);
    await expect(repository.fetchGRC721BalanceBy(PACKAGE_PATH, ADDRESS)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });

  it('shows nothing without an API URL', async () => {
    const { repository, get } = makeRepository(
      [[]],
      {},
      {
        api: () => ({ items: [collection] }),
      },
    );
    repository.setNetworkMetainfo({ ...NETWORK, apiUrl: '' } as NetworkMetainfo);

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([]);
    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('fetchGRC721TokenUriBy', () => {
  function makeSessionCache(): { storage: StorageManager; values: Record<string, string> } {
    const values: Record<string, string> = {};
    const storage = {
      get: jest.fn(async (key: string) => values[key] ?? ''),
      set: jest.fn(async (key: string, value: string) => {
        values[key] = `${value}`;
      }),
    } as unknown as StorageManager;
    return { storage, values };
  }

  const uri = (value: string): { value: string; rest: string } => ({
    value,
    rest: '',
  });

  it('reads TokenURI once per token id and serves it from the session afterwards', async () => {
    const { storage, values } = makeSessionCache();
    const { repository, evaluateFunction } = makeRepository(
      [[]],
      { evaluations: { TokenURI: uri('data:image/svg+xml;base64,AAA') } },
      { tokenUriCache: storage },
    );

    await Promise.all([
      repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1'),
      repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '2'),
    ]);
    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).resolves.toBe(
      'data:image/svg+xml;base64,AAA',
    );

    expect(evaluateFunction).toHaveBeenCalledTimes(2);
    expect(JSON.parse(values[`GRC721_TOKEN_URI:gnoland-1:${PACKAGE_PATH}`])).toEqual({
      '1': 'data:image/svg+xml;base64,AAA',
      '2': 'data:image/svg+xml;base64,AAA',
    });
  });

  it('does not cache a missing uri', async () => {
    const { storage, values } = makeSessionCache();
    const { repository } = makeRepository([[]], {}, { tokenUriCache: storage });

    await expect(repository.fetchGRC721TokenUriBy(PACKAGE_PATH, '1')).rejects.toThrow();
    expect(values).toEqual({});
  });
});
