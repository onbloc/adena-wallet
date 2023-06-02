import { AxiosInstance } from 'axios';
import { TransactionHistoryResponse } from './response/transaction-history-response';
import { TransactionHistoryMapper } from './mapper/transaction-history-mapper';

export class TransactionHistoryRepository {
  private static ADENA_API_URI = 'https://api.adena.app';

  private axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  public async fetchAllTransactionHistoryBy(address: string, from: number, size?: number) {
    const requestUri = `${TransactionHistoryRepository.ADENA_API_URI}/test3/multi_history/${address}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        from,
        size: size || 20,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }

  public async fetchNativeTransactionHistoryBy(address: string, from: number, size?: number) {
    const requestUri = `${TransactionHistoryRepository.ADENA_API_URI}/test3/native-token-history/${address}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        from,
        size: size || 20,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }

  public async fetchGRC20TransactionHistoryBy(
    address: string,
    packagePath: string,
    from: number,
    size?: number,
  ) {
    const requestUri = `${TransactionHistoryRepository.ADENA_API_URI}/test3/grc20-token-history/${address}/${packagePath}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        from,
        size: size || 20,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }
}
