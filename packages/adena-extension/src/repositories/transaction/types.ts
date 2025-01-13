import { Tx } from '@gnolang/tm2-js-client';
import { TransactionGasResponse } from './response/transaction-gas-response';

export interface ITransactionGasRepository {
  fetchGasPrices: () => Promise<TransactionGasResponse[]>;
  estimateGasByTx: (tx: Tx) => Promise<number>;
}
