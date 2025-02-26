import { GnoProvider } from '@common/provider/gno/gno-provider';
import { makeIndexerRPCRequest } from '@common/utils/fetch-utils';
import { Tx } from '@gnolang/tm2-js-client';
import { NetworkMetainfo } from '@types';
import { AxiosInstance } from 'axios';
import { TransactionGasResponse } from './response/transaction-gas-response';
import { ITransactionGasRepository } from './types';

export class TransactionGasRepository implements ITransactionGasRepository {
  private gnoProvider: GnoProvider | null;
  private networkInstance: AxiosInstance;
  private networkMetainfo: NetworkMetainfo | null;

  constructor(
    gnoProvider: GnoProvider | null,
    networkInstance: AxiosInstance,
    networkMetainfo: NetworkMetainfo | null,
  ) {
    this.gnoProvider = gnoProvider;
    this.networkInstance = networkInstance;
    this.networkMetainfo = networkMetainfo;
  }

  private get indexerUrl(): string | null {
    if (!this.networkMetainfo) {
      return null;
    }

    return this.networkMetainfo.indexerUrl || null;
  }

  public async fetchGasPrices(): Promise<TransactionGasResponse[]> {
    if (!this.indexerUrl) {
      throw new Error('Not supported network');
    }

    const response = await TransactionGasRepository.postRPCRequest<{
      result: TransactionGasResponse[];
    }>(
      this.networkInstance,
      this.indexerUrl,
      makeIndexerRPCRequest({
        method: 'getGasPrice',
      }),
    ).then((data) => data?.result || []);

    return response;
  }

  public async estimateGasByTx(tx: Tx): Promise<number> {
    if (!this.gnoProvider) {
      throw new Error('GnoProvider is not initialized');
    }

    return this.gnoProvider.estimateGas(tx);
  }

  private static postRPCRequest = <T = any>(
    networkInstance: AxiosInstance,
    url: string,
    data: any,
  ): Promise<T | null> => {
    return networkInstance
      .post<T>(url, data)
      .then((response) => response.data)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };
}
