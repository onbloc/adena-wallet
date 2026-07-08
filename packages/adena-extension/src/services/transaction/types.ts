import { ResponseDeliverTx, Tx } from '@gnolang/tm2-js-client';

export interface SessionMetadata {
  masterAddress: string;
  chainId: string;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number;
  spendUsed?: string;
  spendReset?: number;
  expiresAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: number;
  txHash?: string;
}

export interface ITransactionGasService {
  getGasPrice: () => Promise<number | null>;
  simulateTx(tx: Tx): Promise<ResponseDeliverTx>;
  estimateGas(tx: Tx): Promise<number>;
}
