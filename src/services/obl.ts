import { AxiosInstance } from 'axios';
import { BalanceResponse, BaseAccount, TxResponse, Coin, BankHistory } from './types';

export class OblClient {
  constructor(private instance: AxiosInstance) {}

  async getHistory(address: string): Promise<object[]> {
    const res = await this.instance.get(`/history2/all/${address}`);
    // const res = await this.instance.get(`/history2/transfer/${address}`);

    return res.data;
  }
}
