import { QueryType, QUERY_PATH } from '../../../api';

export class Test3ApiPath {
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
    queryType: QueryType,
    request: {
      query?: { [key in string]: string };
      data?: Array<string>;
    },
  ) => {
    const { query, data } = request;
    let queryPath = QUERY_PATH[queryType];
    let dataPath = '';
    if (query) {
      Object.keys(query).forEach((key) => (queryPath = queryPath.replace(`:${key}`, query[key])));
    }
    if (data) {
      dataPath = `&data="${data.join('\\n')}"`;
    }
    return `/abci_query?path="${queryPath}"${dataPath}`;
  };

  public static createPathOfHistoryTemp = (address: string, page: number) =>
    `https://api.adena.app/test3/multi_history/${address}?skip=${page}&size=20`;
}
