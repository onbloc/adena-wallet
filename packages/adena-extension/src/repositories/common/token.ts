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
import { parseGRC20ByABCIRender, parseGRC20ByFileContents } from '@common/utils/parse-utils';
import {
  GRC20TokenModel,
  IBCNativeTokenModel,
  IBCTokenModel,
  NativeTokenModel,
  NetworkMetainfo,
  TokenModel,
} from '@types';
import { mapGRC20TokenModel } from './mapper/token-query.mapper';
import { makeAllRealmsQuery } from './token.queries';

type LocalValueType = 'ACCOUNT_TOKEN_METAINFOS';

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

export interface AppInfoResponse {
  symbol: string;
  name: string;
  description: string;
  logo: string;
  link: string;
  display: boolean;
  order: number;
}

export class TokenRepository {
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
    }>('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos[accountId] ?? [];
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>('ACCOUNT_TOKEN_METAINFOS');

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

    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', changedAccountTokenMetainfos);
    return true;
  };

  public deleteTokenMetainfos = async (accountId: string): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>('ACCOUNT_TOKEN_METAINFOS');

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: [],
    };

    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', changedAccountTokenMetainfos);
    return true;
  };

  public deleteAllTokenMetainfo = async (): Promise<boolean> => {
    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', {});
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
