import {
  Tx,
} from '@gnolang/tm2-js-client';
import {
  ResponseDeliverTx,
} from '@gnolang/tm2-js-client';

export interface ITransactionGasService {
  getGasPrice: () => Promise<number | null>
  simulateTx(tx: Tx): Promise<ResponseDeliverTx>
  estimateGas(tx: Tx): Promise<bigint>
}
