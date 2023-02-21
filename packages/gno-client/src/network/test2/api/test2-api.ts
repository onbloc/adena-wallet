import { QueryType } from '../../../api';
import { Test2Response } from '.';

export interface Test2Api {
  getHealth: () => Promise<boolean>;

  getNetwrokInfo: () => Promise<Test2Response.Status>;

  getGenesis: () => Promise<Test2Response.Genesis>;

  getBlocks: (minHeight: number, maxHeight: number) => Promise<Test2Response.Blocks>;

  getBlock: (height: number) => Promise<any>;

  getBlockResults: (height: number) => Promise<any>;

  getBlockCommit: (height: number) => Promise<any>;

  getValidators: () => Promise<any>;

  getConsensusState: () => Promise<any>;

  getConsensusParams: (height: number) => Promise<any>;

  getUnconfirmedTxs: () => Promise<any>;

  getNumUnconfirmedTxs: () => Promise<any>;

  getAbciInfo: () => Promise<any>;

  broadcastTxCommit: (tx: string) => Promise<Test2Response.BroadcastTxCommit>;

  broadcastTxSync: (tx: string) => Promise<Test2Response.BroadcastTxSync>;

  broadcastTxAsync: (tx: string) => Promise<Test2Response.BroadcastTxAsync>;

  executeAbciQuery: (
    queryType: QueryType,
    request: {
      query?: { [key in string]: string };
      data?: Array<string>
    }
  ) => Promise<Test2Response.AbciQuery>;

  getTransactionHistory: (address: string, page: number) => Promise<Test2Response.History>;
}
