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
  owners?: Record<string, string>;
  balances?: Record<string, number>;
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
  } = {},
): {
  repository: TokenRepository;
  evaluateIIFE: jest.Mock;
  evaluateFunction: jest.Mock;
  getValueByEvaluateExpression: jest.Mock;
  post: jest.Mock;
  syncCacheValues: Record<string, unknown>;
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

  const axiosInstance = { post } as unknown as AxiosInstance;
  const { storage: syncCache, values: syncCacheValues } = makeSyncCache();

  const owners = chain.owners ?? {};

  // Replay the positional 1/0 flag string the unrolled OwnerOf qeval returns.
  const evaluateIIFE = jest.fn(
    async (_packagePath: string, params: { statements?: string[] }): Promise<string> => {
      const flags = (params.statements || [])
        .map((statement) => statement.match(/OwnerOf\("([^"]*)"\)/)?.[1])
        .filter((tokenId): tokenId is string => tokenId !== undefined)
        .map((tokenId) => (owners[tokenId] === ADDRESS ? '1' : '0'))
        .join('');
      return `("${flags}" string)`;
    },
  );

  const getValueByEvaluateExpression = jest.fn(
    async (packagePath: string, functionName: string): Promise<string | null> => {
      if (functionName === 'BalanceOf') {
        return `${chain.balances?.[packagePath] ?? 0}`;
      }
      return null;
    },
  );

  const evaluateFunction = jest.fn(
    async (
      _packagePath: string,
      functionName: string,
    ): Promise<{ value: string; rest: string } | null> => chain.evaluations?.[functionName] ?? null,
  );

  const gnoProvider = {
    evaluateIIFE,
    evaluateFunction,
    getValueByEvaluateExpression,
    getRealmDocument: jest.fn(async () => ({ funcs: chain.funcs ?? [] })),
  } as unknown as GnoProvider;

  const repository = new TokenRepository(
    {} as unknown as StorageManager,
    axiosInstance,
    NETWORK,
    gnoProvider,
    options.syncCache === null ? undefined : syncCache,
  );

  return {
    repository,
    evaluateIIFE,
    evaluateFunction,
    getValueByEvaluateExpression,
    post,
    syncCacheValues,
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

  it('walks from genesis first, then resumes above the height it reached', async () => {
    const { repository, post, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120, laterPages: [[[received(ADDRESS, '8')]]] },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(resumeHeightOf(post, 0)).toBeNull();

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(resumeHeightOf(post, 1)).toBe(120);

    // Cursors live in the cache store, not in the migrated wallet blob.
    const cursor = (syncCacheValues[GRC721_SYNC_CACHE_KEY] as Record<string, never>)[
      NETWORK.chainId
    ];
    expect(cursor).toBeTruthy();
  });

  it('keeps the tokens of an earlier walk when the next one adds nothing', async () => {
    const { repository } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120, laterPages: [[]] },
    );

    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toHaveLength(1);
    // Second walk returns no transactions; the stored candidate must survive.
    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toHaveLength(1);
  });

  it('puts a newly received token ahead of the stored ones', async () => {
    const { repository } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS, '8': ADDRESS } },
      { blockHeight: 120, laterPages: [[[received(ADDRESS, '8')]]] },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(tokens.map((token) => token.tokenId)).toEqual(['8', '7']);
  });

  // Two accounts on one network must not resume from each other's height.
  it('keeps a separate cursor per address', async () => {
    const { repository, post } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    await repository.fetchGRC721TokensBy(PACKAGE_PATH, OTHER_ADDRESS);

    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  it('keeps a separate cursor per realm', async () => {
    const { repository, post } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    await repository.fetchGRC721TokensBy('gno.land/r/demo/nft', ADDRESS);

    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  // A reset testnet or a re-index restarts the tip from zero. The signal is the
  // tip dropping, not the tip falling below the matched-event height: an
  // account's newest matching block sits far below the tip, so the latter only
  // holds for the brief window before the new chain grows past it.
  it('re-walks from genesis when the indexer tip has gone backwards', async () => {
    const { repository, post } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 400, latestBlockHeight: 4_000_000 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    // Reset chain: the tip is far below what was seen, but still well above the
    // stored event height of 400 — the old check would have missed this.
    post.mockImplementation(async () => ({
      data: {
        data: {
          latestBlockHeight: 900,
          getTransactions: [{ block_height: 5, response: { events: [received(ADDRESS, '7')] } }],
        },
      },
    }));

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(resumeHeightOf(post, 1)).toBe(400);
    expect(resumeHeightOf(post, 2)).toBeNull();
    expect(tokens.map((token) => token.tokenId)).toEqual(['7']);
  });

  it('keeps resuming while the indexer tip only grows', async () => {
    const { repository, post } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 400, latestBlockHeight: 4_000_000 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    post.mockImplementation(async () => ({
      data: { data: { latestBlockHeight: 4_000_100, getTransactions: [] } },
    }));

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(resumeHeightOf(post, 1)).toBe(400);
    // Still resuming — no genesis re-walk was issued.
    expect(post).toHaveBeenCalledTimes(2);
  });

  // The wallet's own network record id is local bookkeeping and survives a user
  // re-pointing that network at a different chain; the chain id does not.
  it('keys cursors by chain id', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(Object.keys(syncCacheValues[GRC721_SYNC_CACHE_KEY] as object)).toEqual([
      NETWORK.chainId,
    ]);
  });

  // The cache is a convenience, not a dependency: without it (no chrome API,
  // a storage failure) every walk simply starts from genesis as it used to.
  it('still walks when no cursor cache is available', async () => {
    const { repository, post } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120, syncCache: null },
    );

    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toHaveLength(1);
    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toHaveLength(1);

    expect(resumeHeightOf(post, 0)).toBeNull();
    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  // The cursors are keyed by account address, so a wallet reset must take them
  // with it rather than leave the addresses the user held behind in storage.
  it('drops every cursor when the cache is cleared', async () => {
    const { repository, post, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeTruthy();

    await repository.deleteGRC721SyncCache();

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(resumeHeightOf(post, 1)).toBeNull();
  });

  // Refreshing an account fans out over its collections with Promise.all. An
  // unserialised read-modify-write on the shared cache document had every walk
  // read the same snapshot and every write but the last discard its siblings.
  it('keeps every cursor when walks run concurrently', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await Promise.all([
      repository.fetchGRC721TokensBy('gno.land/r/demo/a', ADDRESS),
      repository.fetchGRC721TokensBy('gno.land/r/demo/b', ADDRESS),
      repository.fetchGRC721TokensBy('gno.land/r/demo/c', ADDRESS),
    ]);

    const cache = syncCacheValues[GRC721_SYNC_CACHE_KEY] as {
      [networkId: string]: { tokens?: { [address: string]: Record<string, unknown> } };
    };

    expect(Object.keys(cache[NETWORK.chainId].tokens?.[ADDRESS] || {}).sort()).toEqual([
      'gno.land/r/demo/a',
      'gno.land/r/demo/b',
      'gno.land/r/demo/c',
    ]);
  });

  // A page whose transactions carry no usable height cannot advance the cursor.
  // Merging it anyway would replay the same range next walk and append the same
  // candidates again — and for the catalog a repeated collection id *is* the
  // ambiguity signal, so every collection would be dropped and the NFT list
  // would go permanently empty.
  it('does not fold in a page that carries no block height', async () => {
    const { repository, syncCacheValues, post } = makeRepository([[received(ADDRESS, '7')]], {
      owners: { '7': ADDRESS },
    });

    post.mockImplementation(async () => ({
      data: {
        data: {
          latestBlockHeight: 500,
          getTransactions: [{ response: { events: [received(ADDRESS, '7')] } }],
        },
      },
    }));

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
  });

  it('leaves the stored cursor untouched when a walk matches nothing new', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120, laterPages: [[]] },
    );

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    const afterFirst = JSON.stringify(syncCacheValues[GRC721_SYNC_CACHE_KEY]);
    const writesAfterFirst = (syncCacheValues.__writes as number) ?? 0;

    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(JSON.stringify(syncCacheValues[GRC721_SYNC_CACHE_KEY])).toBe(afterFirst);
    expect((syncCacheValues.__writes as number) ?? 0).toBe(writesAfterFirst);
  });

  // An indexer is only append-only from its own side: a re-index can repair a
  // transaction at an older height while the tip keeps advancing, so a receipt
  // can appear *below* the cursor. Nothing else recovers it — the tip never
  // drops, and `OwnerOf` only re-checks candidates a walk already found — so the
  // cursor is re-read in full once it is old enough.
  it('picks up a receipt backfilled below the cursor once the cursor is due', async () => {
    const { repository, post } = makeRepository([], { owners: { '7': ADDRESS, '8': ADDRESS } });

    // `#8` at height 120 is there from the start; `#7` at 100 arrives later.
    const receipts = [{ height: 120, tokenId: '8' }];

    // The indexer answers each query from its current state, newest first.
    post.mockImplementation(async (_url: string, body: { query: string }) => {
      const matched = body.query.match(/block_height: \{ gt: (\d+) \}/);
      const fromBlockHeight = matched ? Number(matched[1]) : 0;

      return {
        data: {
          data: {
            latestBlockHeight: 4_000_000,
            getTransactions: receipts
              .filter((receipt) => receipt.height > fromBlockHeight)
              .sort((left, right) => right.height - left.height)
              .map((receipt) => ({
                block_height: receipt.height,
                response: { events: [received(ADDRESS, receipt.tokenId)] },
              })),
          },
        },
      };
    });

    const walked = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(walked.map((token) => token.tokenId)).toEqual(['8']);

    // The indexer repairs the transaction it had missed, below the cursor.
    receipts.push({ height: 100, tokenId: '7' });

    const resumed = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(resumed.map((token) => token.tokenId)).toEqual(['8']);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + GRC721_RECONCILE_INTERVAL_MS);

    const reconciled = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);
    expect(reconciled.map((token) => token.tokenId)).toEqual(['8', '7']);
  });

  // A walk started before a wallet reset carries no abort signal, so it comes
  // back afterwards and would write its cursors — the previous address among
  // them — into a fresh document.
  it('does not restore the cursors when a wallet reset lands mid-walk', async () => {
    const { repository, post, syncCacheValues } = makeRepository([], {
      owners: { '7': ADDRESS },
    });

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
            getTransactions: [
              { block_height: 120, response: { events: [received(ADDRESS, '7')] } },
            ],
          },
        },
      };
    });

    const walk = repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    await repository.deleteGRC721SyncCache();

    release();
    // The read itself still answers; only its cursor write is thrown away.
    await expect(walk).resolves.toHaveLength(1);

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
  });

  // Reading an account's collections is staged — collections, then the catalog,
  // then each collection's tokens — and a reset can land between two stages. The
  // later stages are still working from what the earlier ones read before the
  // reset, so the whole read has to be invalidated, not just the walks that had
  // already loaded a cursor.
  it('does not restore the cursors when a wallet reset lands between read stages', async () => {
    const { repository, post, syncCacheValues } = makeRepository([], {
      balances: { [PACKAGE_PATH]: 1 },
      owners: { '7': ADDRESS },
    });

    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    let reachCatalog = (): void => undefined;
    const reachedCatalog = new Promise<void>((resolve) => {
      reachCatalog = resolve;
    });

    const reply = (events: unknown[]): unknown => ({
      data: {
        data: {
          latestBlockHeight: 500,
          getTransactions: [{ block_height: 120, response: { events } }],
        },
      },
    });

    // The catalog stage is held open; the token walk below it only starts once
    // it is released, which by then is after the reset.
    post.mockImplementation(async (_url: string, body: { query: string }) => {
      if (body.query.includes('getGRC721NewTokenEvents')) {
        reachCatalog();
        await held;
        return reply([newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')]);
      }

      return reply([received(ADDRESS, '7')]);
    });

    const read = repository.fetchAccountGRC721CollectionsBy(ADDRESS);
    await reachedCatalog;

    await repository.deleteGRC721SyncCache();

    release();
    await expect(read).resolves.toHaveLength(1);

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeUndefined();
  });

  // The invalidation is scoped to the walks the reset interrupted: a read that
  // starts afterwards has to keep its cursor as usual.
  it('stores the cursor again for a walk started after the reset', async () => {
    const { repository, syncCacheValues } = makeRepository(
      [[received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
      { blockHeight: 120 },
    );

    await repository.deleteGRC721SyncCache();
    await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(syncCacheValues[GRC721_SYNC_CACHE_KEY]).toBeTruthy();
  });

  it('resumes the collection walk too', async () => {
    const { repository, post } = makeRepository(
      [[newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')], [received(ADDRESS, '7')]],
      { balances: { [PACKAGE_PATH]: 1 }, owners: { '7': ADDRESS } },
      { blockHeight: 300 },
    );

    await repository.fetchAccountGRC721CollectionsBy(ADDRESS);
    post.mockClear();
    await repository.fetchAccountGRC721CollectionsBy(ADDRESS);

    post.mock.calls.forEach((_call, index) => {
      expect(resumeHeightOf(post, index)).toBe(300);
    });
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

describe('fetchGRC721TokensBy', () => {
  it('keeps only the received ids the realm still attributes to the address', async () => {
    const { repository } = makeRepository(
      [[received(ADDRESS, '7')], [received(ADDRESS, '3')], [received(ADDRESS, '1')]],
      // `3` was sent on, `1` was burned.
      { owners: { '7': ADDRESS, '3': OTHER_ADDRESS } },
    );

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(tokens.map((token) => token.tokenId)).toEqual(['7']);
    expect(tokens[0]).toEqual(
      expect.objectContaining({ packagePath: PACKAGE_PATH, symbol: 'GNFT', type: 'grc721' }),
    );
  });

  it('asks the realm once per received id, deduplicated', async () => {
    const { repository, evaluateIIFE } = makeRepository(
      [[received(ADDRESS, '7')], [received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS } },
    );

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(tokens.map((token) => token.tokenId)).toEqual(['7']);
    expect(evaluateIIFE).toHaveBeenCalledTimes(1);
    const [, params] = evaluateIIFE.mock.calls[0];
    expect(params.statements.filter((s: string) => s.includes('OwnerOf'))).toHaveLength(1);
  });

  it('ignores events of another realm riding in the same transaction', async () => {
    const { repository } = makeRepository(
      [[received(ADDRESS, '9', 'gno.land/r/demo/nft.ITEM.0000000'), received(ADDRESS, '7')]],
      { owners: { '7': ADDRESS, '9': ADDRESS } },
    );

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(tokens.map((token) => token.tokenId)).toEqual(['7']);
  });

  it('checks every received id, however many, so an old one is not hidden', async () => {
    const tokenIds = Array.from({ length: 501 }, (_, index) => `${index + 1}`);
    const { repository } = makeRepository(
      // Newest received first, so the only owned id is the last one checked.
      [...tokenIds].reverse().map((tokenId) => [received(ADDRESS, tokenId)]),
      { owners: { '1': ADDRESS } },
    );

    const tokens = await repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS);

    expect(tokens.map((token) => token.tokenId)).toEqual(['1']);
  });

  it('never calls the realm when nothing was received', async () => {
    const { repository, evaluateIIFE } = makeRepository([[received(OTHER_ADDRESS, '7')]]);

    await expect(repository.fetchGRC721TokensBy(PACKAGE_PATH, ADDRESS)).resolves.toEqual([]);
    expect(evaluateIIFE).not.toHaveBeenCalled();
  });
});

describe('fetchAccountGRC721CollectionsBy', () => {
  const TOKEN_URI_FUNC = { name: 'TokenURI', results: [{ name: '', type: 'string' }] };
  const TOKEN_METADATA_STRUCT_FUNC = {
    name: 'TokenMetadata',
    results: [{ name: '', type: 'metadata.Data' }],
  };

  it('holds a collection when the realm reports a balance, with a thumbnail token', async () => {
    const { repository } = makeRepository(
      [[newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')], [received(ADDRESS, '7')]],
      {
        balances: { [PACKAGE_PATH]: 1 },
        owners: { '7': ADDRESS },
        funcs: [TOKEN_URI_FUNC, TOKEN_METADATA_STRUCT_FUNC],
      },
    );

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([
      expect.objectContaining({
        collectionId: COLLECTION_ID,
        packagePath: PACKAGE_PATH,
        tokenId: '7',
        isTokenUri: true,
        // A struct-returning TokenMetadata cannot be read over qeval.
        isMetadata: false,
      }),
    ]);
  });

  it('never asks the realm about a collection the account has not received', async () => {
    const { repository, getValueByEvaluateExpression } = makeRepository(
      [
        [newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')],
        [newToken('gno.land/r/demo/nft.ITEM.0000000', 'Item', 'ITEM')],
        [received(ADDRESS, '7')],
      ],
      { balances: { [PACKAGE_PATH]: 1 }, owners: { '7': ADDRESS }, funcs: [TOKEN_URI_FUNC] },
    );

    const collections = await repository.fetchAccountGRC721CollectionsBy(ADDRESS);

    expect(collections.map((collection) => collection.collectionId)).toEqual([COLLECTION_ID]);
    const balanceCalls = getValueByEvaluateExpression.mock.calls.filter(
      ([, functionName]) => functionName === 'BalanceOf',
    );
    expect(balanceCalls.map(([packagePath]) => packagePath)).toEqual([PACKAGE_PATH]);
  });

  it('checks every received collection, however many', async () => {
    const collectionIds = Array.from(
      { length: 51 },
      (_, index) => `gno.land/r/demo/nft${index}.ITEM.0000000`,
    );
    const heldId = collectionIds[0];
    const { repository } = makeRepository(
      [
        ...collectionIds.map((collectionId) => [
          newToken(collectionId, `Item ${collectionId}`, 'ITEM'),
        ]),
        // Newest received first, so the held collection is the last candidate.
        ...[...collectionIds]
          .reverse()
          .map((collectionId) => [received(ADDRESS, '1', collectionId)]),
      ],
      { balances: { 'gno.land/r/demo/nft0': 1 }, owners: { '1': ADDRESS } },
    );

    const collections = await repository.fetchAccountGRC721CollectionsBy(ADDRESS);

    expect(collections.map((collection) => collection.collectionId)).toEqual([heldId]);
  });

  it('does not resurrect a collection id the catalog rejected as ambiguous', async () => {
    const { repository } = makeRepository(
      [
        [newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')],
        [newToken(COLLECTION_ID, 'Impostor', 'GNFT')],
        [received(ADDRESS, '7')],
      ],
      { balances: { [PACKAGE_PATH]: 1 }, owners: { '7': ADDRESS } },
    );

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([]);
  });

  it('drops a collection the realm reports a zero balance for', async () => {
    const { repository } = makeRepository(
      [[newToken(COLLECTION_ID, 'GNOSWAP NFT', 'GNFT')], [received(ADDRESS, '7')]],
      { balances: {}, owners: { '7': ADDRESS } },
    );

    await expect(repository.fetchAccountGRC721CollectionsBy(ADDRESS)).resolves.toEqual([]);
  });
});
