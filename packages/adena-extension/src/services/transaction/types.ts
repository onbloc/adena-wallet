import { Tx } from '@gnolang/tm2-js-client';
import { GasPriceTierInfo } from '@types';

export interface ITransactionGasService {
  getGasPrice: (denomination: string) => Promise<GasPriceTierInfo | null>;
  estimateGas(tx: Tx): Promise<number>;
}
