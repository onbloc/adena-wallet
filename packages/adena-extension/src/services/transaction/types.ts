import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';

export interface ITransactionGasService {
  getGasPrice: () => Promise<number | null>;
  simulateTx(tx: Tx): Promise<ResponseDeliverTx>;
  estimateGas(tx: Tx): Promise<number>;
}
