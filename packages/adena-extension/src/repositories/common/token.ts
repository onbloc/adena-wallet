import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { TokenMapper } from './mapper/token-mapper';
import {
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
} from './response/token-asset-response';

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
import { makeAllRealmsQuery } from './token.queries';
import { ITokenRepository } from './types';

enum LocalValueType {
  AccountTokenMetainfos = 'ACCOUNT_TOKEN_METAINFOS',
  AccountGRC721Collections = 'ACCOUNT_GRC721_COLLECTIONS',
  AccountGRC721PinnedPackages = 'ACCOUNT_GRC721_PINNED_PACKAGES',
}

const DEFAULT_TOKEN_NETWORK_ID = 'DEFAULT';

const DEFAULT_TOKEN_METAINFOS: NativeTokenModel[] = [
  {
    main: true,
    tokenId: 'Gnoland',
    name: 'Gnoland',
    networkId: DEFAULT_TOKEN_NETWORK_ID,
    image:
      'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    symbol: 'GNOT',
    denom: 'ugnot',
    type: 'gno-native',
    decimals: 6,
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

    return accountTokenMetainfos[accountId] ?? [];
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
          isMetadata?: boolean;
          isTokenUri?: boolean;
        }[];
      }>(
        this.networkInstance,
        this.apiUrl + '/gno',
        makeRPCRequest({
          method: 'getGRC721Tokens',
        }),
      ).then((data) => data?.result || []);

      return tokens.map((token) => ({
        tokenId: token.packagePath,
        networkId: this.networkId,
        display: false,
        type: 'grc721',
        packagePath: token.packagePath,
        name: token.name,
        symbol: token.symbol,
        isMetadata: !!token.isMetadata,
        isTokenUri: !!token.isTokenUri,
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
                mapGRC721CollectionModel(this.networkMetainfo?.networkId || '', message),
              )
          : [],
    );
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

    return response;
  }

  public async fetchGRC721BalanceBy(packagePath: string, address: string): Promise<number> {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }

    const response = await this.gnoProvider.getValueByEvaluateExpression(packagePath, 'BalanceOf', [
      address,
    ]);

    if (!response || !BigNumber(response).isNaN()) {
      throw new Error('not found token uri');
    }

    return BigNumber(response).toNumber();
  }

  public async fetchGRC721TokensBy(): Promise<GRC721Model[]> {
    return [];
  }

  public async getAccountGRC721CollectionsByAccountId(
    accountId: string,
  ): Promise<GRC721CollectionModel[]> {
    const accountGRC721CollectionsMap = await this.localStorage.getToObject<{
      [key in string]: GRC721CollectionModel[];
    }>(LocalValueType.AccountGRC721Collections);

    if (!accountGRC721CollectionsMap[accountId]) {
      return [];
    }

    return accountGRC721CollectionsMap[accountId];
  }

  public async saveAccountGRC721CollectionsBy(
    accountId: string,
    collections: GRC721CollectionModel[],
  ): Promise<boolean> {
    const accountGRC721CollectionsMap = await this.localStorage.getToObject<{
      [key in string]: GRC721CollectionModel[];
    }>(LocalValueType.AccountGRC721Collections);

    accountGRC721CollectionsMap[accountId] = collections;

    await this.localStorage.setByObject(
      LocalValueType.AccountGRC721Collections,
      accountGRC721CollectionsMap,
    );

    return true;
  }

  public async getAccountGRC721PinnedPackagesByAccountId(accountId: string): Promise<string[]> {
    const accountGRC721PinnedPackagesMap = await this.localStorage.getToObject<{
      [key in string]: string[];
    }>(LocalValueType.AccountGRC721PinnedPackages);

    if (!accountGRC721PinnedPackagesMap[accountId]) {
      return [];
    }

    return accountGRC721PinnedPackagesMap[accountId];
  }

  public async saveAccountGRC721PinnedPackagesBy(
    accountId: string,
    packagePaths: string[],
  ): Promise<boolean> {
    const accountGRC721PinnedPackagesMap = await this.localStorage.getToObject<{
      [key in string]: string[];
    }>(LocalValueType.AccountGRC721PinnedPackages);

    accountGRC721PinnedPackagesMap[accountId] = [...new Set(packagePaths)];

    await this.localStorage.setByObject(
      LocalValueType.AccountGRC721PinnedPackages,
      accountGRC721PinnedPackagesMap,
    );

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
