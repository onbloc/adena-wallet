import { AxiosInstance } from 'axios';
import { TransactionHistoryResponse } from './response/transaction-history-response';
import { TransactionHistoryMapper } from './mapper/transaction-history-mapper';
import { NetworkMetainfo } from '@states/network';

export class TransactionHistoryRepository {
  private axiosInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
    this.networkMetainfo = null;
  }

  private getAPIUrl() {
    if (this.networkMetainfo === null || this.networkMetainfo.apiUrl === '') {
      return null;
    }
    return `${this.networkMetainfo.apiUrl}/${this.networkMetainfo.networkId}`;
  }

  public setNetworkMetainfo(networkMetaion: NetworkMetainfo) {
    this.networkMetainfo = networkMetaion;
  }

  public async fetchAllTransactionHistoryBy(address: string, from: number, size?: number) {
    const apiUri = this.getAPIUrl();
    if (!apiUri) {
      return {
        hits: 0,
        next: false,
        txs: [],
      };
    }

    const requestUri = `${apiUri}/multi_history/${address}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        from,
        size: size || 20,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }

  public async fetchNativeTransactionHistoryBy(address: string, from: number, size?: number) {
    const apiUri = this.getAPIUrl();
    if (!apiUri) {
      return {
        hits: 0,
        next: false,
        txs: [],
      };
    }
    const requestUri = `${apiUri}/native-token-history/${address}`;
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
    const apiUri = this.getAPIUrl();
    if (!apiUri) {
      return {
        hits: 0,
        next: false,
        txs: [],
      };
    }
    const requestUri = `${apiUri}/grc20-token-history/${address}/${packagePath}`;
    const response = await this.axiosInstance.get<TransactionHistoryResponse>(requestUri, {
      params: {
        from,
        size: size || 20,
      },
    });
    return TransactionHistoryMapper.fromResposne(response.data);
  }
}
