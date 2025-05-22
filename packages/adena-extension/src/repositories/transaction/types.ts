import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';

export interface ITransactionGasRepository {
  fetchGasPrices: () => Promise<number | null>;
  simulateTx: (tx: Tx) => Promise<ResponseDeliverTx>;
  estimateGasByTx: (tx: Tx) => Promise<number>;
}
