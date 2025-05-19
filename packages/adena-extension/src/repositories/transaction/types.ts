import { ResponseDeliverTx } from '@common/provider/gno/proto/tm2/abci';
import { Tx } from '@gnolang/tm2-js-client';
import { TransactionWithPageInfo } from '@types';
import { TransactionGasResponse } from './response/transaction-gas-response';

export interface ITransactionGasRepository {
  fetchGasPrices: () => Promise<TransactionGasResponse[]>;
  simulateTx: (tx: Tx) => Promise<ResponseDeliverTx>;
  estimateGasByTx: (tx: Tx) => Promise<number>;
}

export interface ITransactionHistoryRepository {
  type: 'api' | 'indexer' | 'none';
  fetchAllTransactionHistoryBy: (
    address: string,
    cursor?: string | null,
  ) => Promise<TransactionWithPageInfo>;
  fetchNativeTransactionHistoryBy: (
    address: string,
    cursor?: string | null,
  ) => Promise<TransactionWithPageInfo>;
  fetchGRC20TransactionHistoryBy: (
    address: string,
    packagePath: string,
    cursor?: string | null,
  ) => Promise<TransactionWithPageInfo>;
}

export interface ITransactionHistoryIndexerRepository extends ITransactionHistoryRepository {
  fetchBlockTimeByHeight: (height: number) => Promise<string | null>;
}
