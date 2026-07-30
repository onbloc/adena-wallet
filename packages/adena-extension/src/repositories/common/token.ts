import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { TokenMapper } from './mapper/token-mapper';
import {
  AccountAssetsResponse,
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
  TokenMetaResponse,
} from './response/token-asset-response';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { decodeGnoString, gnoLiteral, parseQEvalResult } from '@common/provider/gno/qeval';
import {
  isTokenPath,
  parseRegistryKey,
  registryKeyToTokenPath,
  toTokenPath,
  tokenIdentifierToRegistryKey,
} from '@common/utils/grc20-token-path';
import { getGrc20RegConfig, Grc20RegConfig } from '@common/utils/grc20reg-config';
import { parseGRC721FileContents } from '@common/utils/parse-utils';
import {
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721MetadataModel,
  GRC721Model,
  IBCNativeTokenModel,
  IBCTokenModel,
  NativeTokenModel,
  NetworkMetainfo,
  TokenModel,
} from '@types';
import BigNumber from 'bignumber.js';
import { mapGRC721CollectionModel } from './mapper/token-query.mapper';
import { AppInfoResponse } from './response';
import {
  makeAllTransferEventsQueryBy,
  makeGetGRC721AddPackagePathsQuery,
  makeGRC721TransferEventsQuery,
} from './token.queries';
import { ITokenRepository } from './types';

enum LocalValueType {
  AccountTokenMetainfos = 'ACCOUNT_TOKEN_METAINFOS',
  AccountGRC721Collections = 'ACCOUNT_GRC721_COLLECTIONS',
  AccountGRC721PinnedPackages = 'ACCOUNT_GRC721_PINNED_PACKAGES',
  AccountTransferEventBlockHeight = 'ACCOUNT_TRANSFER_EVENT_BLOCK_HEIGHT',
}

const DEFAULT_TOKEN_NETWORK_ID = '';

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

    return Promise.all([
      this.fetchNativeTokenAssets(),
      this.fetchGRC20TokenAssets(),
      // this.fetchIBCNativeTokenAssets(),
      // this.fetchIBCTokenAssets(),
    ]).then((data) => data.flat());
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const apps = await fetch(TokenRepository.APP_INFO_URI);
    return apps.json();
  };

  public getAccountTokenMetainfos = async (accountId: string): Promise<TokenModel[]> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      {
        [key in string]: TokenModel[];
      }
    >(LocalValueType.AccountTokenMetainfos);

    return (
      accountTokenMetainfos[accountId] ??
      DEFAULT_TOKEN_METAINFOS.map((token) => ({ ...token, networkId: this.networkId }))
    );
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      {
        [key in string]: TokenModel[];
      }
    >(LocalValueType.AccountTokenMetainfos);

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
    const accountTokenMetainfos = await this.localStorage.getToObject<
      {
        [key in string]: TokenModel[];
      }
    >(LocalValueType.AccountTokenMetainfos);

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
   * token path. Accepts a wallet token path `{packagePath}:{symbol}` (colon) or
   * a registry fqname `{packagePath}.{symbol}` (dot); a bare packagePath is
   * rejected — the symbol is required so multi-symbol realms are unambiguous.
   * The registry is the sole source of truth (no qrender/qfile parsing).
   */
  public async fetchGRC20TokenByPackagePath(tokenPath: string): Promise<GRC20TokenModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const registryKey = tokenIdentifierToRegistryKey(tokenPath);
    if (!registryKey) {
      throw new Error('A full token path ({packagePath}:{symbol}) is required');
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

    return all;
  };

  /**
   * Read one page of registry keys (`{packagePath}.{symbol}` fqname form) plus
   * the total registry size in a single qeval, using
   * `GetRegistry().IterateByOffset(offset, limit, ...)` and `.Size()`. Keys are
   * comma-joined on-chain; a fqname key never contains a comma.
   */
  private async fetchGRC20RegistryKeyPage(
    offset: number,
    limit: number,
  ): Promise<{ keys: string[]; totalCount: number }> {
    if (!this.gnoProvider) {
      return { keys: [], totalCount: 0 };
    }

    const registryPath = this.grc20RegConfig.registryPath;

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
      console.warn('fetchGRC20RegistryKeyPage: evaluateIIFE failed', offset, limit, e);
      return { keys: [], totalCount: 0 };
    }

    if (!response) {
      return { keys: [], totalCount: 0 };
    }

    const tuples = parseQEvalResult(response);
    if (tuples.length < 2) {
      console.warn('fetchGRC20RegistryKeyPage: unexpected tuple count', response);
      return { keys: [], totalCount: 0 };
    }

    const totalCount = Number(tuples[0].value);
    const joined = decodeGnoString(tuples[1].value);
    const keys = joined.split(',').filter((key) => key.length > 0);

    return { keys, totalCount: Number.isFinite(totalCount) ? totalCount : 0 };
  }

  /**
   * Fetch metadata (name, symbol, decimals) for a set of registry keys via the
   * grc20reg object receiver (`Get(key).GetName()/GetSymbol()/GetDecimals()`),
   * batched into a single qeval per chunk to cut round-trips. `Get` returning
   * nil yields the sentinel ("", "", 0) and is dropped.
   */
  private async fetchGRC20TokensByKeys(keys: string[]): Promise<GRC20TokenModel[]> {
    if (!this.gnoProvider || keys.length === 0) {
      return [];
    }

    const registryPath = this.grc20RegConfig.registryPath;
    const networkId = this.networkId;
    const results: GRC20TokenModel[] = [];

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
        console.warn('fetchGRC20TokensByKeys: evaluateIIFE failed', chunk, e);
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
        // Identity keys off the registry fqname: tokenId = `packagePath:symbol`.
        const tokenId = parsed ? toTokenPath(parsed.packagePath, parsed.symbol) : key;

        results.push({
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

  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    if (this.apiUrl) {
      const tokens = await TokenRepository.fetch<TokenMetaResponse>(
        this.networkInstance,
        this.apiUrl + '/v1/token-meta',
      ).then((data) => data?.items || []);

      return tokens
        .filter((token) => token.tokenType === 'GRC721')
        .map((token) => ({
          tokenId: token.path,
          networkId: this.networkId,
          display: false,
          type: 'grc721',
          packagePath: token.path,
          name: token.name,
          symbol: token.symbol,
          image: token.logoUrl ?? '',
          isTokenUri: false,
          isMetadata: false,
        }));
    }
    if (!this.queryUrl) {
      return [];
    }

    const allRealmsQuery = makeGetGRC721AddPackagePathsQuery();
    return TokenRepository.postGraphQuery(this.networkInstance, this.queryUrl, allRealmsQuery).then(
      (result) =>
        result?.data?.transactions
          ? result?.data?.transactions
              .flatMap((tx: any) => tx.messages)
              .map((message: any) =>
                mapGRC721CollectionModel(this.networkMetainfo?.networkId || '', message),
              )
              .filter((collection: GRC721CollectionModel | null) => !!collection)
          : [],
    );
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

    const assets = await TokenRepository.fetch<AccountAssetsResponse>(
      this.networkInstance,
      this.apiUrl + '/v1/accounts/' + address,
    )
      .then((data) => data?.data?.assets ?? null)
      .catch(() => null);

    if (!assets) {
      return null;
    }

    return assets
      .filter((asset) => (asset.tokenType ?? '').toUpperCase() === 'GRC20' && !!asset.packagePath)
      .map((asset) => {
        // The API returns the identity in `tokenId` as the registry fqname
        // `{packagePath}.{symbol}`; normalize it to the wallet token path
        // `{packagePath}:{symbol}`. Tolerate an already-colon value or a missing
        // tokenId by rebuilding from packagePath + symbol.
        const tokenId =
          (isTokenPath(asset.tokenId) ? asset.tokenId : registryKeyToTokenPath(asset.tokenId)) ??
          toTokenPath(asset.packagePath, asset.symbol);

        return {
          main: false,
          tokenId,
          pkgPath: asset.packagePath,
          networkId: this.networkId,
          display: false,
          type: 'grc20',
          name: asset.name,
          symbol: asset.symbol,
          decimals: asset.decimals,
          image: asset.logoUrl ?? '',
        };
      });
  }

  public async fetchAllTransferPackagesBy(address: string): Promise<string[]> {
    if (this.apiUrl) {
      const packages = await TokenRepository.fetch<AccountAssetsResponse>(
        this.networkInstance,
        this.apiUrl + '/v1/accounts/' + address,
      )
        .then((data) => data?.data?.assets || [])
        .then((assets) => [...new Set(assets.map((asset) => asset.packagePath))]);

      return packages;
    }

    if (!this.queryUrl) {
      return [];
    }

    const transferEventsQuery = makeAllTransferEventsQueryBy(address);
    return TokenRepository.postGraphQuery(
      this.networkInstance,
      this.queryUrl,
      transferEventsQuery,
    ).then((result) => {
      const transactions = result?.data?.transactions;
      if (!transactions) {
        return [];
      }

      const packagePaths: string[] = transactions
        .flatMap((transaction: any) => transaction?.response?.events || [])
        .filter((event: any) => {
          const eventType = event?.type;
          const eventAttributes = event?.attrs || [];
          const eventToAttribute = eventAttributes.find((attribute: any) => attribute.key === 'to');

          if (!eventType || !eventToAttribute) {
            return false;
          }

          return true;
        })
        .map((event: any) => event?.pkg_path || '');

      return [...new Set(packagePaths)];
    });
  }

  /**
   * GRC20 token paths the account has transferred/received, derived from the
   * indexer's Transfer events. Each grc20 Transfer emits a `token` attribute
   * equal to `Token.ID()` = `{packagePath}.{symbol}.{sequence}`; the registry
   * keys by `{packagePath}.{symbol}`, so the trailing `.{sequence}` is stripped
   * before converting to the wallet token path. Unlike `fetchAllTransferPackagesBy`
   * (packagePath only), this keeps sibling symbols from the same realm distinct.
   */
  public async fetchAllTransferGRC20TokenPathsBy(address: string): Promise<string[]> {
    if (!this.queryUrl) {
      return [];
    }

    const transferEventsQuery = makeAllTransferEventsQueryBy(address);
    return TokenRepository.postGraphQuery(
      this.networkInstance,
      this.queryUrl,
      transferEventsQuery,
    ).then((result) => {
      const transactions = result?.data?.transactions;
      if (!transactions) {
        return [];
      }

      const tokenPaths: string[] = transactions
        .flatMap((transaction: any) => transaction?.response?.events || [])
        .map((event: any) => {
          const attrs = event?.attrs || [];
          const hasParty = attrs.some((a: any) => a.key === 'to' || a.key === 'from');
          const tokenAttr = attrs.find((a: any) => a.key === 'token');
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
    });
  }

  public async fetchGRC721CollectionByPackagePath(
    packagePath: string,
  ): Promise<GRC721CollectionModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const fileContents = await this.gnoProvider.getFileContent(packagePath).catch(() => null);
    const fileNames = fileContents?.split('\n') || [];

    if (fileContents === null || fileNames.length === 0) {
      throw new Error('Not available realm');
    }

    const fileTokenInfo = await this.fetchGRC721CollectionQueryFiles(packagePath, fileNames).catch(
      () => null,
    );
    if (fileTokenInfo) {
      return fileTokenInfo;
    }

    throw new Error('Realm is not GRC721');
  }

  public async fetchGRC721TokenUriBy(packagePath: string, tokenId: string): Promise<string> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const response = await this.gnoProvider.getValueByEvaluateExpression(packagePath, 'TokenURI', [
      tokenId,
    ]);

    if (!response) {
      throw new Error('not found token uri');
    }

    return response.replace(/"/g, '');
  }

  public async fetchGRC721TokenMetadataBy(
    packagePath: string,
    tokenId: string,
  ): Promise<GRC721MetadataModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const response = await this.gnoProvider.getValueByEvaluateExpression(
      packagePath,
      'TokenMetadata',
      [tokenId],
    );

    if (!response) {
      throw new Error('not found token uri');
    }

    const jsonStr = response.replace(/\\"/g, '"');

    const metadata: GRC721MetadataModel = JSON.parse(jsonStr);
    return metadata;
  }

  public async fetchGRC721BalanceBy(packagePath: string, address: string): Promise<number> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const response = await this.gnoProvider.getValueByEvaluateExpression(packagePath, 'BalanceOf', [
      address,
    ]);

    if (!response || BigNumber(response).isNaN()) {
      throw new Error('not found token uri');
    }

    return BigNumber(response).toNumber();
  }

  public async fetchGRC721TokensBy(packagePath: string, address: string): Promise<GRC721Model[]> {
    if (!this.apiUrl && !this.queryUrl) {
      return [];
    }

    const events: {
      type: string;
      pkg_path: string;
      func: string;
      attrs: { [key in string]: string }[];
    }[] = [];

    if (this.apiUrl) {
      const grc721TransferEventsQuery = makeGRC721TransferEventsQuery(packagePath, address);
      const resultEvents: {
        type: string;
        pkg_path: string;
        func: string;
        attrs: { [key in string]: string }[];
      }[] = await TokenRepository.postGraphQuery(
        this.networkInstance,
        this.queryUrl || this.apiUrl,
        grc721TransferEventsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions?.edges.flatMap(
              (edge: any) => edge.transaction.response.events,
            )
          : [],
      );

      events.push(...resultEvents);
    } else {
      const grc721TransferEventsQuery = makeGRC721TransferEventsQuery(packagePath, address);
      const resultEvents: {
        type: string;
        pkg_path: string;
        func: string;
        attrs: { [key in string]: string }[];
      }[] = await TokenRepository.postGraphQuery(
        this.networkInstance,
        this.queryUrl || '',
        grc721TransferEventsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions?.flatMap((transaction: any) => transaction?.response?.events)
          : [],
      );

      events.push(...resultEvents);
    }

    const receivedTokenIds: string[] = [];
    const sendedTokenIds: string[] = [];
    const tokens: GRC721Model[] = [];

    for (const event of events) {
      if (event.pkg_path !== packagePath || event.type !== 'Transfer') {
        continue;
      }

      const tokenIdValue = event.attrs.find((attr) => attr.key === 'tid')?.value;
      const toValue = event.attrs.find((attr) => attr.key === 'to')?.value;
      const fromValue = event.attrs.find((attr) => attr.key === 'from')?.value;

      if (tokenIdValue === undefined || toValue === undefined || fromValue === undefined) {
        continue;
      }

      if (toValue !== address && fromValue !== address) {
        continue;
      }

      if (receivedTokenIds.includes(tokenIdValue) || sendedTokenIds.includes(tokenIdValue)) {
        continue;
      }

      const isSended = fromValue === address;
      if (isSended) {
        sendedTokenIds.push(tokenIdValue);
        continue;
      }

      receivedTokenIds.push(tokenIdValue);
      tokens.push({
        tokenId: tokenIdValue,
        networkId: this.networkId,
        type: 'grc721',
        packagePath,
        name: '',
        symbol: '',
        isTokenUri: false,
        isMetadata: false,
        metadata: null,
      });
    }

    return tokens;
  }

  public async getAccountGRC721CollectionsBy(
    accountId: string,
    networkId: string,
  ): Promise<GRC721CollectionModel[]> {
    const accountGRC721CollectionsMap = await this.localStorage.getToObject<
      {
        [key in string]: { [key in string]: GRC721CollectionModel[] };
      }
    >(LocalValueType.AccountGRC721Collections);

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
      (await this.localStorage.getToObject<
        {
          [key in string]: { [key in string]: GRC721CollectionModel[] };
        }
      >(LocalValueType.AccountGRC721Collections)) || {};

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
    const accountGRC721PinnedPackagesMap = await this.localStorage.getToObject<
      {
        [key in string]: { [key in string]: string[] };
      }
    >(LocalValueType.AccountGRC721PinnedPackages);

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
      (await this.localStorage.getToObject<
        {
          [key in string]: { [key in string]: string[] };
        }
      >(LocalValueType.AccountGRC721PinnedPackages)) || {};

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

  private fetchIBCNativeTokenAssets = async (): Promise<IBCNativeTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/ibc-native/${this.networkId}.json`;
    return this.networkInstance
      .get<IBCNativeTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCNativeMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  private fetchIBCTokenAssets = async (): Promise<IBCTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/ibc-tokens/${this.networkId}.json`;
    return this.networkInstance
      .get<IBCTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCTokenMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  private async fetchGRC721CollectionQueryFiles(
    packagePath: string,
    fileNames: string[],
  ): Promise<GRC721CollectionModel | null> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    for (const fileName of fileNames) {
      const filePath = [packagePath, fileName].join('/');
      const contents = await this.gnoProvider.getFileContent(filePath).catch(() => null);
      if (!contents) {
        continue;
      }

      const tokenInfo = parseGRC721FileContents(contents);

      if (tokenInfo) {
        return {
          tokenId: packagePath,
          packagePath: packagePath,
          networkId: this.networkId,
          display: false,
          type: 'grc721',
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          image: null,
          isMetadata: tokenInfo.isMetadata,
          isTokenUri: tokenInfo.isTokenUri,
        };
      }
    }

    return null;
  }

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
