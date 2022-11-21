import { CommonApiAbciQueryType, CommonResponse } from '.';

export interface CommonApi {
  getHealth: () => Promise<boolean>;

  getNetwrokInfo: () => Promise<CommonResponse.Status>;

  getGenesis: () => Promise<CommonResponse.Genesis>;

  getBlocks: (minHeight: number, maxHeight: number) => Promise<CommonResponse.Blocks>;

  getBlock: (height: number) => Promise<any>;

  getBlockResults: (height: number) => Promise<any>;

  getBlockCommit: (height: number) => Promise<any>;

  getValidators: () => Promise<any>;

  getConsensusState: () => Promise<any>;

  getConsensusParams: (height: number) => Promise<any>;

  getUnconfirmedTxs: () => Promise<any>;

  getNumUnconfirmedTxs: () => Promise<any>;

  getAbciInfo: () => Promise<any>;

  broadcastTxCommit: (tx: string) => Promise<CommonResponse.BroadcastTxCommit>;

  broadcastTxSync: (tx: string) => Promise<CommonResponse.BroadcastTxSync>;

  broadcastTxAsync: (tx: string) => Promise<CommonResponse.BroadcastTxAsync>;

  executeAbciQuery: (
    queryType: CommonApiAbciQueryType,
    request: { [key in string]: any },
  ) => Promise<CommonResponse.AbciQuery>;

  getTransactionHistory: (address: string, page: number) => Promise<CommonResponse.History>;
}
