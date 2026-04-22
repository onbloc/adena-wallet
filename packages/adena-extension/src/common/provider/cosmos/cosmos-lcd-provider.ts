import axios, { AxiosInstance } from 'axios';

export class CosmosLcdProvider {
  private axiosInstance: AxiosInstance;

  constructor(private baseUrl: string) {
    if (!baseUrl) {
      console.warn('CosmosLcdProvider: empty baseUrl — all queries will fail');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.axiosInstance = axios.create({ timeout: 10_000 });
  }

  async getAllBalances(address: string): Promise<{ denom: string; amount: string }[] | null> {
    try {
      const response = await this.axiosInstance.get<{ balances: { denom: string; amount: string }[] }>(
        `${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}`,
      );
      return response.data.balances ?? [];
    } catch {
      return null;
    }
  }

  async getBalance(address: string, denom: string): Promise<string | null> {
    try {
      const response = await this.axiosInstance.get<{ balance: { denom: string; amount: string } }>(
        `${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}/by_denom`,
        { params: { denom } },
      );
      return response.data.balance?.amount ?? '0';
    } catch {
      return null;
    }
  }

  // Reserved for Part 7: dynamically update endpoint when user switches AtomOne network
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }
}
