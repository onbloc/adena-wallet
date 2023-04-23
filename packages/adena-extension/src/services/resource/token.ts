import { TokenRepository } from '@repositories/common';

export class TokenService {
  private tokenRepository: TokenRepository;

  constructor(tokenRepository: TokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  public fetchTokenMetainfos = async () => {
    return this.tokenRepository.fetchTokenMetainfos();
  };

  public getAppInfos = async () => {
    const response = await this.tokenRepository.fetchAppInfos();
    return response;
  };
}
