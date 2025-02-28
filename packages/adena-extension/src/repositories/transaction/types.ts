import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';
import { TransactionGasResponse } from './response/transaction-gas-response';

export interface ITransactionGasRepository {
  fetchGasPrices: () => Promise<TransactionGasResponse[]>;
  simulateTx: (tx: Tx) => Promise<ResponseDeliverTx>;
  estimateGasByTx: (tx: Tx) => Promise<number>;
}
