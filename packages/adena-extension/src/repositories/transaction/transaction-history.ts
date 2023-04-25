import { AxiosInstance } from 'axios';
import { TransactionHistoryResponse } from './response/transaction-history-response';
import { TransactionHistoryMapper } from './mapper/transaction-history-mapper';

const ADENA_API_URI = 'https://dev-api.adena.app';

export class TransactionHistoryRepository {
  private axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  public async fetchAllTransactionHistoryBy(address: string, page: number, from: number) {
    const requestUri = ADENA_API_URI + `/test3/multi_history/${address}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        page,
        from,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }

  public async fetchGRC20TransactionHistoryBy(address: string, page: number, from: number) {
    const requestUri = ADENA_API_URI + `/test3/multi_history/${address}`;
    const response = await this.axiosInstance.get(requestUri, {
      params: {
        page,
        from,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }
}
