import { parseReamPathItemsByPath } from '@common/utils/parse-utils';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { AppInfoResponse } from '@repositories/common/response';
import { ITokenRepository } from '@repositories/common/types';

import {
  AccountTokenBalance,
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721Model,
  NetworkMetainfo,
  TokenModel,
} from '@types';

export class TokenService {
  private tokenRepository: ITokenRepository;

  private tokenMetaInfos: TokenModel[];

  constructor(tokenRepository: ITokenRepository) {
    this.tokenRepository = tokenRepository;
    this.tokenMetaInfos = [];
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo): void {
    this.tokenRepository.setNetworkMetainfo(networkMetainfo);
  }

  public getTokenMetainfos(): TokenModel[] {
    return this.tokenMetaInfos;
  }

  public async fetchTokenMetainfos(): Promise<TokenModel[]> {
    if (this.tokenMetaInfos.length > 0) {
      return this.tokenMetaInfos;
    }

    const tokenMetaInfos = await this.tokenRepository.fetchTokenMetainfos();
    this.tokenMetaInfos = tokenMetaInfos;
    return this.tokenMetaInfos;
  }

  public async fetchGRC20Tokens(): Promise<GRC20TokenModel[]> {
    return this.tokenRepository
      .fetchAllGRC20Tokens()
      .then((tokens) => tokens.filter((token) => !!token));
  }

  public async fetchGRC20Token(tokenPath: string): Promise<GRC20TokenModel | null> {
    if (!tokenPath) {
      return null;
    }

    // validate realm path
    try {
      parseReamPathItemsByPath(tokenPath);
    } catch {
      return null;
    }

    return this.tokenRepository.fetchGRC20TokenByPackagePath(tokenPath).catch(() => null);
  }

  public async getAppInfos(): Promise<AppInfoResponse[]> {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  }

  public async initAccountTokenMetainfos(accountId: string): Promise<boolean> {
    const fetchedTokenMetainfos = (await this.fetchTokenMetainfos()).filter((token) => token.main);
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    await this.tokenRepository.updateTokenMetainfos(accountId, [
      ...fetchedTokenMetainfos.map((token1) => {
        const previousInfo = storedTokenMetainfos.find((token2) =>
          this.equalsToken(token1, token2),
        );
        if (previousInfo) {
          return {
            ...token1,
            tokenId: previousInfo.tokenId,
            display: previousInfo.display,
          };
        }
        return token1;
      }),
      ...storedTokenMetainfos.filter((token1) =>
        fetchedTokenMetainfos.every((token2) => !this.equalsToken(token1, token2)),
      ),
    ]);
    return true;
  }

  public async getTokenMetainfosByAccountId(accountId: string): Promise<
    {
      image: string;
      main: boolean;
      tokenId: string;
      networkId: string;
      display: boolean;
      type: 'gno-native' | 'grc20' | 'ibc-native' | 'ibc-tokens';
      name: string;
      symbol: string;
      decimals: number;
      description?: string | undefined;
      websiteUrl?: string | undefined;
    }[]
  > {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    return storedTokenMetainfos.map((token1) => ({
      ...token1,
      image:
        this.getTokenMetainfos().find((token2) => this.equalsToken(token1, token2))?.image || '',
    }));
  }

  public async updateTokenMetainfosByAccountId(
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> {
    const fetchedTokenMetainfos = await this.fetchTokenMetainfos();
    const changedTokenMetaInfos = tokenMetainfos.map((token1) => {
      const tokenMetaInfo = fetchedTokenMetainfos.find((token2) =>
        this.equalsToken(token1, token2),
      );
      if (tokenMetaInfo) {
        const { image, description } = tokenMetaInfo;
        return {
          ...token1,
          image,
          description,
        };
      }
      return token1;
    });
    await this.tokenRepository.updateTokenMetainfos(accountId, changedTokenMetaInfos);
    return true;
  }

  public async updateAccountTokenMetainfos(
    accountTokenMetainfos: AccountTokenBalance[],
  ): Promise<boolean> {
    for (const accountTokenMetainfo of accountTokenMetainfos) {
      await this.tokenRepository.updateTokenMetainfos(
        accountTokenMetainfo.accountId,
        accountTokenMetainfo.tokenBalances,
      );
    }
    return true;
  }

  public async changeAccountTokenMetainfoDisplay(
    accountId: string,
    tokenId: string,
    display: boolean,
  ): Promise<boolean> {
    const storedTokenMetainfos = await this.getTokenMetainfosByAccountId(accountId);
    const changedTokenMetainfos = storedTokenMetainfos.map((metainfo) => {
      if (metainfo.tokenId === tokenId) {
        return {
          ...metainfo,
          display,
        };
      }
      return metainfo;
    });

    await this.tokenRepository.updateTokenMetainfos(accountId, changedTokenMetainfos);
    return true;
  }

  public async deleteAccountTokenMetainfos(accountId: string): Promise<boolean> {
    await this.tokenRepository.deleteTokenMetainfos(accountId);
    return true;
  }

  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.fetchGRC721Collections();
  }

  public async fetchGRC721Collection(packagePath: string): Promise<GRC721CollectionModel> {
    return this.tokenRepository.fetchGRC721CollectionByPackagePath(packagePath);
  }

  public async fetchGRC721TokenUri(packagePath: string, tokenId: string): Promise<string> {
    return this.tokenRepository.fetchGRC721TokenUriBy(packagePath, tokenId);
  }

  public async fetchGRC721Balance(packagePath: string, address: string): Promise<number> {
    return this.tokenRepository.fetchGRC721BalanceBy(packagePath, address);
  }

  public async fetchGRC721Tokens(packagePath: string, address: string): Promise<GRC721Model[]> {
    return this.tokenRepository.fetchGRC721TokensBy(packagePath, address);
  }

  public async getAccountGRC721Collections(accountId: string): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.getAccountGRC721CollectionsByAccountId(accountId);
  }

  public async saveAccountGRC721Collections(
    accountId: string,
    collections: GRC721CollectionModel[],
  ): Promise<boolean> {
    return this.tokenRepository.saveAccountGRC721CollectionsBy(accountId, collections);
  }

  public async getAccountGRC721PinnedPackages(accountId: string): Promise<string[]> {
    return this.tokenRepository.getAccountGRC721PinnedPackagesByAccountId(accountId);
  }

  public async saveAccountGRC721PinnedPackages(
    accountId: string,
    packagePaths: string[],
  ): Promise<boolean> {
    return this.tokenRepository.saveAccountGRC721PinnedPackagesBy(accountId, packagePaths);
  }

  public clear = async (): Promise<boolean> => {
    await this.tokenRepository.deleteAllTokenMetainfo();
    return true;
  };

  private equalsToken(token1: TokenModel, token2: TokenModel): boolean {
    if (isNativeTokenModel(token1)) {
      return token1.symbol === token2.symbol;
    }
    if (isGRC20TokenModel(token1) && isGRC20TokenModel(token2)) {
      return token1.pkgPath === token2.pkgPath;
    }
    return false;
  }
}
