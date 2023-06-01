import { TokenModel, isGRC20TokenModel, isNativeTokenModel } from '@models/token-model';
import { TokenRepository } from '@repositories/common';
import { AccountTokenBalance } from '@states/balance';

export class TokenService {
  private tokenRepository: TokenRepository;

  private tokenMetaInfos: TokenModel[];

  constructor(tokenRepository: TokenRepository) {
    this.tokenRepository = tokenRepository;
    this.tokenMetaInfos = [];
  }

  public getTokenMetainfos() {
    return this.tokenMetaInfos;
  }

  public async fetchTokenMetainfos() {
    if (this.tokenMetaInfos.length > 0) {
      return this.tokenMetaInfos;
    }
    const tokenMetaInfos = await this.tokenRepository.fetchTokenMetainfos();
    this.tokenMetaInfos = tokenMetaInfos;
    return this.tokenMetaInfos;
  }

  public async fetchGRC20Tokens(keyword: string, tokenInfos?: TokenModel[]) {
    return this.tokenRepository.fetchGRC20TokensBy(keyword, tokenInfos);
  }

  public async getAppInfos() {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  }

  public async initAccountTokenMetainfos(accountId: string) {
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

  public async getTokenMetainfosByAccountId(accountId: string) {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    return storedTokenMetainfos;
  }

  public async updateTokenMetainfosByAccountId(accountId: string, tokenMetainfos: TokenModel[]) {
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

  public async updateAccountTokenMetainfos(accountTokenMetainfos: AccountTokenBalance[]) {
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
  ) {
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

  public async deleteAccountTokenMetainfos(accountId: string) {
    await this.tokenRepository.deleteTokenMetainfos(accountId);
    return true;
  }

  public clear = async () => {
    await this.tokenRepository.deleteAllTokenMetainfo();
    return true;
  };

  private equalsToken(token1: TokenModel, token2: TokenModel) {
    if (isNativeTokenModel(token1)) {
      return token1.symbol === token2.symbol;
    }
    if (isGRC20TokenModel(token1) && isGRC20TokenModel(token2)) {
      return token1.pkgPath === token2.pkgPath;
    }
    return false;
  }
}
