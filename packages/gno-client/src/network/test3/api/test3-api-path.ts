import { Test3ApiAbciQueryType } from '.';

export class Test3ApiPath {
  private static queryTypeToPath: { [key in Test3ApiAbciQueryType]: string } = {
    GET_ACCOUNT_INFO: 'auth/accounts',
    GET_BALANCES: 'bank/balances',
  };

  public static createPathOfHealth = () => `/health`;

  public static createPathOfNetwrokInfo = () => `/status`;

  public static createPathOfGenesis = () => `/genesis`;

  public static createPathOfBlocks = (minHeight: number, maxHeight: number) =>
    `/blockchain?minHeight=${minHeight}&maxHeight=${maxHeight}`;

  public static createPathOfBlock = (height: number) => `/block?height=${height}`;

  public static createPathOfBlockResults = (height: number) => `/block_results?height=${height}`;

  public static createPathOfBlockCommit = (height: number) => `/commit?height=${height}`;

  public static createPathOfValidators = () => `/validators`;

  public static createPathOfConsensusState = () => `/consensus_state`;

  public static createPathOfConsensusParams = (height: number) =>
    `/consensus_params?height=${height}`;

  public static createPathOfUnconfirmedTxs = () => `/unconfirmed_txs`;

  public static createPathOfNumUnconfirmedTxs = () => `/num_unconfirmed_txs`;

  public static createPathOfBroadcastTxCommit = (tx: string) => `/broadcast_tx_commit?tx=[${tx}]`;

  public static createPathOfBroadcastTxSync = (tx: string) => `/broadcast_tx_sync?tx=[${tx}]`;

  public static createPathOfBroadcastTxAsync = (tx: string) => `/broadcast_tx_async?tx=[${tx}]`;

  public static createPathOfAbciInfo = () => `/abci_info`;

  public static createPathOfAbciQuery = (
    queryType: Test3ApiAbciQueryType,
    request: { [key in string]: any },
  ) => {
    const queryPath = this.queryTypeToPath[queryType];
    return `/abci_query?path=%22${queryPath}/${request.address}%22`;
  };

  public static createPathOfHistoryTemp = (address: string) =>
    `https://api.adena.app/history3/all/${address}`;
}
