import { Tx } from '@gnolang/tm2-js-client';
import { ITransactionGasRepository } from '@repositories/transaction/types';
import { GasPriceTierInfo } from '@types';
import { ITransactionGasService } from '..';

export class TransactionGasService implements ITransactionGasService {
  private gasRepository: ITransactionGasRepository;

  constructor(gasRepository: ITransactionGasRepository) {
    this.gasRepository = gasRepository;
  }

  public async getGasPrice(denomination: string): Promise<GasPriceTierInfo | null> {
    const gasPrices = await this.gasRepository.fetchGasPrices();

    const gasPrice = gasPrices.find((gasPrice) => gasPrice.denom === denomination);
    if (!gasPrice) {
      return null;
    }

    return gasPrice;
  }

  public async estimateGas(tx: Tx): Promise<number> {
    return this.gasRepository.estimateGasByTx(tx);
  }
}
