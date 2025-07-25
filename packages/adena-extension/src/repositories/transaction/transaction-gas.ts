import { GnoProvider } from '@common/provider/gno/gno-provider';
import { Tx } from '@gnolang/tm2-js-client';
import { ResponseDeliverTx } from '@gnolang/tm2-js-client/bin/proto/tm2/abci';
import { NetworkMetainfo } from '@types';
import { AxiosInstance } from 'axios';
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

  public async fetchGasPrices(): Promise<number | null> {
    if (!this.gnoProvider) {
      return null;
    }

    const gasPrice = await this.gnoProvider.getGasPrice();
    if (!gasPrice) {
      return null;
    }

    return gasPrice;
  }

  public async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    if (!this.gnoProvider) {
      throw new Error('GnoProvider is not initialized');
    }

    return this.gnoProvider.simulateTx(tx);
  }

  public async estimateGasByTx(tx: Tx): Promise<number> {
    if (!this.gnoProvider) {
      throw new Error('GnoProvider is not initialized');
    }

    const simulateResult = await this.gnoProvider.simulateTx(tx);
    return simulateResult.gas_used.toNumber();
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
