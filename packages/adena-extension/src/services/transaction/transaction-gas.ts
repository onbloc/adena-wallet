import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';
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
