import { toRegistryKey } from '@common/utils/grc20-token-path';
import { NetworkMetainfo, TransactionWithPageInfo } from '@types';
import { AxiosInstance } from 'axios';
import { TransactionHistoryMapper } from './mapper/transaction-history-mapper';
import { TransactionHistoryResponse } from './response/transaction-history-response';
import { ITransactionHistoryRepository } from './types';

export class TransactionHistoryApiRepository implements ITransactionHistoryRepository {
  private axiosInstance: AxiosInstance;
  private network: NetworkMetainfo;

  constructor(axiosInstance: AxiosInstance, network: NetworkMetainfo) {
    this.axiosInstance = axiosInstance;
    this.network = network;
  }

  public get type(): 'api' {
    return 'api';
  }

  public get apiUrl(): string | null {
    return this.network.apiUrl ?? null;
  }

  public async fetchAllTransactionHistoryBy(
    address: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    const path = `${this.apiUrl}/v1/accounts/${address}/transactions`;
    const paramsString = cursor ? `?cursor=${cursor}` : '';

    return TransactionHistoryApiRepository.fetch<TransactionHistoryResponse>(
      this.axiosInstance,
      path + paramsString,
    ).then((result) => {
      return TransactionHistoryMapper.fromResponse(result, address);
    });
  }

  public async fetchNativeTransactionHistoryBy(
    address: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    const path = `${this.apiUrl}/v1/accounts/${address}/native-coin/transactions`;
    const paramsString = cursor ? `?cursor=${cursor}` : '';

    return TransactionHistoryApiRepository.fetch<TransactionHistoryResponse>(
      this.axiosInstance,
      path + paramsString,
    ).then((result) => {
      return TransactionHistoryMapper.fromResponse(result, address);
    });
  }

  public async fetchGRC20TransactionHistoryBy(
    address: string,
    tokenPath: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    // The endpoint is keyed by the full token key `{packagePath}.{symbol}`
    // (the same identity the API returns as tokenId/tokenKey); fall back to the
    // raw input for a legacy bare packagePath.
    const tokenKey = toRegistryKey(tokenPath) ?? tokenPath;
    const encodedTokenKey = encodeURIComponent(tokenKey);
    const path = `${this.apiUrl}/v1/accounts/${address}/grc20-token/${encodedTokenKey}/transactions`;
    const paramsString = cursor ? `?cursor=${cursor}` : '';

    return TransactionHistoryApiRepository.fetch<TransactionHistoryResponse>(
      this.axiosInstance,
      path + paramsString,
    ).then((result) => {
      return TransactionHistoryMapper.fromResponse(result, address);
    });
  }

  private static fetch<T>(axiosInstance: AxiosInstance, path: string): Promise<T | null> {
    return axiosInstance.get<any>(path).then((result) => {
      const resultData = result.data?.data;
      if (!resultData) {
        return null;
      }

      return resultData;
    });
  }
}
