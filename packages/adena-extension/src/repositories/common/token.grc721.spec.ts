import { GnoProvider } from '@common/provider/gno/gno-provider';
import { StorageManager } from '@common/storage/storage-manager';
import { GRC721_TOKEN_PACKAGES } from '@common/utils/grc721-config';
import { NetworkMetainfo } from '@types';
import { AxiosInstance } from 'axios';
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
}

function makeRepository(
  transactionEvents: unknown[][],
  chain: ChainState = {},
): {
  repository: TokenRepository;
  evaluateIIFE: jest.Mock;
  getValueByEvaluateExpression: jest.Mock;
} {
  const axiosInstance = {
    post: jest.fn().mockResolvedValue({
      data: {
        data: {
          getTransactions: transactionEvents.map((events) => ({ response: { events } })),
        },
      },
    }),
  } as unknown as AxiosInstance;

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

  const gnoProvider = {
    evaluateIIFE,
    getValueByEvaluateExpression,
    getRealmDocument: jest.fn(async () => ({ funcs: chain.funcs ?? [] })),
  } as unknown as GnoProvider;

  const repository = new TokenRepository(
    {} as unknown as StorageManager,
    axiosInstance,
    NETWORK,
    gnoProvider,
  );

  return { repository, evaluateIIFE, getValueByEvaluateExpression };
}

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
