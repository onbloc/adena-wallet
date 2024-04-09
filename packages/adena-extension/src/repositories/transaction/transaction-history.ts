import { AxiosInstance } from 'axios';
import { TransactionHistoryResponse } from './response/transaction-history-response';
import { TransactionHistoryMapper } from './mapper/transaction-history-mapper';
import { NetworkMetainfo, TransactionInfo } from '@types';

export class TransactionHistoryRepository {
  private axiosInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  constructor(axiosInstance: AxiosInstance, networkMetainfo: NetworkMetainfo | null) {
    this.axiosInstance = axiosInstance;
    this.networkMetainfo = networkMetainfo;
  }

  private getAPIUrl(): string | null {
    if (this.networkMetainfo === null || this.networkMetainfo.apiUrl === '') {
      return null;
    }
    return `${this.networkMetainfo.apiUrl}/${this.networkMetainfo.networkId}`;
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo): void {
    this.networkMetainfo = networkMetainfo;
  }

  public async fetchAllTransactionHistoryBy(
    address: string,
    from: number,
    size?: number,
  ): Promise<{ hits: number; next: boolean; txs: TransactionInfo[] }> {
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
    return TransactionHistoryMapper.fromResponse(response.data);
  }

  public async fetchNativeTransactionHistoryBy(
    address: string,
    from: number,
    size?: number,
  ): Promise<{ hits: number; next: boolean; txs: TransactionInfo[] }> {
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
    return TransactionHistoryMapper.fromResponse(response.data);
  }

  public async fetchGRC20TransactionHistoryBy(
    address: string,
    packagePath: string,
    from: number,
    size?: number,
  ): Promise<{ hits: number; next: boolean; txs: TransactionInfo[] }> {
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
    return TransactionHistoryMapper.fromResponse(response.data);
  }
}
