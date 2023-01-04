import { NetworkInstance, NetworkConfig } from '../..';
import { CommonApiAbciQueryType, CommonResponse } from '.';
import { CommonApi } from '.';
import { CommonApiPath } from '.';
import axios, { AxiosAdapter } from 'axios';

export class CommonApiFetcher implements CommonApi {
  private networkInstance: NetworkInstance;

  constructor(config: NetworkConfig, axiosAdapter?: AxiosAdapter) {
    const host = config.rpcUrl;
    if (!host) {
      throw Error("Not Found Environment's variables");
    }
    this.networkInstance = new NetworkInstance({ host }, axiosAdapter);
  }

  private get = async <T>(uri: string): Promise<T> => {
    const result = await this.networkInstance.get<CommonResponse.Common<T>>(uri);
    return result.data.result;
  };

  public getHealth = async (): Promise<boolean> => {
    const result = await this.get<object>(CommonApiPath.createPathOfHealth());
    return typeof result === 'object';
  };

  public getNetwrokInfo = async () => {
    return this.get<CommonResponse.Status>(CommonApiPath.createPathOfNetwrokInfo());
  };

  public getGenesis = async () => {
    return this.get<CommonResponse.Genesis>(CommonApiPath.createPathOfGenesis());
  };

  public getBlocks = async (minHeight: number, maxHeight: number) => {
    return this.get<CommonResponse.Blocks>(CommonApiPath.createPathOfBlocks(minHeight, maxHeight));
  };

  public getBlock = async (height: number) => {
    return this.get(CommonApiPath.createPathOfBlock(height));
  };

  public getBlockResults = async (height: number) => {
    return this.get(CommonApiPath.createPathOfBlockResults(height));
  };

  public getBlockCommit = async (height: number) => {
    return this.get(CommonApiPath.createPathOfBlockCommit(height));
  };

  public getValidators = async () => {
    return this.get(CommonApiPath.createPathOfValidators());
  };

  public getConsensusState = async () => {
    return this.get(CommonApiPath.createPathOfConsensusState());
  };

  public getConsensusParams = async (height: number) => {
    return this.get(CommonApiPath.createPathOfConsensusParams(height));
  };

  public getUnconfirmedTxs = async () => {
    return this.get(CommonApiPath.createPathOfUnconfirmedTxs());
  };

  public getNumUnconfirmedTxs = async () => {
    return this.get(CommonApiPath.createPathOfNumUnconfirmedTxs());
  };

  public broadcastTxCommit = async (tx: string) => {
    return this.get<CommonResponse.BroadcastTxCommit>(
      CommonApiPath.createPathOfBroadcastTxCommit(tx),
    );
  };

  public broadcastTxSync = async (tx: string) => {
    return this.get<CommonResponse.BroadcastTxSync>(CommonApiPath.createPathOfBroadcastTxSync(tx));
  };

  public broadcastTxAsync = async (tx: string) => {
    return this.get<CommonResponse.BroadcastTxAsync>(
      CommonApiPath.createPathOfBroadcastTxAsync(tx),
    );
  };

  public getAbciInfo = async () => {
    return this.get(CommonApiPath.createPathOfAbciInfo());
  };

  public executeAbciQuery = async (
    queryType: CommonApiAbciQueryType,
    request: { [x: string]: any },
  ) => {
    return this.get<CommonResponse.AbciQuery>(
      CommonApiPath.createPathOfAbciQuery(queryType, request),
    );
  };

  // Deprecated on onbloc
  public getTransactionHistory = async (address: string, page: number) => {
    return {
      hits: 0,
      next: false,
      txs: [],
    };
  };
}
