import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { TokenMapper } from './mapper/token-mapper';
import {
  AccountAsset,
  AccountAssetsResponse,
  GRC20TokenResponse,
  NativeTokenResponse,
} from './response/token-asset-response';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { AdenaStorage } from '@common/storage';
import {
  emptyCursor,
  GRC721_RECONCILE_INTERVAL_MS,
  GRC721_SYNC_CACHE_KEY,
  GRC721CollectionCandidate,
  GRC721SyncCache,
  GRC721SyncCacheValueType,
  GRC721SyncCursor,
  GRC721TokenCandidate,
  NetworkGRC721Sync,
} from './token.grc721-sync';
import { GnoFunction } from '@common/provider/gno/types';
import { decodeGnoString, gnoLiteral, parseQEvalResult } from '@common/provider/gno/qeval';
import {
  parseRegistryKey,
  registryKeyToTokenPath,
  tokenIdentifierToRegistryKey,
  toTokenPath,
} from '@common/utils/grc20-token-path';
import {
  getGrc20RegConfig,
  Grc20RegConfig,
  resolveGrc20TransferEvent,
} from '@common/utils/grc20reg-config';
import {
  GRC721_TOKEN_PACKAGES,
  isGrc721Package,
  resolveGrc721Events,
} from '@common/utils/grc721-config';
import { parseGrc721CollectionId } from '@common/utils/grc721-token-id';
import {
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721MetadataModel,
  GRC721Model,
  Grc20RouteMap,
  NativeTokenModel,
  NetworkMetainfo,
  TokenModel,
} from '@types';
import BigNumber from 'bignumber.js';
import { AppInfoResponse } from './response';
import {
  makeAllTransferEventsQueryBy,
  makeGRC721NewTokenEventsQuery,
  makeGRC721ReceivedCollectionsQuery,
  makeGRC721ReceivedTokensQuery,
} from './token.queries';
import { ITokenRepository } from './types';

enum LocalValueType {
  AccountTokenMetainfos = 'ACCOUNT_TOKEN_METAINFOS',
  AccountGRC721Collections = 'ACCOUNT_GRC721_COLLECTIONS',
  AccountGRC721PinnedPackages = 'ACCOUNT_GRC721_PINNED_PACKAGES',
}

const DEFAULT_TOKEN_NETWORK_ID = '';

// What identifies a realm as a GRC721 collection when looked up by path.
const GRC721_REALM_READ_FUNCTIONS = ['Name', 'Symbol', 'BalanceOf', 'OwnerOf'];

/** How qeval prints a nil `error` — the whole tuple, type token included. */
const QEVAL_NIL = '(undefined)';

// Membership is one `BalanceOf` per candidate collection, and ownership one
// `OwnerOf` per candidate token unrolled into a single qeval. Candidates are
// never truncated — dropping one hides an NFT the account owns — so these bound
// how many run at once and how large a generated expression gets, nothing else.
const GRC721_BALANCE_SCAN_BATCH_SIZE = 10;
const GRC721_OWNER_SCAN_BATCH_SIZE = 50;

interface IndexedGnoEvent {
  type?: string;
  pkg_path?: string;
  attrs?: { key: string; value: string }[];
}

interface IndexedTransactionsResponse {
  data?: {
    latestBlockHeight?: number;
    getTransactions?: { block_height?: number; response?: { events?: IndexedGnoEvent[] } }[];
  };
}

/**
 * One indexer walk: the matched events plus the heights needed to move a
 * cursor — how far this batch reached, and how far the indexer itself has.
 */
interface IndexedEventPage {
  events: IndexedGnoEvent[];
  /** Highest block height among the matched transactions; 0 when none matched. */
  maxBlockHeight: number;
  /** The indexer's own tip; 0 when it did not report one. */
  latestBlockHeight: number;
}

/** A finished walk: the page it fetched, and what the next cursor needs. */
interface IndexedEventWalk<T> {
  page: IndexedEventPage;
  /** Candidates carried over from the cursor; empty when walked from genesis. */
  previousItems: T[];
  /** Height those candidates reached; 0 when walked from genesis. */
  previousBlockHeight: number;
  /** False when the page must not be folded back into the cursor. */
  storable: boolean;
  /** The reconciliation time the next cursor should carry. */
  reconciledAt: number;
  /** Whether this walk read the whole range rather than resuming. */
  reconciled: boolean;
}

// Default page size for on-chain grc20reg registry pagination. Keeps a single
// qeval response (keys page + batched metadata) within a comfortable size.
const GRC20_REGISTRY_PAGE_SIZE = 50;

// Hard cap on how many registry entries fetchAllGRC20Tokens will page through,
// so a very large registry can never spin the loop unbounded.
const GRC20_REGISTRY_MAX_ITEMS = 1000;

const DEFAULT_TOKEN_METAINFOS: NativeTokenModel[] = [
  {
    tokenId: GNOT_TOKEN.denom,
    type: 'gno-native',
    name: GNOT_TOKEN.name,
    networkId: DEFAULT_TOKEN_NETWORK_ID,
    symbol: GNOT_TOKEN.symbol,
    denom: GNOT_TOKEN.denom,
    decimals: GNOT_TOKEN.decimals,
    image:
      'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/ugnot.svg',
    main: true,
    display: true,
  },
];

export class TokenRepository implements ITokenRepository {
  private static GNO_TOKEN_RESOURCE_URI =
    'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

  private static APP_INFO_URI = '/resources/apps/apps.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  private gnoProvider: GnoProvider | null = null;

  // In-flight `/v1/accounts/{address}` requests. Token discovery asks for the
  // same document twice in one Promise.all, so the pending promise is shared.
  private accountAssetsInFlight: Map<string, Promise<AccountAsset[] | null>> = new Map();

  // GRC721 indexer cursors. Resolved lazily from AdenaStorage.cache, or
  // injected in tests; see the `syncCache` getter.
  private syncCacheStorage: StorageManager<GRC721SyncCacheValueType> | null = null;

  // Serialises cursor writes and the reset deletion; see writeGRC721SyncStore.
  // Static because the cursors live in one cache document shared by every
  // repository, and a new one is built whenever the network or provider changes.
  private static syncWriteQueue: Promise<void> = Promise.resolve();

  // Bumped by deleteGRC721SyncCache. An NFT read records this when it starts
  // and its writes are dropped once the value has moved on, so a read still in
  // flight during a wallet reset cannot put the cursors back.
  private static syncCacheEpoch = 0;

  constructor(
    localStorage: StorageManager,
    networkInstance: AxiosInstance,
    networkMetainfo: NetworkMetainfo | null,
    gnoProvider: GnoProvider | null,
    syncCacheStorage?: StorageManager<GRC721SyncCacheValueType>,
  ) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
    this.networkMetainfo = networkMetainfo;
    this.gnoProvider = gnoProvider;
    this.syncCacheStorage = syncCacheStorage ?? null;
  }

  private get networkId(): string {
    return this.networkMetainfo?.networkId || '';
  }

  public get supported(): boolean {
    return !!this.networkMetainfo?.apiUrl || !!this.networkMetainfo?.indexerUrl;
  }

  public get apiUrl(): string | null {
    if (!this.networkMetainfo?.apiUrl) {
      return null;
    }
    return this.networkMetainfo.apiUrl;
  }

  public get queryUrl(): string | null {
    if (!this.networkMetainfo?.indexerUrl) {
      return null;
    }
    return this.networkMetainfo.indexerUrl + '/graphql/query';
  }

  private get chainId(): string {
    return this.networkMetainfo?.chainId || '';
  }

  // Per-chain grc20reg registry/helper paths (bundled resource, see grc20reg.json).
  private get grc20RegConfig(): Grc20RegConfig {
    return getGrc20RegConfig(this.chainId);
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo): void {
    this.networkMetainfo = networkMetainfo;
  }

  public fetchTokenMetainfos = async (): Promise<TokenModel[]> => {
    if (!this.networkId) {
      return [];
    }

    return Promise.all([this.fetchNativeTokenAssets(), this.fetchGRC20TokenAssets()]).then((data) =>
      data.flat(),
    );
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const apps = await fetch(TokenRepository.APP_INFO_URI);
    return apps.json();
  };

  public getAccountTokenMetainfos = async (accountId: string): Promise<TokenModel[]> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>(LocalValueType.AccountTokenMetainfos);

    return (
      accountTokenMetainfos[accountId] ??
      DEFAULT_TOKEN_METAINFOS.map((token) => ({ ...token, networkId: this.networkId }))
    );
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>(LocalValueType.AccountTokenMetainfos);

    const isUnique = function (token0: TokenModel, token1: TokenModel): boolean {
      return token0.tokenId === token1.tokenId && token0.networkId === token1.networkId;
    };

    const filteredTokenMetainfos = tokenMetainfos.filter((info1, index) => {
      return tokenMetainfos.findIndex((info2) => isUnique(info1, info2)) === index;
    });

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: filteredTokenMetainfos,
    };

    await this.localStorage.setByObject(
      LocalValueType.AccountTokenMetainfos,
      changedAccountTokenMetainfos,
    );
    return true;
  };

  public deleteTokenMetainfos = async (accountId: string): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>(LocalValueType.AccountTokenMetainfos);

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: [],
    };

    await this.localStorage.setByObject(
      LocalValueType.AccountTokenMetainfos,
      changedAccountTokenMetainfos,
    );
    return true;
  };

  public deleteAllTokenMetainfo = async (): Promise<boolean> => {
    await this.localStorage.setByObject(LocalValueType.AccountTokenMetainfos, {});
    return true;
  };

  /**
   * Look up a single GRC20 token via the grc20reg registry, strictly by its full
   * token key. Accepts the canonical token key `{packagePath}.{symbol}` (dot) or
   * the legacy colon form `{packagePath}:{symbol}`; a bare packagePath is
   * rejected — the symbol is required so multi-symbol realms are unambiguous.
   * The registry is the sole source of truth (no qrender/qfile parsing).
   */
  public async fetchGRC20TokenByPackagePath(tokenPath: string): Promise<GRC20TokenModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const registryKey = tokenIdentifierToRegistryKey(tokenPath);
    if (!registryKey) {
      throw new Error('A full token key ({packagePath}.{symbol}) is required');
    }

    const [token] = await this.fetchGRC20TokensByKeys([registryKey]);
    if (!token) {
      throw new Error('Token is not registered in grc20reg');
    }
    return token;
  }

  /**
   * Fetch a single page of GRC20 tokens directly from the on-chain `grc20reg`
   * registry (AVL tree), together with the registry's total size. The list is
   * sourced entirely on-chain — the previous API-server (`/v1/tokens`) and
   * indexer (register events) paths are gone.
   */
  public fetchGRC20Tokens = async (params?: {
    offset?: number;
    limit?: number;
  }): Promise<{ items: GRC20TokenModel[]; totalCount: number }> => {
    const offset = Math.max(0, params?.offset ?? 0);
    const limit = Math.max(1, params?.limit ?? GRC20_REGISTRY_PAGE_SIZE);

    const { keys, totalCount } = await this.fetchGRC20RegistryKeyPage(offset, limit);
    const items = await this.fetchGRC20TokensByKeys(keys);
    return { items, totalCount };
  };

  /**
   * Collect every GRC20 token in the registry by paging through it. Bounded by
   * GRC20_REGISTRY_MAX_ITEMS so a very large registry can never loop unbounded.
   * Kept for consumers that cross-reference the full set (e.g. transfer picker).
   */
  public fetchAllGRC20Tokens = async (): Promise<GRC20TokenModel[]> => {
    const all: GRC20TokenModel[] = [];
    let offset = 0;

    for (;;) {
      const { keys, totalCount } = await this.fetchGRC20RegistryKeyPage(
        offset,
        GRC20_REGISTRY_PAGE_SIZE,
      );
      if (keys.length === 0) {
        break;
      }

      const items = await this.fetchGRC20TokensByKeys(keys);
      all.push(...items);
      // Advance by registry position (keys.length), not items.length: nil/invalid
      // entries are filtered out of items but still consume a registry slot.
      offset += keys.length;
      if (offset >= totalCount || offset >= GRC20_REGISTRY_MAX_ITEMS) {
        break;
      }
    }

    const seen = new Set<string>();
    return all.filter((token) => {
      if (seen.has(token.tokenId)) {
        return false;
      }
      seen.add(token.tokenId);
      return true;
    });
  };

  /**
   * Read one page of registry keys (`{packagePath}.{symbol}` fqname form) plus
   * the total size across the configured registries, paged as one list in
   * configuration order.
   */
  private async fetchGRC20RegistryKeyPage(
    offset: number,
    limit: number,
  ): Promise<{ keys: string[]; totalCount: number }> {
    const keys: string[] = [];
    let totalCount = 0;
    let remainingOffset = offset;
    let remainingLimit = limit;

    for (const registry of this.grc20RegConfig.registries) {
      const page = await this.fetchRegistryKeyPageFrom(
        registry.path,
        remainingOffset,
        Math.max(remainingLimit, 1),
      );
      totalCount += page.totalCount;

      if (remainingLimit <= 0) {
        continue;
      }
      if (remainingOffset >= page.totalCount) {
        remainingOffset -= page.totalCount;
        continue;
      }
      keys.push(...page.keys);
      remainingLimit -= page.keys.length;
      remainingOffset = 0;
    }

    return { keys, totalCount };
  }

  /**
   * Read one page of keys plus the total size of a single registry in a single
   * qeval, using `GetRegistry().IterateByOffset(offset, limit, ...)` and
   * `.Size()`. Keys are comma-joined on-chain; a fqname key never contains a
   * comma.
   */
  private async fetchRegistryKeyPageFrom(
    registryPath: string,
    offset: number,
    limit: number,
  ): Promise<{ keys: string[]; totalCount: number }> {
    if (!this.gnoProvider) {
      return { keys: [], totalCount: 0 };
    }

    let response: string;
    try {
      response = await this.gnoProvider.evaluateIIFE(registryPath, {
        returnType: '(int, string)',
        statements: [
          'reg := GetRegistry()',
          's := ""',
          `reg.IterateByOffset(${offset}, ${limit}, func(key string, value any) bool { s += key + ","; return false })`,
        ],
        returnExpression: 'reg.Size(), s',
      });
    } catch (e) {
      console.warn('fetchRegistryKeyPageFrom: evaluateIIFE failed', registryPath, offset, limit, e);
      return { keys: [], totalCount: 0 };
    }

    if (!response) {
      return { keys: [], totalCount: 0 };
    }

    const tuples = parseQEvalResult(response);
    if (tuples.length < 2) {
      console.warn('fetchRegistryKeyPageFrom: unexpected tuple count', registryPath, response);
      return { keys: [], totalCount: 0 };
    }

    const totalCount = Number(tuples[0].value);
    const joined = decodeGnoString(tuples[1].value);
    const keys = joined.split(',').filter((key) => key.length > 0);

    return { keys, totalCount: Number.isFinite(totalCount) ? totalCount : 0 };
  }

  /**
   * Fetch metadata (name, symbol, decimals) for a set of registry keys; a key
   * is resolved by the first configured registry that holds it.
   */
  private async fetchGRC20TokensByKeys(keys: string[]): Promise<GRC20TokenModel[]> {
    if (!this.gnoProvider || keys.length === 0) {
      return [];
    }

    const resolved = new Map<string, GRC20TokenModel>();
    let unresolved = keys;

    for (const registry of this.grc20RegConfig.registries) {
      if (unresolved.length === 0) {
        break;
      }
      const found = await this.fetchGRC20TokensByKeysFrom(registry.path, unresolved);
      found.forEach((token, key) => resolved.set(key, token));
      unresolved = unresolved.filter((key) => !resolved.has(key));
    }

    return keys
      .map((key) => resolved.get(key))
      .filter((token): token is GRC20TokenModel => token !== undefined);
  }

  /**
   * Fetch metadata for a set of registry keys via one registry's object
   * receiver (`Get(key).GetName()/GetSymbol()/GetDecimals()`), batched into a
   * single qeval per chunk to cut round-trips. `Get` returning nil yields the
   * sentinel ("", "", 0) and is dropped.
   */
  private async fetchGRC20TokensByKeysFrom(
    registryPath: string,
    keys: string[],
  ): Promise<Map<string, GRC20TokenModel>> {
    const results = new Map<string, GRC20TokenModel>();
    if (!this.gnoProvider || keys.length === 0) {
      return results;
    }

    const networkId = this.networkId;

    for (let start = 0; start < keys.length; start += GRC20_REGISTRY_PAGE_SIZE) {
      const chunk = keys.slice(start, start + GRC20_REGISTRY_PAGE_SIZE);

      const statements: string[] = [];
      const returnParts: string[] = [];
      const returnTypes: string[] = [];
      chunk.forEach((key, i) => {
        statements.push(`n${i} := ""; s${i} := ""; d${i} := 0`);
        statements.push(
          `{ t := Get(${gnoLiteral(
            key,
          )}); if t != nil { n${i} = t.GetName(); s${i} = t.GetSymbol(); d${i} = t.GetDecimals() } }`,
        );
        returnParts.push(`n${i}, s${i}, d${i}`);
        returnTypes.push('string, string, int');
      });

      let response: string;
      try {
        response = await this.gnoProvider.evaluateIIFE(registryPath, {
          returnType: `(${returnTypes.join(', ')})`,
          statements,
          returnExpression: returnParts.join(', '),
        });
      } catch (e) {
        console.warn('fetchGRC20TokensByKeysFrom: evaluateIIFE failed', registryPath, chunk, e);
        continue;
      }

      const tuples = parseQEvalResult(response);
      chunk.forEach((key, i) => {
        const nameTuple = tuples[i * 3];
        const symbolTuple = tuples[i * 3 + 1];
        const decimalsTuple = tuples[i * 3 + 2];
        if (!nameTuple || !symbolTuple || !decimalsTuple) {
          return;
        }

        const name = decodeGnoString(nameTuple.value);
        const symbol = decodeGnoString(symbolTuple.value);
        const decimals = Number(decimalsTuple.value);
        if (!name || !symbol || !Number.isFinite(decimals)) {
          // Nil token (Get returned nil) — sentinel ("", "", 0).
          return;
        }

        const parsed = parseRegistryKey(key);
        const packagePath = parsed?.packagePath ?? key;
        // Identity is the registry fqname itself: tokenId = `packagePath.symbol`.
        const tokenId = parsed ? toTokenPath(parsed.packagePath, parsed.symbol) : key;

        results.set(key, {
          main: false,
          tokenId,
          pkgPath: packagePath,
          networkId,
          display: false,
          type: 'grc20',
          name,
          symbol,
          decimals,
          image: '',
        });
      });
    }

    return results;
  }

  /**
   * Every GRC721 collection on the chain, from the grc721 package's `NewToken`
   * events — there is no registry (unlike grc20's `grc20reg`) and no API to
   * read instead. A collection id announced twice means the realm built two
   * ledgers behind one identifier, making its later events ambiguous, so the
   * package documents it as one to ignore wholesale.
   */
  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    const { collections } = await this.fetchGRC721Catalog(TokenRepository.beginGRC721Read());
    return [...collections.values()];
  }

  /**
   * The catalog plus the ids it rejected, which callers must not resurrect.
   *
   * `NewToken` is announced once per collection and never retracted, so the
   * walk resumes from the stored height and only folds in newly announced
   * collections. Order matters: the candidates are kept oldest-first so a
   * collection id announced twice is still detected as ambiguous by the same
   * first-wins rule, whichever walk each announcement arrived in.
   */
  private async fetchGRC721Catalog(epoch: number): Promise<{
    collections: Map<string, GRC721CollectionModel>;
    ambiguous: Set<string>;
  }> {
    const candidates = await this.fetchGRC721CatalogCandidates(epoch);

    const collections = new Map<string, GRC721CollectionModel>();
    const ambiguous = new Set<string>();

    for (const candidate of candidates) {
      const parsed = parseGrc721CollectionId(candidate.collectionId);
      if (!parsed) {
        continue;
      }

      if (collections.has(candidate.collectionId)) {
        ambiguous.add(candidate.collectionId);
        continue;
      }

      collections.set(candidate.collectionId, {
        tokenId: '',
        collectionId: candidate.collectionId,
        networkId: this.networkId,
        display: false,
        type: 'grc721',
        packagePath: parsed.packagePath,
        name: candidate.name || parsed.symbol,
        symbol: candidate.symbol || parsed.symbol,
        image: '',
        isTokenUri: false,
        isMetadata: false,
      });
    }

    ambiguous.forEach((collectionId) => collections.delete(collectionId));

    return { collections, ambiguous };
  }

  /** Every collection ever announced, oldest first, resumed from the cursor. */
  private async fetchGRC721CatalogCandidates(epoch: number): Promise<GRC721CollectionCandidate[]> {
    const network = await this.readGRC721SyncNetwork();
    const cursor = network.catalog || emptyCursor<GRC721CollectionCandidate>();

    const walk = await this.walkIndexedEvents(cursor, (fromBlockHeight) =>
      makeGRC721NewTokenEventsQuery(GRC721_TOKEN_PACKAGES, fromBlockHeight),
    );
    const { page, previousItems } = walk;

    // The query orders ASC, so appending keeps the whole list oldest-first.
    const merged = [...previousItems];

    for (const event of page.events) {
      const schema = resolveGrc721Events(event.pkg_path, GRC721_TOKEN_PACKAGES);
      if (!isGrc721Package(event.pkg_path, GRC721_TOKEN_PACKAGES)) {
        continue;
      }
      if (event.type !== schema.newTokenType) {
        continue;
      }

      const attrs = TokenRepository.toAttributeMap(event.attrs);
      const collectionId = attrs[schema.tokenAttr] || '';
      if (!parseGrc721CollectionId(collectionId)) {
        continue;
      }

      // A second announcement of the same id is what makes it ambiguous, so
      // duplicates are kept rather than deduplicated away.
      merged.push({
        collectionId,
        name: attrs[schema.nameAttr] || '',
        symbol: attrs[schema.symbolAttr] || '',
      });
    }

    if (TokenRepository.shouldStoreWalk(walk)) {
      await this.writeGRC721SyncStore(epoch, (stored) => ({
        ...stored,
        catalog: TokenRepository.nextCursor(walk, merged),
      }));
    }

    return merged;
  }

  /**
   * The GRC721 collections an account holds at least one token of.
   *
   * The `Transfer` events into the address narrow the chain-wide catalog to the
   * collections the account has ever touched, so the RPC fan-out scales with
   * the account rather than with the chain. Membership is then decided by
   * `BalanceOf`, so a stale event log cannot add or drop a collection here.
   */
  public async fetchAccountGRC721CollectionsBy(address: string): Promise<GRC721CollectionModel[]> {
    const epoch = TokenRepository.beginGRC721Read();

    const candidateIds = await this.fetchGRC721ReceivedCollectionIds(address, epoch);
    if (candidateIds.length === 0) {
      return [];
    }

    const { collections: catalog, ambiguous } = await this.fetchGRC721Catalog(epoch);

    const candidates = candidateIds
      .filter((collectionId) => !ambiguous.has(collectionId))
      .map((collectionId) => catalog.get(collectionId) || this.toGRC721Collection(collectionId))
      .filter((collection): collection is GRC721CollectionModel => collection !== null);

    const held: GRC721CollectionModel[] = [];
    for (let start = 0; start < candidates.length; start += GRC721_BALANCE_SCAN_BATCH_SIZE) {
      const batch = candidates.slice(start, start + GRC721_BALANCE_SCAN_BATCH_SIZE);
      const balances = await Promise.all(
        batch.map((collection) =>
          this.fetchGRC721BalanceBy(collection.packagePath, address).catch(() => 0),
        ),
      );

      batch.forEach((collection, index) => {
        if (balances[index] > 0) {
          held.push(collection);
        }
      });
    }

    return Promise.all(
      held.map(async (collection) => {
        const [capabilities, tokens] = await Promise.all([
          this.fetchGRC721Capabilities(collection.packagePath),
          this.readGRC721TokensBy(collection.packagePath, address, epoch).catch(() => []),
        ]);

        return {
          ...collection,
          ...capabilities,
          // Newest owned token: the collection thumbnail.
          tokenId: tokens[0]?.tokenId ?? '',
        };
      }),
    );
  }

  /**
   * Collection ids the address ever received a token of, newest first, resumed
   * from the cursor stored for this address on this network.
   *
   * Receiving is append-only — a later send does not un-receive — and
   * membership is decided afterwards by `BalanceOf`, so a resumed walk can
   * never report a collection the account no longer holds.
   */
  private async fetchGRC721ReceivedCollectionIds(
    address: string,
    epoch: number,
  ): Promise<string[]> {
    const network = await this.readGRC721SyncNetwork();
    const cursor = network.collections?.[address] || emptyCursor<string>();

    const walk = await this.walkIndexedEvents(cursor, (fromBlockHeight) =>
      makeGRC721ReceivedCollectionsQuery(address, GRC721_TOKEN_PACKAGES, fromBlockHeight),
    );
    const { page, previousItems } = walk;

    const seen = new Set(previousItems);
    const received: string[] = [];

    for (const event of page.events) {
      const schema = resolveGrc721Events(event.pkg_path, GRC721_TOKEN_PACKAGES);
      if (!isGrc721Package(event.pkg_path, GRC721_TOKEN_PACKAGES)) {
        continue;
      }
      if (event.type !== schema.transferType) {
        continue;
      }

      const attrs = TokenRepository.toAttributeMap(event.attrs);
      const collectionId = attrs[schema.tokenAttr] || '';
      if (attrs[schema.toAttr] !== address || seen.has(collectionId)) {
        continue;
      }
      if (!parseGrc721CollectionId(collectionId)) {
        continue;
      }

      seen.add(collectionId);
      received.push(collectionId);
    }

    // The query orders DESC, so this batch is newer than everything stored.
    const merged = [...received, ...previousItems];

    if (TokenRepository.shouldStoreWalk(walk)) {
      await this.writeGRC721SyncStore(epoch, (stored) => ({
        ...stored,
        collections: {
          ...stored.collections,
          [address]: TokenRepository.nextCursor(walk, merged),
        },
      }));
    }

    return merged;
  }

  /**
   * A collection the catalog does not cover — an older grc721 version, or a
   * `NewToken` the indexer has not caught up with. The id still carries the
   * realm and symbol, which is enough to list and query it. Ids the catalog
   * rejected as ambiguous are filtered out before this is reached.
   */
  private toGRC721Collection(collectionId: string): GRC721CollectionModel | null {
    const parsed = parseGrc721CollectionId(collectionId);
    if (!parsed) {
      return null;
    }

    return {
      tokenId: '',
      collectionId,
      networkId: this.networkId,
      display: false,
      type: 'grc721',
      packagePath: parsed.packagePath,
      name: parsed.symbol,
      symbol: parsed.symbol,
      image: '',
      isTokenUri: false,
      isMetadata: false,
    };
  }

  /**
   * The account document from `/v1/accounts/{address}`, deduplicated per address
   * while in flight. Null means no API URL or a failed request — callers read
   * that as "take the fallback path".
   */
  private fetchAccountAssets(address: string): Promise<AccountAsset[] | null> {
    if (!this.apiUrl) {
      return Promise.resolve(null);
    }

    const inFlight = this.accountAssetsInFlight.get(address);
    if (inFlight) {
      return inFlight;
    }

    const request = TokenRepository.fetch<AccountAssetsResponse>(
      this.networkInstance,
      this.apiUrl + '/v1/accounts/' + address,
    )
      .then((data) => data?.data?.assets ?? null)
      .catch(() => null);

    this.accountAssetsInFlight.set(address, request);
    request.finally(() => {
      if (this.accountAssetsInFlight.get(address) === request) {
        this.accountAssetsInFlight.delete(address);
      }
    });

    return request;
  }

  /**
   * GRC20 tokens the account currently holds, sourced from the API
   * `/v1/accounts/{address}` assets. Each asset already carries its identity,
   * so we map it straight to a GRC20TokenModel (tokenId = token path) without
   * cross-referencing the on-chain registry — this both avoids the heavy
   * registry scan and keeps sibling symbols from the same realm distinct.
   *
   * Returns null when no API URL is configured so callers can fall back to the
   * indexer-based discovery path.
   */
  public async fetchAccountGRC20Tokens(address: string): Promise<GRC20TokenModel[] | null> {
    if (!this.apiUrl) {
      return null;
    }

    const assets = await this.fetchAccountAssets(address);

    if (!assets) {
      return null;
    }

    return assets
      .filter((asset) => (asset.tokenType ?? '').toUpperCase() === 'GRC20' && !!asset.packagePath)
      .map((asset) => {
        // tokenKey is the wallet's canonical identity; tokenId is opaque and
        // must never be used, even as a fallback. Rebuild from packagePath +
        // symbol when tokenKey is absent (older API versions).
        const tokenId =
          (asset.tokenKey ? tokenIdentifierToRegistryKey(asset.tokenKey) : null) ??
          toTokenPath(asset.packagePath, asset.symbol);

        return {
          main: false,
          tokenId,
          pkgPath: asset.packagePath,
          networkId: this.networkId,
          display: false,
          type: 'grc20' as const,
          name: asset.name,
          symbol: asset.symbol,
          decimals: asset.decimals,
          image: asset.logoUrl ?? '',
        };
      });
  }

  /**
   * GRC20 token keys the account has transferred/received, derived from the
   * indexer's Transfer events. Each grc20 Transfer emits a `token` attribute
   * equal to `Token.ID()` = `{packagePath}.{symbol}.{sequence}`; the token key is
   * `{packagePath}.{symbol}`, so the trailing `.{sequence}` is stripped to obtain
   * it, which keeps sibling symbols from the same realm distinct.
   */
  public async fetchAllTransferGRC20TokenPathsBy(address: string): Promise<string[]> {
    if (!this.queryUrl) {
      return [];
    }

    const { tokenPackages } = this.grc20RegConfig;
    const events = await this.fetchEventsByQuery(
      makeAllTransferEventsQueryBy(address, tokenPackages),
    );

    const tokenPaths: string[] = events
      .map((event) => {
        const schema = resolveGrc20TransferEvent(event?.pkg_path, tokenPackages);
        if (event?.type !== schema.type) {
          return null;
        }
        const attrs = event?.attrs || [];
        const hasParty = attrs.some((a) => a.key === schema.toAttr || a.key === schema.fromAttr);
        const tokenAttr = attrs.find((a) => a.key === schema.tokenAttr);
        if (!hasParty || !tokenAttr?.value) {
          return null;
        }

        // token attr = `{packagePath}.{symbol}.{sequence}`; drop the sequence.
        const id: string = tokenAttr.value;
        const registryKey = id.slice(0, id.lastIndexOf('.'));
        return registryKeyToTokenPath(registryKey) ?? registryKeyToTokenPath(id);
      })
      .filter((tokenPath: string | null): tokenPath is string => !!tokenPath);

    return [...new Set(tokenPaths)];
  }

  /**
   * Read a single collection straight from its realm over RPC. The collection
   * id is left unset because only the grc721 package's events carry it.
   */
  public async fetchGRC721CollectionByPackagePath(
    packagePath: string,
  ): Promise<GRC721CollectionModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const document = await this.gnoProvider.getRealmDocument(packagePath).catch(() => null);
    if (!document) {
      throw new Error('Not available realm');
    }

    const funcs = document.funcs || [];
    const isGRC721 = GRC721_REALM_READ_FUNCTIONS.every((name) =>
      funcs.some((func) => func.name === name),
    );
    if (!isGRC721) {
      throw new Error('Realm is not GRC721');
    }

    const [name, symbol] = await Promise.all([
      this.evaluateGRC721String(packagePath, 'Name').catch(() => ''),
      this.evaluateGRC721String(packagePath, 'Symbol').catch(() => ''),
    ]);

    return {
      tokenId: '',
      networkId: this.networkId,
      display: false,
      type: 'grc721',
      packagePath,
      name: name || symbol || packagePath,
      symbol,
      image: '',
      ...TokenRepository.readGRC721Capabilities(funcs),
    };
  }

  /** `TokenURI(tokenId)`; the realm's error tuple comes back as an empty URI. */
  public async fetchGRC721TokenUriBy(packagePath: string, tokenId: string): Promise<string> {
    const uri = await this.evaluateGRC721String(packagePath, 'TokenURI', tokenId);
    if (!uri) {
      throw new Error('not found token uri');
    }

    return uri;
  }

  /**
   * `TokenMetadata(tokenId)`, for realms publishing it as a JSON string. The
   * `grc721/metadata` extension returns a `Data` struct instead, which qeval
   * renders as a Gno literal; the capability probe filters those out.
   */
  public async fetchGRC721TokenMetadataBy(
    packagePath: string,
    tokenId: string,
  ): Promise<GRC721MetadataModel> {
    const response = await this.evaluateGRC721String(packagePath, 'TokenMetadata', tokenId);
    if (!response) {
      throw new Error('not found token metadata');
    }

    return JSON.parse(response) as GRC721MetadataModel;
  }

  public async fetchGRC721BalanceBy(packagePath: string, address: string): Promise<number> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const response = await this.gnoProvider.getValueByEvaluateExpression(packagePath, 'BalanceOf', [
      address,
    ]);

    if (!response || BigNumber(response).isNaN()) {
      throw new Error('not found grc721 balance');
    }

    return BigNumber(response).toNumber();
  }

  /**
   * The tokens of one collection the account currently owns, newest first. The
   * indexer supplies the ids the address ever received — GRC721 publishes no
   * enumeration function — and `OwnerOf` over RPC decides which it still owns.
   */
  public async fetchGRC721TokensBy(packagePath: string, address: string): Promise<GRC721Model[]> {
    return this.readGRC721TokensBy(packagePath, address, TokenRepository.beginGRC721Read());
  }

  /** As {@link fetchGRC721TokensBy}, for a read that has already begun. */
  private async readGRC721TokensBy(
    packagePath: string,
    address: string,
    epoch: number,
  ): Promise<GRC721Model[]> {
    const received = await this.fetchGRC721ReceivedTokenIds(packagePath, address, epoch);
    if (received.length === 0) {
      return [];
    }

    const owned = await this.filterGRC721OwnedTokenIds(packagePath, address, received);

    return owned.map(({ tokenId, collectionId }) => ({
      tokenId,
      networkId: this.networkId,
      type: 'grc721' as const,
      packagePath,
      name: '',
      symbol: parseGrc721CollectionId(collectionId)?.symbol || '',
      isTokenUri: false,
      isMetadata: false,
      metadata: null,
    }));
  }

  /**
   * Candidates only: ids the address received, newest first, deduplicated and
   * resumed from the cursor stored for this address and realm on this network.
   *
   * Ownership is re-decided by `OwnerOf` on every read, so a candidate the
   * account has since sent away costs one RPC check and nothing else.
   */
  private async fetchGRC721ReceivedTokenIds(
    packagePath: string,
    address: string,
    epoch: number,
  ): Promise<GRC721TokenCandidate[]> {
    const network = await this.readGRC721SyncNetwork();
    const cursor = network.tokens?.[address]?.[packagePath] || emptyCursor<GRC721TokenCandidate>();

    const walk = await this.walkIndexedEvents(cursor, (fromBlockHeight) =>
      makeGRC721ReceivedTokensQuery(packagePath, address, GRC721_TOKEN_PACKAGES, fromBlockHeight),
    );
    const { page, previousItems } = walk;

    const candidates: GRC721TokenCandidate[] = [];
    const seen = new Set(previousItems.map((candidate) => candidate.tokenId));

    for (const event of page.events) {
      const schema = resolveGrc721Events(event.pkg_path, GRC721_TOKEN_PACKAGES);
      if (!isGrc721Package(event.pkg_path, GRC721_TOKEN_PACKAGES)) {
        continue;
      }
      if (event.type !== schema.transferType) {
        continue;
      }

      const attrs = TokenRepository.toAttributeMap(event.attrs);
      const collectionId = attrs[schema.tokenAttr] || '';
      const tokenId = attrs[schema.tokenIdAttr];
      const parsed = parseGrc721CollectionId(collectionId);

      // The query matches whole transactions, so a batch (e.g. a swap) also
      // carries transfers of other realms and between third parties.
      if (!tokenId || !parsed || parsed.packagePath !== packagePath) {
        continue;
      }
      if (attrs[schema.toAttr] !== address) {
        continue;
      }
      if (seen.has(tokenId)) {
        continue;
      }

      seen.add(tokenId);
      candidates.push({ tokenId, collectionId });
    }

    // The query orders DESC, so this batch is newer than everything stored.
    const merged = [...candidates, ...previousItems];

    if (TokenRepository.shouldStoreWalk(walk)) {
      await this.writeGRC721SyncStore(epoch, (stored) => ({
        ...stored,
        tokens: {
          ...stored.tokens,
          [address]: {
            ...stored.tokens?.[address],
            [packagePath]: TokenRepository.nextCursor(walk, merged),
          },
        },
      }));
    }

    return merged;
  }

  /**
   * Keep the candidates the realm still reports as owned by the address.
   *
   * `OwnerOf` is unrolled into one call per id rather than looped, because a
   * qeval expression has no imports in scope and so cannot build the realm's
   * `grc721.TokenID` from a computed value. The reply is a positional `1`/`0`
   * flag per candidate; an id whose `OwnerOf` errors reads as `0`.
   */
  private async filterGRC721OwnedTokenIds(
    packagePath: string,
    address: string,
    candidates: GRC721TokenCandidate[],
  ): Promise<GRC721TokenCandidate[]> {
    if (!this.gnoProvider) {
      return [];
    }

    const owned: GRC721TokenCandidate[] = [];

    for (let start = 0; start < candidates.length; start += GRC721_OWNER_SCAN_BATCH_SIZE) {
      const batch = candidates.slice(start, start + GRC721_OWNER_SCAN_BATCH_SIZE);
      const statements = batch.map(
        ({ tokenId }, index) =>
          `{ owner${index}, err${index} := OwnerOf(${gnoLiteral(tokenId)}); ` +
          `if err${index} == nil && owner${index}.String() == ${gnoLiteral(address)} ` +
          '{ flags += "1" } else { flags += "0" } }',
      );

      let response: string;
      try {
        response = await this.gnoProvider.evaluateIIFE(packagePath, {
          returnType: 'string',
          statements: ['flags := ""', ...statements],
          returnExpression: 'flags',
        });
      } catch (e) {
        console.warn('filterGRC721OwnedTokenIds: evaluateIIFE failed', packagePath, e);
        continue;
      }

      const [tuple] = parseQEvalResult(response);
      if (!tuple) {
        continue;
      }

      const flags = decodeGnoString(tuple.value);
      batch.forEach((candidate, index) => {
        if (flags[index] === '1') {
          owned.push(candidate);
        }
      });
    }

    return owned;
  }

  /**
   * Which optional read functions a realm publishes. `TokenURI` and
   * `TokenMetadata` live in stackable extensions, so only the realm's own
   * document says whether the wallet may ask for an image or metadata.
   */
  private async fetchGRC721Capabilities(
    packagePath: string,
  ): Promise<{ isTokenUri: boolean; isMetadata: boolean }> {
    const document = await this.gnoProvider?.getRealmDocument(packagePath).catch(() => null);
    return TokenRepository.readGRC721Capabilities(document?.funcs || []);
  }

  private static readGRC721Capabilities(funcs: GnoFunction[]): {
    isTokenUri: boolean;
    isMetadata: boolean;
  } {
    // Only a `string` first result is readable over qeval.
    const returnsString = (name: string): boolean =>
      funcs.some((func) => func.name === name && func.results?.[0]?.type === 'string');

    return {
      isTokenUri: returnsString('TokenURI'),
      isMetadata: returnsString('TokenMetadata'),
    };
  }

  /**
   * Evaluate a realm function whose first result is a `string`.
   *
   * The realm decides its own arity: `TokenURI(tid) string` returns the value
   * alone, while the grc721 extensions declare `(string, error)` and report
   * "no uri" as an empty string *and* an error, so the error has to invalidate
   * the value even when the realm also filled one in.
   *
   * The error is read off the *trailing* result, because that is where Go puts
   * it, so a realm declaring `(string, int, error)` with a nil error still gets
   * its string read. The remaining assumption is that a realm whose last result
   * is a string returns an error there at all: one declaring `(string, bool)`
   * would have its value discarded whenever the flag is true. No grc721
   * extension declares that shape — the standard is `(string, error)` — and
   * telling the two apart from the response alone is not possible, so the
   * conservative reading wins: a value the realm may have flagged as invalid is
   * dropped rather than shown.
   */
  private async evaluateGRC721String(
    packagePath: string,
    functionName: string,
    ...args: string[]
  ): Promise<string> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const parsed = await this.gnoProvider.evaluateFunction(packagePath, functionName, args);
    if (!parsed) {
      return '';
    }

    if (TokenRepository.reportsError(parsed.rest)) {
      return '';
    }

    return parsed.value;
  }

  /**
   * Whether the tuples following a value carry a non-nil error.
   *
   * A nil interface prints as the bare `(undefined)` tuple, so a remainder that
   * is empty or ends with it reported no error. A non-nil error prints as a
   * struct literal, which is why the remainder is matched rather than parsed:
   * `(&(struct{("boom" string)} errors.errorString) *errors.errorString)` does
   * not round-trip through the tuple grammar.
   */
  private static reportsError(rest: string): boolean {
    if (rest === '') {
      return false;
    }

    return !rest.endsWith(QEVAL_NIL);
  }

  /** Flatten the matched transactions into their events, keeping query order. */
  private async fetchEventsByQuery(query: string): Promise<IndexedGnoEvent[]> {
    const { events } = await this.fetchEventPageByQuery(query);
    return events;
  }

  /** As {@link fetchEventsByQuery}, but also reports the heights a cursor needs. */
  private async fetchEventPageByQuery(query: string): Promise<IndexedEventPage> {
    const empty: IndexedEventPage = { events: [], maxBlockHeight: 0, latestBlockHeight: 0 };
    if (!this.queryUrl) {
      return empty;
    }

    const result = await TokenRepository.postGraphQuery<IndexedTransactionsResponse>(
      this.networkInstance,
      this.queryUrl,
      query,
    );

    const latestBlockHeight = Number(result?.data?.latestBlockHeight) || 0;
    const transactions = result?.data?.getTransactions;
    if (!Array.isArray(transactions)) {
      return { ...empty, latestBlockHeight };
    }

    const maxBlockHeight = transactions.reduce(
      (highest, transaction) => Math.max(highest, Number(transaction?.block_height) || 0),
      0,
    );

    return {
      events: transactions.flatMap((transaction) => transaction?.response?.events || []),
      maxBlockHeight,
      latestBlockHeight,
    };
  }

  /**
   * Whether the indexer has gone backwards since this cursor was written.
   *
   * A reset testnet or a re-index restarts the tip from zero, and resuming
   * above a height that now belongs to a different chain hides every token
   * below it — permanently, since the cursor never rewinds on its own.
   *
   * The signal is the *tip* dropping. Comparing a fresh tip against the
   * cursor's `blockHeight` does not work: that is the newest block matching
   * this query, typically far below the tip, so the check would only hold for
   * the brief window before the new chain grew past it. Cursors written before
   * the tip was recorded fall back to that weaker comparison rather than never
   * rewinding at all.
   */
  private static hasIndexerRewound<T>(
    cursor: GRC721SyncCursor<T>,
    page: IndexedEventPage,
  ): boolean {
    if (page.latestBlockHeight <= 0) {
      return false;
    }

    const previousTip = cursor.latestBlockHeight ?? cursor.blockHeight;

    return previousTip > 0 && page.latestBlockHeight < previousTip;
  }

  /**
   * Whether this cursor has resumed long enough to be read in full again.
   *
   * Resuming treats the indexer as append-only, and from the client it is not:
   * a re-index can repair a transaction at an older height without the tip ever
   * moving backwards, so a receipt can appear *below* the cursor. Nothing else
   * recovers it — {@link hasIndexerRewound} only sees the tip drop, and
   * `OwnerOf` only re-checks candidates a walk already found, so the token
   * stays invisible for as long as the cursor lives. Re-reading the whole range
   * on a timer bounds that window to one interval.
   *
   * A cursor stored before this field existed carries no reconciliation time
   * and is re-read on the first walk after the upgrade.
   */
  private static needsReconciliation<T>(cursor: GRC721SyncCursor<T>, now: number): boolean {
    if (cursor.reconciledAt === undefined) {
      return true;
    }

    return now - cursor.reconciledAt >= GRC721_RECONCILE_INTERVAL_MS;
  }

  /**
   * Run an indexer walk that resumes from `cursor.blockHeight`.
   *
   * Everything at or below the stored height was already folded into
   * `cursor.items`, so only newer blocks have to travel. Two things end that:
   * {@link hasIndexerRewound}, when the resume height no longer belongs to this
   * chain, and {@link needsReconciliation}, when the range below it is due to be
   * re-read. Either way the walk redoes the range from genesis with the cached
   * items dropped.
   */
  private async walkIndexedEvents<T>(
    cursor: GRC721SyncCursor<T>,
    makeQuery: (fromBlockHeight: number) => string,
  ): Promise<IndexedEventWalk<T>> {
    const now = Date.now();
    // A cursor that has walked nothing yet already reads the whole range, so it
    // reconciles itself — and must record that, or the walk after it would
    // redo from genesis for no reason.
    const unwalked = cursor.blockHeight <= 0 && cursor.items.length === 0;

    if (!unwalked && TokenRepository.needsReconciliation(cursor, now)) {
      console.info('[grc721-sync] cursor due for reconciliation, re-walking from genesis', {
        storedBlockHeight: cursor.blockHeight,
        reconciledAt: cursor.reconciledAt,
      });

      return this.walkIndexedEventsFromGenesis(makeQuery, now);
    }

    const page = await this.fetchEventPageByQuery(makeQuery(cursor.blockHeight));

    if (!TokenRepository.hasIndexerRewound(cursor, page)) {
      return {
        page,
        previousItems: cursor.items,
        previousBlockHeight: cursor.blockHeight,
        storable: TokenRepository.isStorablePage(page),
        reconciledAt: unwalked ? now : cursor.reconciledAt ?? now,
        reconciled: unwalked,
      };
    }

    console.info('[grc721-sync] indexer rewound, re-walking from genesis', {
      storedBlockHeight: cursor.blockHeight,
      storedLatestBlockHeight: cursor.latestBlockHeight,
      latestBlockHeight: page.latestBlockHeight,
    });

    return this.walkIndexedEventsFromGenesis(makeQuery, now);
  }

  /** Read the whole range, dropping whatever a cursor had cached for it. */
  private async walkIndexedEventsFromGenesis<T>(
    makeQuery: (fromBlockHeight: number) => string,
    now: number,
  ): Promise<IndexedEventWalk<T>> {
    const page = await this.fetchEventPageByQuery(makeQuery(0));

    return {
      page,
      previousItems: [],
      previousBlockHeight: 0,
      storable: TokenRepository.isStorablePage(page),
      reconciledAt: now,
      reconciled: true,
    };
  }

  /**
   * Whether a page can be folded back into a cursor.
   *
   * Events with no usable block height would advance nothing while still
   * merging their candidates, so the next walk would replay the same range and
   * append them a second time. For the catalog that is fatal rather than
   * merely wasteful: a repeated collection id *is* the ambiguity signal, so
   * every collection would be marked ambiguous and dropped, leaving the NFT
   * list permanently empty. Treat such a page as unusable and keep the cursor
   * where it was.
   */
  private static isStorablePage(page: IndexedEventPage): boolean {
    return page.events.length === 0 || page.maxBlockHeight > 0;
  }

  /**
   * Whether a completed walk is worth persisting.
   *
   * A walk that matched nothing and moved no height would rewrite the whole
   * candidate list — which for the chain-wide catalog is every collection ever
   * announced — byte for byte. Every NFT screen load did that.
   *
   * A reconciled walk is the exception: its new reconciliation time is the only
   * thing that stops the next read from walking from genesis again, so it is
   * stored even when the range came back unchanged.
   */
  private static shouldStoreWalk<T>(walk: IndexedEventWalk<T>): boolean {
    if (!walk.storable) {
      return false;
    }

    if (walk.reconciled) {
      return true;
    }

    return walk.page.events.length > 0 || walk.page.maxBlockHeight > walk.previousBlockHeight;
  }

  /** The cursor a finished walk leaves behind, over the candidates it merged. */
  private static nextCursor<T>(walk: IndexedEventWalk<T>, items: T[]): GRC721SyncCursor<T> {
    return {
      blockHeight: Math.max(walk.previousBlockHeight, walk.page.maxBlockHeight),
      latestBlockHeight: walk.page.latestBlockHeight,
      reconciledAt: walk.reconciledAt,
      items,
    };
  }

  /**
   * Cache storage, built on first use so a caller that never touches NFTs does
   * not need the chrome API present.
   */
  private get syncCache(): StorageManager<GRC721SyncCacheValueType> | null {
    if (!this.syncCacheStorage) {
      try {
        this.syncCacheStorage = AdenaStorage.cache<GRC721SyncCacheValueType>();
      } catch {
        // No cache available: every walk starts from genesis, as before.
        return null;
      }
    }

    return this.syncCacheStorage;
  }

  /** The whole cursor store, or an empty map when nothing has been walked yet. */
  private async readGRC721SyncStore(): Promise<GRC721SyncCache> {
    const store = await this.syncCache
      ?.getToObject<GRC721SyncCache>(GRC721_SYNC_CACHE_KEY)
      .catch(() => null);

    return store || {};
  }

  /**
   * Open one NFT read and return the cache epoch it runs under.
   *
   * Taken once per read, at its public entry point, and handed down to every
   * cursor read and write beneath it. Per-cursor capture is not enough: a read
   * like {@link fetchAccountGRC721CollectionsBy} walks the account's
   * collections, then the catalog, then each collection's tokens, and a wallet
   * reset can land between those stages. A later stage that took a fresh epoch
   * of its own would pass the write guard and put the account the reset had
   * just removed back into a new document, even though every input it is
   * working from was read before the reset.
   */
  private static beginGRC721Read(): number {
    return TokenRepository.syncCacheEpoch;
  }

  /**
   * Apply `update` to the stored cursors, one writer at a time.
   *
   * Every cursor shares one cache document, and refreshing an account's NFTs
   * fans out over its collections with `Promise.all` — so an unserialised
   * read-modify-write has all of them read the same snapshot and each write
   * discard the entries the others just added. Only the last collection kept a
   * cursor, and every other one re-walked from genesis on the next refresh,
   * which is the whole point of the cache.
   *
   * Chaining the writes makes each one read the document after the previous
   * writer finished, so sibling cursors survive. Reads outside the chain are
   * left alone: a walk merges into the snapshot it started from and only ever
   * writes its own sub-key.
   *
   * `epoch` is the one the whole read opened with; see {@link beginGRC721Read}.
   * A wallet reset moves the epoch on, so a read that started before the reset
   * lands here with a stale one and is dropped rather than restoring the
   * cursors — addresses included — after the wallet that owned them is gone.
   */
  private writeGRC721SyncStore(
    epoch: number,
    update: (network: NetworkGRC721Sync) => NetworkGRC721Sync,
  ): Promise<void> {
    const chainId = this.chainId;

    const write = TokenRepository.syncWriteQueue.then(async () => {
      if (epoch !== TokenRepository.syncCacheEpoch) {
        return;
      }

      const store = await this.readGRC721SyncStore();

      await this.syncCache?.setByObject(GRC721_SYNC_CACHE_KEY, {
        ...store,
        [chainId]: update(store[chainId] || {}),
      });
    });

    // A cursor that cannot be stored only costs the next walk its resume point;
    // the data itself is already in hand. Keep the queue alive either way.
    TokenRepository.syncWriteQueue = write.catch(() => undefined);

    return write.catch((error) => {
      console.warn('[grc721-sync] failed to store cursor', error);
    });
  }

  /** The stored cursors for this chain. */
  private async readGRC721SyncNetwork(): Promise<NetworkGRC721Sync> {
    const store = await this.readGRC721SyncStore();
    return store[this.chainId] || {};
  }

  /**
   * Drop every stored cursor.
   *
   * The cursors are keyed by account address, so without this a wallet reset
   * would leave the addresses the user held — and the collections and token ids
   * behind them — sitting in storage after the wallet that owned them is gone.
   *
   * Removing the key is not enough on its own. An NFT read started before the
   * reset carries no abort signal, so it comes back afterwards and writes its
   * cursors — the previous address among them — into a fresh document. Moving
   * the epoch on first invalidates every read opened before this point, down to
   * the walks it has not even started yet, and queueing the removal behind the
   * writes already running lets them finish before the key goes.
   */
  public async deleteGRC721SyncCache(): Promise<boolean> {
    TokenRepository.syncCacheEpoch += 1;

    const remove = TokenRepository.syncWriteQueue.then(() =>
      this.syncCache?.remove(GRC721_SYNC_CACHE_KEY),
    );

    TokenRepository.syncWriteQueue = remove.then(
      () => undefined,
      () => undefined,
    );

    await remove.catch((error) => {
      console.warn('[grc721-sync] failed to clear cursors', error);
    });

    return true;
  }

  private static toAttributeMap(
    attrs: { key: string; value: string }[] | undefined,
  ): Record<string, string> {
    return (attrs || []).reduce<Record<string, string>>((accumulated, attr) => {
      if (attr?.key !== undefined && !(attr.key in accumulated)) {
        accumulated[attr.key] = attr.value;
      }
      return accumulated;
    }, {});
  }

  public async getAccountGRC721CollectionsBy(
    accountId: string,
    networkId: string,
  ): Promise<GRC721CollectionModel[]> {
    const accountGRC721CollectionsMap = await this.localStorage.getToObject<{
      [key in string]: { [key in string]: GRC721CollectionModel[] };
    }>(LocalValueType.AccountGRC721Collections);

    if (!accountGRC721CollectionsMap?.[accountId]?.[networkId]) {
      return [];
    }

    return accountGRC721CollectionsMap[accountId][networkId];
  }

  public async saveAccountGRC721CollectionsBy(
    accountId: string,
    networkId: string,
    collections: GRC721CollectionModel[],
  ): Promise<boolean> {
    const accountGRC721CollectionsMap =
      (await this.localStorage.getToObject<{
        [key in string]: { [key in string]: GRC721CollectionModel[] };
      }>(LocalValueType.AccountGRC721Collections)) || {};

    const currentAccountCollections = accountGRC721CollectionsMap?.[accountId] || {};

    await this.localStorage.setByObject(LocalValueType.AccountGRC721Collections, {
      ...accountGRC721CollectionsMap,
      [accountId]: {
        ...currentAccountCollections,
        [networkId]: collections,
      },
    });

    return true;
  }

  public async getAccountGRC721PinnedPackagesBy(
    accountId: string,
    networkId: string,
  ): Promise<string[]> {
    const accountGRC721PinnedPackagesMap = await this.localStorage.getToObject<{
      [key in string]: { [key in string]: string[] };
    }>(LocalValueType.AccountGRC721PinnedPackages);

    if (!accountGRC721PinnedPackagesMap?.[accountId]?.[networkId]) {
      return [];
    }

    return accountGRC721PinnedPackagesMap[accountId][networkId];
  }

  public async saveAccountGRC721PinnedPackagesBy(
    accountId: string,
    networkId: string,
    packagePaths: string[],
  ): Promise<boolean> {
    const accountGRC721PinnedPackagesMap =
      (await this.localStorage.getToObject<{
        [key in string]: { [key in string]: string[] };
      }>(LocalValueType.AccountGRC721PinnedPackages)) || {};

    const currentAccountPinnedPackages = accountGRC721PinnedPackagesMap?.[accountId] || {};

    await this.localStorage.setByObject(LocalValueType.AccountGRC721PinnedPackages, {
      ...accountGRC721PinnedPackagesMap,
      [accountId]: {
        ...currentAccountPinnedPackages,
        [networkId]: [...new Set(packagePaths)],
      },
    });

    return true;
  }

  private fetchNativeTokenAssets = async (): Promise<NativeTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/gno-native/${this.networkId}.json`;
    return this.networkInstance
      .get<NativeTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromNativeTokenMetainfos(this.networkId, response.data))
      .catch(() =>
        DEFAULT_TOKEN_METAINFOS.map((token) => ({ ...token, networkId: this.networkId })),
      );
  };

  private fetchGRC20TokenAssets = async (): Promise<GRC20TokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + `/grc20/${this.networkId}.json`;
    return this.networkInstance
      .get<GRC20TokenResponse>(requestUri)
      .then((response) => TokenMapper.fromGRC20TokenMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  /**
   * GRC20 `routes` for this network, keyed by registry key. Kept out of the
   * stored token model on purpose: metainfos are persisted per account and can
   * predate this field. A token absent here falls back to MsgRun.
   */
  public fetchGrc20Routes = async (): Promise<Grc20RouteMap> => {
    if (!this.networkId) {
      return {};
    }

    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + `/grc20/${this.networkId}.json`;
    return this.networkInstance
      .get<GRC20TokenResponse>(requestUri)
      .then((response) => TokenMapper.toGrc20RouteMap(response.data))
      .catch(() => ({}));
  };

  private static fetch = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
  ): Promise<T | null> => {
    return axiosInstance
      .get<any>(url)
      .then((response) => response.data?.data || null)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };

  private static postGraphQuery = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
    query: string,
    header?: { [key in string]: number } | null,
  ): Promise<T | null> => {
    if (query.includes('__schema') || query.includes('__typename')) {
      console.warn('GraphQL Introspection queries are blocked.');

      return Promise.resolve(null);
    }

    return axiosInstance
      .post<T>(
        url,
        {
          query,
        },
        {
          headers: header || {},
        },
      )
      .then((response) => {
        // A schema mismatch comes back as HTTP 200 with `errors` and a null
        // `data`, which otherwise reads exactly like "the query matched
        // nothing" — an indexer that does not support a field would silently
        // empty the NFT list rather than say so.
        const errors = (response.data as { errors?: unknown[] } | null)?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          console.warn('[graphql] query rejected by the indexer', url, errors);
        }

        return response.data;
      })
      .catch((e) => {
        console.log(e);
        return null;
      });
  };
}
