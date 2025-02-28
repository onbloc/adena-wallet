import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';
import { GasPriceTierInfo } from '@types';

export interface ITransactionGasService {
  getGasPrice: (denomination: string) => Promise<GasPriceTierInfo | null>;
  simulateTx(tx: Tx): Promise<ResponseDeliverTx>;
  estimateGas(tx: Tx): Promise<number>;
}
