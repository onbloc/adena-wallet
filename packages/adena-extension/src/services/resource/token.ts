import { TokenRepository } from '@repositories/common';
import { AccountTokenBalance } from '@states/balance';

export class TokenService {
  private tokenRepository: TokenRepository;

  constructor(tokenRepository: TokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  public async fetchTokenMetainfos() {
    return this.tokenRepository.fetchTokenMetainfos();
  }

  public async getAppInfos() {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  }

  public async initAccountTokenMetainfos(accountId: string) {
    const fetchedTokenMetainfos = await this.fetchTokenMetainfos();
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    const addedTokenMetainfos = fetchedTokenMetainfos.filter((metainfo) =>
      storedTokenMetainfos.find(
        (storedMetainfo) =>
          storedMetainfo.chainId === metainfo.chainId &&
          storedMetainfo.networkId === metainfo.networkId &&
          storedMetainfo.tokenId === metainfo.tokenId,
      ),
    );
    this.tokenRepository.updateTokenMetainfos(accountId, [
      ...storedTokenMetainfos,
      ...addedTokenMetainfos,
    ]);
    return;
  }

  public async getAccountTokenMetainfos(accountId: string) {
    const storedTokenMetainfos = await this.tokenRepository.getAccountTokenMetainfos(accountId);
    return storedTokenMetainfos;
  }

  public async updateAccountTokenMetainfos(accountTokenMetainfos: AccountTokenBalance[]) {
    await Promise.all(
      accountTokenMetainfos.map((accountTokenMetainfo) =>
        this.tokenRepository.updateTokenMetainfos(
          accountTokenMetainfo.accountId,
          accountTokenMetainfo.tokenBalances,
        ),
      ),
    );
    return true;
  }

  public async changeAccountTokenMetainfoDisplay(
    accountId: string,
    tokenId: string,
    display: boolean,
  ) {
    const storedTokenMetainfos = await this.getAccountTokenMetainfos(accountId);
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
