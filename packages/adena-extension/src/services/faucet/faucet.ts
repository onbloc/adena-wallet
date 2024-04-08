import { FaucetResponse } from '@repositories/common/response';
import { FaucetRepository } from '@repositories/faucet/faucet';

export class FaucetService {
  private faucetRepository: FaucetRepository;

  constructor(faucetRepository: FaucetRepository) {
    this.faucetRepository = faucetRepository;
  }

  public availFaucet(chainId: string): boolean {
    return this.faucetRepository.existsFaucetApi(chainId);
  }

  public async faucet(chainId: string, to: string, amount: string): Promise<FaucetResponse> {
    const apiUrl = this.getFaucetApiUrl(chainId);
    return this.faucetRepository.postFaucet(apiUrl, {
      to,
      amount,
    });
  }

  public getFaucetApiUrl(chainId: string): string {
    const apiUrl = this.faucetRepository.findFaucetApiUrl(chainId);
    if (!apiUrl) {
      throw new Error('This chain does not support Faucet');
    }
    return apiUrl;
  }
}
