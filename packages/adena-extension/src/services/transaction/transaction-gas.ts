import { Tx } from '@gnolang/tm2-js-client';
import { ResponseDeliverTx } from '@gnolang/tm2-js-client/bin/proto/tm2/abci';
import { ITransactionGasRepository } from '@repositories/transaction/types';
import { ITransactionGasService } from '..';

export class TransactionGasService implements ITransactionGasService {
  private gasRepository: ITransactionGasRepository;

  constructor(gasRepository: ITransactionGasRepository) {
    this.gasRepository = gasRepository;
  }

  public async getGasPrice(): Promise<number | null> {
    return this.gasRepository.fetchGasPrices();
  }

  public async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    return this.gasRepository.simulateTx(tx);
  }

  public async estimateGas(tx: Tx): Promise<number> {
    return this.gasRepository.estimateGasByTx(tx);
  }
}
