import { AxiosError, AxiosInstance } from 'axios';
import { FaucetRequest } from '../common/request';
import FaucetApiResource from '@resources/faucet/faucet-api.json';
import { FaucetResponse } from '@repositories/common/response';

export class FaucetRepository {
  private networkInstance: AxiosInstance;

  private faucetApiMap: Record<string, string>;

  constructor(networkInstance: AxiosInstance) {
    this.networkInstance = networkInstance;
    this.faucetApiMap = { ...FaucetApiResource };
  }

  public existsFaucetApi(chainId: string): boolean {
    return !!(this.faucetApiMap && this.faucetApiMap[chainId]);
  }

  public findFaucetApiUrl(chainId: string): string | null {
    return this.faucetApiMap[chainId] || null;
  }

  public async postFaucet(requestUrl: string, request: FaucetRequest): Promise<FaucetResponse> {
    return this.networkInstance
      .post(requestUrl, {
        to: request.to,
        amount: request.amount,
      })
      .then((r) => {
        if (r?.data?.result) {
          return {
            success: true,
            message: 'Tokens successfully received!',
          };
        }
        return {
          success: false,
          message: 'Unexpected Error.',
        };
      })
      .catch((err) => {
        const success = false;
        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            return {
              success,
              message: err.response?.data,
            };
          }
        }
        return {
          success,
          message: 'Unexpected Error.',
        };
      });
  }
}
