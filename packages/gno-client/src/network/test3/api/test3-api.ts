import { Test3ApiAbciQueryType, Test3Response } from '.';

export interface Test3Api {
  getHealth: () => Promise<boolean>;

  getNetwrokInfo: () => Promise<Test3Response.Status>;

  getGenesis: () => Promise<Test3Response.Genesis>;

  getBlocks: (minHeight: number, maxHeight: number) => Promise<Test3Response.Blocks>;

  getBlock: (height: number) => Promise<any>;

  getBlockResults: (height: number) => Promise<any>;

  getBlockCommit: (height: number) => Promise<any>;

  getValidators: () => Promise<any>;

  getConsensusState: () => Promise<any>;

  getConsensusParams: (height: number) => Promise<any>;

  getUnconfirmedTxs: () => Promise<any>;

  getNumUnconfirmedTxs: () => Promise<any>;

  getAbciInfo: () => Promise<any>;

  broadcastTxCommit: (tx: string) => Promise<Test3Response.BroadcastTxCommit>;

  broadcastTxSync: (tx: string) => Promise<Test3Response.BroadcastTxSync>;

  broadcastTxAsync: (tx: string) => Promise<Test3Response.BroadcastTxAsync>;

  executeAbciQuery: (
    queryType: Test3ApiAbciQueryType,
    request: { [key in string]: any },
  ) => Promise<Test3Response.AbciQuery>;

  getTransactionHistory: (address: string, page: number) => Promise<Test3Response.History>;
}
