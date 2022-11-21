import { NetworkInstance, NetworkConfig } from './../../';
import { Test2ApiAbciQueryType, Test2Response } from '.';
import { Test2Api } from '.';
import { Test2ApiPath } from '.';
import axios, { AxiosAdapter } from 'axios';

export class Test2ApiFetcher implements Test2Api {
  private networkInstance: NetworkInstance;

  constructor(config: NetworkConfig, axiosAdapter?: AxiosAdapter) {
    const host = config.rpcUrl;
    if (!host) {
      throw Error("Not Found Environment's variables");
    }
    this.networkInstance = new NetworkInstance({ host }, axiosAdapter);
  }

  private get = async <T>(uri: string): Promise<T> => {
    const result = await this.networkInstance.get<Test2Response.Common<T>>(uri);
    return result.data.result;
  };

  public getHealth = async (): Promise<boolean> => {
    const result = await this.get<object>(Test2ApiPath.createPathOfHealth());
    return typeof result === 'object';
  };

  public getNetwrokInfo = async () => {
    return this.get<Test2Response.Status>(Test2ApiPath.createPathOfNetwrokInfo());
  };

  public getGenesis = async () => {
    return this.get<Test2Response.Genesis>(Test2ApiPath.createPathOfGenesis());
  };

  public getBlocks = async (minHeight: number, maxHeight: number) => {
    return this.get<Test2Response.Blocks>(Test2ApiPath.createPathOfBlocks(minHeight, maxHeight));
  };

  public getBlock = async (height: number) => {
    return this.get(Test2ApiPath.createPathOfBlock(height));
  };

  public getBlockResults = async (height: number) => {
    return this.get(Test2ApiPath.createPathOfBlockResults(height));
  };

  public getBlockCommit = async (height: number) => {
    return this.get(Test2ApiPath.createPathOfBlockCommit(height));
  };

  public getValidators = async () => {
    return this.get(Test2ApiPath.createPathOfValidators());
  };

  public getConsensusState = async () => {
    return this.get(Test2ApiPath.createPathOfConsensusState());
  };

  public getConsensusParams = async (height: number) => {
    return this.get(Test2ApiPath.createPathOfConsensusParams(height));
  };

  public getUnconfirmedTxs = async () => {
    return this.get(Test2ApiPath.createPathOfUnconfirmedTxs());
  };

  public getNumUnconfirmedTxs = async () => {
    return this.get(Test2ApiPath.createPathOfNumUnconfirmedTxs());
  };

  public broadcastTxCommit = async (tx: string) => {
    return this.get<Test2Response.BroadcastTxCommit>(
      Test2ApiPath.createPathOfBroadcastTxCommit(tx),
    );
  };

  public broadcastTxSync = async (tx: string) => {
    return this.get<Test2Response.BroadcastTxSync>(Test2ApiPath.createPathOfBroadcastTxSync(tx));
  };

  public broadcastTxAsync = async (tx: string) => {
    return this.get<Test2Response.BroadcastTxAsync>(Test2ApiPath.createPathOfBroadcastTxAsync(tx));
  };

  public getAbciInfo = async () => {
    return this.get(Test2ApiPath.createPathOfAbciInfo());
  };

  public executeAbciQuery = async (
    queryType: Test2ApiAbciQueryType,
    request: { [x: string]: any },
  ) => {
    return this.get<Test2Response.AbciQuery>(
      Test2ApiPath.createPathOfAbciQuery(queryType, request),
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
