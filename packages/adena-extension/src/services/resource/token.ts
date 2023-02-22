import { TokenRepository } from "@repositories/common";


export class TokenService {

  private tokenRepository: TokenRepository;

  constructor(tokenRepository: TokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  public getTokenConfigs = async () => {
    const response = await this.tokenRepository.fetchTokenConfigs();;
    return response;
  };

  public getAppInfos = async () => {
    const response = await this.tokenRepository.fetchAppInfos();;
    return response;
  };

}
