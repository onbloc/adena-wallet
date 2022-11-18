import { GnoClientResnpose } from '.';
import { GnoClientApiAbciQuery } from './gno-client-api-abci-query';

export interface GnoClientApi extends GnoClientApiAbciQuery {
  isHealth: () => Promise<boolean>;

  getNetwrokInfo: () => Promise<GnoClientResnpose.NetworkInfo>;

  getGenesis: () => Promise<GnoClientResnpose.Genesis>;

  getBlocks: (minHeight: number, maxHeight: number) => Promise<GnoClientResnpose.Blocks>;

  getBlock: (height: number) => Promise<any>;

  getBlockResults: (height: number) => Promise<any>;

  getBlockCommit: (height: number) => Promise<any>;

  getValidators: () => Promise<any>;

  getConsensusState: () => Promise<any>;

  getConsensusParams: (height: number) => Promise<any>;

  getUnconfirmedTxs: () => Promise<any>;

  getNumUnconfirmedTxs: () => Promise<any>;

  getAbciInfo: () => Promise<any>;

  broadcastTxCommit: (tx: string) => Promise<GnoClientResnpose.BroadcastTxCommit>;

  broadcastTxSync: (tx: string) => Promise<GnoClientResnpose.BroadcastTxSync>;

  broadcastTxAsync: (tx: string) => Promise<GnoClientResnpose.BroadcastTxAsync>;

  getTransactionHistory: (address: string) => Promise<Array<GnoClientResnpose.TransactionHistory>>;
}
