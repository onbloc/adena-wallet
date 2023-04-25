import { TokenRepository } from '@repositories/common';
import { AccountTokenBalance } from '@states/balance';
import { TokenMetainfo } from '@states/token';

export class TokenService {
  private tokenRepository: TokenRepository;

  constructor(tokenRepository: TokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  public async fetchTokenMetainfos() {
    return this.tokenRepository.fetchTokenMetainfos();
  }

  public async fetchGRC20Tokens(keyword: string) {
    return this.tokenRepository.fetchGRC20TokensBy(keyword);
  }

  public async getAppInfos() {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  }

  public async initAccountTokenMetainfos(accountId: string) {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    if (storedTokenMetainfos.length === 0) {
      const fetchedTokenMetainfos = await this.fetchTokenMetainfos();
      await this.tokenRepository.updateTokenMetainfos(accountId, fetchedTokenMetainfos);
    }
    return true;
  }

  public async getTokenMetainfosByAccountId(accountId: string) {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    return storedTokenMetainfos;
  }

  public async updateTokenMetainfosByAccountId(accountId: string, tokenMetainfos: TokenMetainfo[]) {
    await this.tokenRepository.updateTokenMetainfos(accountId, tokenMetainfos);
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
}
