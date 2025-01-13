import { parseReamPathItemsByPath } from '@common/utils/parse-utils';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { AppInfoResponse } from '@repositories/common/response';
import { ITokenRepository } from '@repositories/common/types';

import {
  AccountTokenBalance,
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721MetadataModel,
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

  /**
   * Fetch token metainfos
   *
   * @returns
   */
  public async fetchTokenMetainfos(): Promise<TokenModel[]> {
    if (this.tokenMetaInfos.length > 0) {
      return this.tokenMetaInfos;
    }

    const tokenMetaInfos = await this.tokenRepository.fetchTokenMetainfos();
    this.tokenMetaInfos = tokenMetaInfos;
    return this.tokenMetaInfos;
  }

  /**
   * Fetch GRC20 tokens
   *
   * @returns
   */
  public async fetchGRC20Tokens(): Promise<GRC20TokenModel[]> {
    return this.tokenRepository
      .fetchAllGRC20Tokens()
      .then((tokens) => tokens.filter((token) => !!token));
  }

  /**
   * Fetch GRC20 token
   *
   * @param tokenPath
   * @returns
   */
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

  /**
   * Fetch GRC20 token balance
   *
   * @param address
   * @returns
   */
  public async fetchAllTransferPackagesBy(address: string): Promise<string[]> {
    const transferPackages = await this.tokenRepository.fetchAllTransferPackagesBy(address, 1);
    return transferPackages;
  }

  /**
   * Fetch Apps information
   *
   * @returns
   */
  public async getAppInfos(): Promise<AppInfoResponse[]> {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  }

  /**
   * Initialize account token meta infos
   *
   * @param accountId
   * @returns
   */
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

  /**
   * Get token metainfos by account id
   *
   * @param accountId
   * @returns
   */
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

  /**
   * Update token metainfos by account id
   *
   * @param accountId
   * @param tokenMetainfos
   * @returns
   */
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

  /**
   * Update account token metainfos
   *
   * @param accountTokenMetainfos
   * @returns
   */
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

  /**
   * Change account token metainfo display
   *
   * @param accountId
   * @param tokenId
   * @param display
   * @returns
   */
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

  /**
   * Delete account token metainfos
   *
   * @param accountId
   * @returns
   */
  public async deleteAccountTokenMetainfos(accountId: string): Promise<boolean> {
    await this.tokenRepository.deleteTokenMetainfos(accountId);
    return true;
  }

  /**
   * Fetch GRC721 collections
   *
   * @returns
   */
  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.fetchGRC721Collections();
  }

  /**
   * Fetch GRC721 collection
   *
   * @param packagePath
   * @returns
   */
  public async fetchGRC721Collection(packagePath: string): Promise<GRC721CollectionModel> {
    return this.tokenRepository.fetchGRC721CollectionByPackagePath(packagePath);
  }

  /**
   * Fetch GRC721 token uri
   *
   * @param packagePath
   * @param tokenId
   * @returns
   */
  public async fetchGRC721TokenUri(packagePath: string, tokenId: string): Promise<string> {
    return this.tokenRepository.fetchGRC721TokenUriBy(packagePath, tokenId);
  }

  /**
   * Fetch GRC721 token metadata
   *
   * @param packagePath
   * @param tokenId
   * @returns
   */
  public async fetchGRC721TokenMetadata(
    packagePath: string,
    tokenId: string,
  ): Promise<GRC721MetadataModel> {
    return this.tokenRepository.fetchGRC721TokenMetadataBy(packagePath, tokenId);
  }

  /**
   * Fetch GRC721 token balance
   *
   * @param packagePath
   * @param address
   * @returns
   */
  public async fetchGRC721Balance(packagePath: string, address: string): Promise<number> {
    return this.tokenRepository.fetchGRC721BalanceBy(packagePath, address);
  }

  /**
   * Fetch GRC721 tokens
   *
   * @param packagePath
   * @param address
   * @returns
   */
  public async fetchGRC721Tokens(packagePath: string, address: string): Promise<GRC721Model[]> {
    return this.tokenRepository.fetchGRC721TokensBy(packagePath, address);
  }

  /**
   * Fetch account GRC721 collections
   *
   * @param accountId
   * @param networkId
   * @returns
   */
  public async getAccountGRC721Collections(
    accountId: string,
    networkId: string,
  ): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.getAccountGRC721CollectionsBy(accountId, networkId);
  }

  /**
   * Save account GRC721 collections
   *
   * @param accountId
   * @param networkId
   * @param collections
   * @returns
   */
  public async saveAccountGRC721Collections(
    accountId: string,
    networkId: string,
    collections: GRC721CollectionModel[],
  ): Promise<boolean> {
    return this.tokenRepository.saveAccountGRC721CollectionsBy(accountId, networkId, collections);
  }

  /**
   * Get account GRC721 pinned packages
   *
   * @param accountId
   * @param networkId
   * @returns
   */
  public async getAccountGRC721PinnedPackages(
    accountId: string,
    networkId: string,
  ): Promise<string[]> {
    return this.tokenRepository.getAccountGRC721PinnedPackagesBy(accountId, networkId);
  }

  /**
   * Save account GRC721 pinned packages
   *
   * @param accountId
   * @param networkId
   * @param packagePaths
   * @returns
   */
  public async saveAccountGRC721PinnedPackages(
    accountId: string,
    networkId: string,
    packagePaths: string[],
  ): Promise<boolean> {
    return this.tokenRepository.saveAccountGRC721PinnedPackagesBy(
      accountId,
      networkId,
      packagePaths,
    );
  }

  /**
   * Clear token metainfos
   *
   * @returns
   */
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
