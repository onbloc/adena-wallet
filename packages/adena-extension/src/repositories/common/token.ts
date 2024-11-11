import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { TokenMapper } from './mapper/token-mapper';
import {
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
} from './response/token-asset-response';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { makeRPCRequest } from '@common/utils/fetch-utils';
import {
  parseGRC20ByABCIRender,
  parseGRC20ByFileContents,
  parseGRC721FileContents,
} from '@common/utils/parse-utils';
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
import { mapGRC20TokenModel, mapGRC721CollectionModel } from './mapper/token-query.mapper';
import { AppInfoResponse } from './response';
import {
  makeAllRealmsQuery,
  makeAllTransferEventsQueryBy,
  makeGRC721TransferEventsQuery,
  makeGRC721TransferEventsQueryWithCursor,
} from './token.queries';
import { ITokenRepository } from './types';

enum LocalValueType {
  AccountTokenMetainfos = 'ACCOUNT_TOKEN_METAINFOS',
  AccountGRC721Collections = 'ACCOUNT_GRC721_COLLECTIONS',
  AccountGRC721PinnedPackages = 'ACCOUNT_GRC721_PINNED_PACKAGES',
  AccountTransferEventBlockHeight = 'ACCOUNT_TRANSFER_EVENT_BLOCK_HEIGHT',
}

const DEFAULT_TOKEN_NETWORK_ID = '';

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
      'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
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
    return this.networkMetainfo.apiUrl + '/v1';
  }

  public get queryUrl(): string | null {
    if (!this.networkMetainfo?.indexerUrl) {
      return null;
    }
    return this.networkMetainfo.indexerUrl + '/graphql/query';
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

  public async fetchGRC20TokenByPackagePath(packagePath: string): Promise<GRC20TokenModel> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const fileContents = await this.gnoProvider.getFileContent(packagePath).catch(() => null);
    const fileNames = fileContents?.split('\n') || [];

    if (fileContents === null || fileNames.length === 0) {
      throw new Error('Not available realm');
    }

    const renderTokenInfo = await this.fetchGRC20TokenInfoQueryRender(packagePath).catch(
      () => null,
    );
    if (renderTokenInfo) {
      return renderTokenInfo;
    }

    const fileTokenInfo = await this.fetchGRC20TokenInfoQueryFiles(packagePath, fileNames).catch(
      () => null,
    );
    if (fileTokenInfo) {
      return fileTokenInfo;
    }

    throw new Error('Realm is not GRC20');
  }

  public fetchAllGRC20Tokens = async (): Promise<GRC20TokenModel[]> => {
    if (this.apiUrl) {
      const tokens = await TokenRepository.postRPCRequest<{
        result: {
          name: string;
          owner: string;
          symbol: string;
          packagePath: string;
          decimals: number;
        }[];
      }>(
        this.networkInstance,
        this.apiUrl + '/gno',
        makeRPCRequest({
          method: 'getGRC20Tokens',
        }),
      ).then((data) => data?.result || []);

      return tokens.map((token) => ({
        main: false,
        tokenId: token.packagePath,
        pkgPath: token.packagePath,
        networkId: this.networkId,
        display: false,
        type: 'grc20',
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        image: '',
      }));
    }

    if (!this.queryUrl) {
      return [];
    }

    const allRealmsQuery = makeAllRealmsQuery();
    return TokenRepository.postGraphQuery(this.networkInstance, this.queryUrl, allRealmsQuery).then(
      (result) =>
        result?.data?.transactions
          ? result?.data?.transactions
              .flatMap((tx: any) => tx.messages)
              .map((message: any) =>
                mapGRC20TokenModel(this.networkMetainfo?.networkId || '', message),
              )
              .filter((tokenInfo: GRC20TokenModel | null) => !!tokenInfo)
          : [],
    );
  };

  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    if (this.apiUrl) {
      const tokens = await TokenRepository.postRPCRequest<{
        result: {
          name: string;
          symbol: string;
          packagePath: string;
          isTokenURI: boolean;
          isTokenMeta: boolean;
        }[];
      }>(
        this.networkInstance,
        this.apiUrl + '/gno',
        makeRPCRequest({
          method: 'getGRC721Packages',
        }),
      ).then((data) => data?.result || []);

      return tokens.reduce<GRC721CollectionModel[]>((accumulated, current) => {
        const exists = !!accumulated.find((item) => item.packagePath === current.packagePath);
        if (!exists) {
          accumulated.push({
            tokenId: current.packagePath,
            networkId: this.networkId,
            display: false,
            type: 'grc721',
            packagePath: current.packagePath,
            name: current.name,
            symbol: current.symbol,
            image: null,
            isMetadata: !!current.isTokenMeta,
            isTokenUri: !!current.isTokenURI,
          });
        }
        return accumulated;
      }, []);
    }

    if (!this.queryUrl) {
      return [];
    }

    const allRealmsQuery = makeAllRealmsQuery();
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

  public async fetchAllTransferPackagesBy(address: string): Promise<string[]> {
    if (this.apiUrl) {
      const packages = await TokenRepository.postRPCRequest<{
        result: string[];
      }>(
        this.networkInstance,
        this.apiUrl + '/gno',
        makeRPCRequest({
          method: 'getUserTransferPackages',
          params: [address],
        }),
      )
        .then((data) => data?.result || [])
        .then((packages) => [...new Set(packages)]);

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
      const grc721TransferEventsQuery = makeGRC721TransferEventsQueryWithCursor(
        packagePath,
        address,
      );
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

  private async fetchGRC20TokenInfoQueryRender(
    packagePath: string,
  ): Promise<GRC20TokenModel | null> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const { tokenName, tokenSymbol, tokenDecimals } = await this.gnoProvider
      .getRenderOutput(packagePath, '')
      .then(parseGRC20ByABCIRender);

    return {
      main: false,
      tokenId: packagePath,
      pkgPath: packagePath,
      networkId: this.networkId,
      display: false,
      type: 'grc20',
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      image: '',
    };
  }

  private async fetchGRC20TokenInfoQueryFiles(
    packagePath: string,
    fileNames: string[],
  ): Promise<GRC20TokenModel | null> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    for (const fileName of fileNames) {
      const filePath = [packagePath, fileName].join('/');
      const contents = await this.gnoProvider.getFileContent(filePath).catch(() => null);
      if (!contents) {
        continue;
      }

      const tokenInfo = parseGRC20ByFileContents(contents);

      if (tokenInfo) {
        return {
          main: false,
          tokenId: packagePath,
          pkgPath: packagePath,
          networkId: this.networkId,
          display: false,
          type: 'grc20',
          name: tokenInfo.tokenName,
          symbol: tokenInfo.tokenSymbol,
          decimals: tokenInfo.tokenDecimals,
          image: '',
        };
      }
    }

    return null;
  }

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

  private static postRPCRequest = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
    data: any,
  ): Promise<T | null> => {
    return axiosInstance
      .post<T>(url, data)
      .then((response) => response.data)
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
