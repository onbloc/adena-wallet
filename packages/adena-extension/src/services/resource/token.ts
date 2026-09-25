import { parseTokenIdentifier } from '@common/utils/grc20-token-path';
import { parseReamPathItemsByPath } from '@common/utils/parse-utils';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { AppInfoResponse } from '@repositories/common/response';
import { ITokenRepository } from '@repositories/common/types';

import {
  AccountTokenBalance,
  GRC20TokenModel,
  Grc20RouteMap,
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
   * GRC20 `routes` for the current network, keyed by registry key. Not cached
   * here; the caller caches it.
   */
  public async fetchGrc20Routes(): Promise<Grc20RouteMap> {
    return this.tokenRepository.fetchGrc20Routes();
  }

  /**
   * Fetch GRC20 tokens
   *
   * @returns
   */
  public async fetchGRC20Tokens(): Promise<GRC20TokenModel[]> {
    const [tokens, resourceTokens] = await Promise.all([
      this.tokenRepository.fetchAllGRC20Tokens(),
      this.fetchResourceTokenMetainfos(),
    ]);

    return tokens
      .filter((token) => !!token)
      .map((token) => this.overlayResourceMetainfo(token, resourceTokens));
  }

  /**
   * Fetch a single page of GRC20 tokens from the on-chain registry, with the
   * registry's total size for pagination.
   */
  public async fetchGRC20TokensPaged(params: {
    offset: number;
    limit: number;
  }): Promise<{ items: GRC20TokenModel[]; totalCount: number }> {
    const [page, resourceTokens] = await Promise.all([
      this.tokenRepository.fetchGRC20Tokens(params),
      this.fetchResourceTokenMetainfos(),
    ]);

    return {
      ...page,
      items: page.items.map((token) => this.overlayResourceMetainfo(token, resourceTokens)),
    };
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

    // Require a full token key `{packagePath}.{symbol}` (the legacy colon form
    // `{packagePath}:{symbol}` is also accepted). A bare packagePath (no
    // symbol) is rejected; grc20reg is always queried by the token key.
    const parsed = parseTokenIdentifier(tokenPath);
    if (!parsed) {
      return null;
    }

    // Validate the realm (packagePath) component.
    try {
      parseReamPathItemsByPath(parsed.packagePath);
    } catch {
      return null;
    }

    const [token, resourceTokens] = await Promise.all([
      this.tokenRepository.fetchGRC20TokenByPackagePath(tokenPath).catch(() => null),
      this.fetchResourceTokenMetainfos(),
    ]);

    return token ? this.overlayResourceMetainfo(token, resourceTokens) : null;
  }

  /**
   * GRC20 token paths the account has transferred, derived from indexer Transfer
   * events (token id parsed to the token path). Used by the indexer fallback to
   * match held GRC20 tokens precisely per symbol.
   */
  public async fetchAllTransferGRC20TokenPathsBy(address: string): Promise<string[]> {
    return this.tokenRepository.fetchAllTransferGRC20TokenPathsBy(address);
  }

  /**
   * GRC20 tokens the account holds, mapped from the API account-assets endpoint
   * (tokenId = token path). Returns null when the network has no API URL.
   */
  public async fetchAccountGRC20Tokens(address: string): Promise<GRC20TokenModel[] | null> {
    const [tokens, resourceTokens] = await Promise.all([
      this.tokenRepository.fetchAccountGRC20Tokens(address),
      this.fetchResourceTokenMetainfos(),
    ]);

    return tokens?.map((token) => this.overlayResourceMetainfo(token, resourceTokens)) ?? null;
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
   * Get token metainfos by account id, with the gno-token-resource document
   * laid over each stored token.
   *
   * @param accountId
   * @returns
   */
  public async getTokenMetainfosByAccountId(accountId: string): Promise<TokenModel[]> {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    const resourceTokenMetainfos = await this.fetchResourceTokenMetainfos();

    return storedTokenMetainfos.map((token) =>
      this.overlayResourceMetainfo(token, resourceTokenMetainfos),
    );
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
    const resourceTokenMetainfos = await this.fetchResourceTokenMetainfos();
    const changedTokenMetaInfos = tokenMetainfos.map((token) =>
      this.overlayResourceMetainfo(token, resourceTokenMetainfos),
    );
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
   * Fetch every GRC721 collection on the chain
   *
   * @returns
   */
  public async fetchGRC721Collections(): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.fetchGRC721Collections();
  }

  /**
   * Fetch the GRC721 collections an account currently holds a token of
   *
   * @param address
   * @returns
   */
  public async fetchAccountGRC721Collections(address: string): Promise<GRC721CollectionModel[]> {
    return this.tokenRepository.fetchAccountGRC721CollectionsBy(address);
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
   * Clear token metainfos and the GRC721 indexer cursors
   *
   * @returns
   */
  public clear = async (): Promise<boolean> => {
    await this.tokenRepository.deleteAllTokenMetainfo();
    await this.tokenRepository.deleteGRC721SyncCache();
    return true;
  };

  /**
   * The gno-token-resource documents for the current network, or whatever was
   * last read when the fetch fails. A curated list the wallet could not reach is
   * a missing overlay, not a reason for a screen that only wanted its stored
   * tokens to fail.
   */
  private async fetchResourceTokenMetainfos(): Promise<TokenModel[]> {
    return this.fetchTokenMetainfos().catch(() => this.tokenMetaInfos);
  }

  /**
   * One stored token with its gno-token-resource document laid over it.
   *
   * Two sources describe the same token: the curated gno-token-resource
   * documents, and the contract data discovery read off chain or from the API.
   * The resource wins field by field — it carries the display name, logo and
   * copy a user recognises, while a realm is free to publish anything — and
   * contract data fills in every field the resource leaves empty, so a token
   * with no document at all keeps exactly what the chain says about it.
   *
   * The match is scoped to the network the document describes. The documents
   * are fetched per network, while the account's stored tokens span every
   * network it has held one on, and {@link equalsToken} compares a denom or a
   * token key — both of which testnets share with mainnet. Without the network
   * in the match, a mainnet document would describe a staging token of the same
   * identity, and the update path would then persist that over it.
   */
  private overlayResourceMetainfo<T extends TokenModel>(token: T, resourceTokens: TokenModel[]): T {
    const resource = resourceTokens.find(
      (candidate) => candidate.networkId === token.networkId && this.equalsToken(token, candidate),
    );
    if (!resource) {
      return token;
    }

    return {
      ...token,
      name: resource.name || token.name,
      symbol: resource.symbol || token.symbol,
      /**
       * `decimals` follows the same priority as the rest, and it is the field
       * that priority exists for: wugnot is the one token whose curated decimals
       * differ from what its contract reports, and the resource is what says how
       * many places the wallet should read the balance in.
       *
       * Only a number overrides — a document that omits the field decodes as
       * undefined, and reading that as 0 would shift every balance it touches.
       */
      decimals: typeof resource.decimals === 'number' ? resource.decimals : token.decimals,
      description: resource.description || token.description,
      websiteUrl: resource.websiteUrl || token.websiteUrl,
      image: resource.image || token.image,
    };
  }

  private equalsToken(token1: TokenModel, token2: TokenModel): boolean {
    if (isNativeTokenModel(token1)) {
      return token1.symbol === token2.symbol;
    }
    if (isGRC20TokenModel(token1) && isGRC20TokenModel(token2)) {
      // GRC20 identity is the token key `{packagePath}.{symbol}`, carried in
      // tokenId. Two tokens from the same realm but different symbols must not
      // collapse into one, so compare tokenId rather than pkgPath.
      return token1.tokenId === token2.tokenId;
    }
    return false;
  }
}
