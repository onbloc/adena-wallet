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
  makeGRC721ReceivedTokensQuery,
} from './token.queries';
import { ITokenRepository } from './types';

enum LocalValueType {
  AccountTokenMetainfos = 'ACCOUNT_TOKEN_METAINFOS',
  AccountGRC721Collections = 'ACCOUNT_GRC721_COLLECTIONS',
  AccountGRC721PinnedPackages = 'ACCOUNT_GRC721_PINNED_PACKAGES',
  AccountTransferEventBlockHeight = 'ACCOUNT_TRANSFER_EVENT_BLOCK_HEIGHT',
}

const DEFAULT_TOKEN_NETWORK_ID = '';

// The read functions every GRC721 facade publishes. GRC721 has no registry, so
// this is what identifies a realm as a collection when it is looked up by path.
const GRC721_REALM_READ_FUNCTIONS = ['Name', 'Symbol', 'BalanceOf', 'OwnerOf'];

// Collection membership is a `BalanceOf` per collection on the chain. The cap
// bounds that fan-out; the batch size bounds how many run at once.
const GRC721_BALANCE_SCAN_MAX_COLLECTIONS = 200;
const GRC721_BALANCE_SCAN_BATCH_SIZE = 10;

// Ownership confirmation unrolls one `OwnerOf` call per candidate into a single
// qeval, so the batch size also bounds the generated expression.
const GRC721_OWNER_SCAN_MAX_TOKENS = 500;
const GRC721_OWNER_SCAN_BATCH_SIZE = 50;

/** A token id the address received, kept with the collection id it came from. */
interface GRC721TokenCandidate {
  tokenId: string;
  collectionId: string;
}

interface IndexedGnoEvent {
  type?: string;
  pkg_path?: string;
  attrs?: { key: string; value: string }[];
}

interface IndexedTransactionsResponse {
  data?: {
    getTransactions?: { response?: { events?: IndexedGnoEvent[] } }[];
  };
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

  constructor(
    localStorage: StorageManager,
    networkInstance: AxiosInstance,
    networkMetainfo: NetworkMetainfo | null,
    gnoProvider: GnoProvider | null,
  ) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
    this.networkMetainfo = networkMetainfo;
    this.gnoProvider = gnoProvider;
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
   * Every GRC721 collection on the chain, read from the grc721 package's
   * `NewToken` events.
   *
   * Indexer-only by design: the collections have no on-chain registry to read
   * (unlike grc20's `grc20reg`), and no wallet API exposes them, so the event
   * stream emitted by `grc721.NewToken` — the only constructor of a `Token` —
   * is the complete list.
   *
   * A collection id announced more than once means the realm built two ledgers
   * behind one identifier, which makes every later event carrying that id
   * ambiguous; the package documents such a realm as one to ignore wholesale,
   * so it is dropped here rather than shown.
   */
  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    const events = await this.fetchEventsByQuery(
      makeGRC721NewTokenEventsQuery(GRC721_TOKEN_PACKAGES),
    );

    const collections = new Map<string, GRC721CollectionModel>();
    const ambiguous = new Set<string>();

    for (const event of events) {
      const schema = resolveGrc721Events(event.pkg_path, GRC721_TOKEN_PACKAGES);
      if (!isGrc721Package(event.pkg_path, GRC721_TOKEN_PACKAGES)) {
        continue;
      }
      if (event.type !== schema.newTokenType) {
        continue;
      }

      const attrs = TokenRepository.toAttributeMap(event.attrs);
      const collectionId = attrs[schema.tokenAttr] || '';
      const parsed = parseGrc721CollectionId(collectionId);
      if (!parsed) {
        continue;
      }

      if (collections.has(collectionId)) {
        ambiguous.add(collectionId);
        continue;
      }

      collections.set(collectionId, {
        tokenId: '',
        collectionId,
        networkId: this.networkId,
        display: false,
        type: 'grc721',
        packagePath: parsed.packagePath,
        name: attrs[schema.nameAttr] || parsed.symbol,
        symbol: attrs[schema.symbolAttr] || parsed.symbol,
        image: '',
        isTokenUri: false,
        isMetadata: false,
      });
    }

    ambiguous.forEach((collectionId) => collections.delete(collectionId));

    return [...collections.values()];
  }

  /**
   * The GRC721 collections an account currently holds at least one token of.
   *
   * The catalog comes from the indexer (`NewToken`), but membership is decided
   * over RPC: `BalanceOf(address)` on each collection's realm is the chain's
   * own answer, so a stale or incomplete event log cannot add or drop a
   * collection here. Held collections are then enriched with the realm's
   * optional read surface and a thumbnail token id.
   *
   * The fan-out is one `BalanceOf` per collection on the chain, so it is capped
   * and run in bounded batches.
   */
  public async fetchAccountGRC721CollectionsBy(address: string): Promise<GRC721CollectionModel[]> {
    const collections = (await this.fetchGRC721Collections()).slice(
      0,
      GRC721_BALANCE_SCAN_MAX_COLLECTIONS,
    );

    const held: GRC721CollectionModel[] = [];
    for (let start = 0; start < collections.length; start += GRC721_BALANCE_SCAN_BATCH_SIZE) {
      const batch = collections.slice(start, start + GRC721_BALANCE_SCAN_BATCH_SIZE);
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
          this.fetchGRC721TokensBy(collection.packagePath, address).catch(() => []),
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
   * Read a single collection straight from its realm, for a package path the
   * account does not (yet) hold a token of.
   *
   * RPC-only: `vm/qdoc` proves the realm exposes the GRC721 read surface, and
   * `Name()` / `Symbol()` supply the display fields. The collection id is left
   * unset because only the grc721 package's events carry it.
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

  /**
   * `TokenURI(tokenId)` of one token.
   *
   * The realm returns `(string, error)`; an error tuple comes back with an
   * empty URI, which is reported as a miss rather than as an empty image.
   */
  public async fetchGRC721TokenUriBy(packagePath: string, tokenId: string): Promise<string> {
    const uri = await this.evaluateGRC721String(packagePath, 'TokenURI', tokenId);
    if (!uri) {
      throw new Error('not found token uri');
    }

    return uri;
  }

  /**
   * `TokenMetadata(tokenId)` of one token.
   *
   * Only realms that publish the metadata as a JSON string are supported: the
   * `grc721/metadata` extension returns a `Data` struct, which `vm/qeval`
   * renders as a Gno literal rather than something parseable. The capability
   * probe only flags a realm as metadata-capable when the first return value is
   * a `string`, so this is never reached for a struct-returning realm.
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

  /** `BalanceOf(address)` — how many tokens of the collection the account owns. */
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
   * The tokens of one collection the account currently owns, newest first.
   *
   * Two steps, and only the second one decides: the indexer supplies the token
   * ids the address has ever *received* (GRC721 publishes no enumeration
   * function, so there is no other way to learn which ids to ask about), then
   * `OwnerOf` is evaluated over RPC for each of them and only the ids the chain
   * still attributes to the address survive. Tokens that were sent on or burned
   * drop out without the wallet having to replay sends.
   */
  public async fetchGRC721TokensBy(packagePath: string, address: string): Promise<GRC721Model[]> {
    const received = await this.fetchGRC721ReceivedTokenIds(packagePath, address);
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
   * Token ids of a realm the address has ever received, newest first and
   * deduplicated. Candidates only — ownership is settled over RPC.
   */
  private async fetchGRC721ReceivedTokenIds(
    packagePath: string,
    address: string,
  ): Promise<GRC721TokenCandidate[]> {
    const events = await this.fetchEventsByQuery(
      makeGRC721ReceivedTokensQuery(packagePath, address, GRC721_TOKEN_PACKAGES),
    );

    const candidates: GRC721TokenCandidate[] = [];
    const seen = new Set<string>();

    for (const event of events) {
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

    return candidates.slice(0, GRC721_OWNER_SCAN_MAX_TOKENS);
  }

  /**
   * Keep the candidates the realm still reports as owned by the address.
   *
   * `OwnerOf` is unrolled into a single qeval per batch — one call per token id
   * with the id inlined as a literal, because a `vm/qeval` expression has no
   * imports in scope and so cannot build the realm's `grc721.TokenID` from a
   * computed value. The result is a positional `1`/`0` flag per candidate, so
   * nothing has to be parsed back out of a delimited list; an id whose
   * `OwnerOf` errors (burned, never minted) reads as `0`.
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
   * Which optional read functions a collection's realm publishes. GRC721 has no
   * mandated facade — `TokenURI` and `TokenMetadata` live in stackable
   * extensions — so the realm's own document is what decides whether the wallet
   * may ask for an image or metadata.
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
    // Only a `string` first result is readable over qeval; a struct result (the
    // `grc721/metadata` `Data`) comes back as a Gno literal.
    const returnsString = (name: string): boolean =>
      funcs.some((func) => func.name === name && func.results?.[0]?.type === 'string');

    return {
      isTokenUri: returnsString('TokenURI'),
      isMetadata: returnsString('TokenMetadata'),
    };
  }

  /** Evaluate a realm function returning `(string, error)` and decode the string. */
  private async evaluateGRC721String(
    packagePath: string,
    functionName: string,
    ...args: string[]
  ): Promise<string> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const value = await this.gnoProvider.getValueByEvaluateExpression(
      packagePath,
      functionName,
      args,
    );

    return value ?? '';
  }

  /**
   * Run an event query against the indexer and flatten the matched
   * transactions into their events, preserving the query's ordering.
   */
  private async fetchEventsByQuery(query: string): Promise<IndexedGnoEvent[]> {
    if (!this.queryUrl) {
      return [];
    }

    const result = await TokenRepository.postGraphQuery<IndexedTransactionsResponse>(
      this.networkInstance,
      this.queryUrl,
      query,
    );

    const transactions = result?.data?.getTransactions;
    if (!Array.isArray(transactions)) {
      return [];
    }

    return transactions.flatMap((transaction) => transaction?.response?.events || []);
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
      .then((response) => response.data)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };
}
