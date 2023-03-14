import axios, { AxiosAdapter } from 'axios';
import { Test3Response } from '.';
import { Test3Api } from './test3-api';
import { Test3ApiPath } from './test3-api-path';
import { NetworkInstance, NetworkConfig } from './../..';
import { QueryType } from './../../../api/gno-client-api-abci-query-type';

export class Test3ApiFetcher implements Test3Api {
  private networkInstance: NetworkInstance;

  constructor(config: NetworkConfig, axiosAdapter?: AxiosAdapter) {
    const host = config.rpcUrl;
    if (!host) {
      throw Error("Not Found Environment's variables");
    }
    this.networkInstance = new NetworkInstance({ host }, axiosAdapter);
  }

  private get = async <T>(uri: string): Promise<T> => {
    const result = await this.networkInstance.get<Test3Response.Common<T>>(uri);
    if (result.data.error) {
      throw new Error(result.data.error?.message);
    }
    return result.data.result;
  };

  public getHealth = async (): Promise<boolean> => {
    const result = await this.get<object>(Test3ApiPath.createPathOfHealth());
    return typeof result === 'object';
  };

  public getNetwrokInfo = async () => {
    return this.get<Test3Response.Status>(Test3ApiPath.createPathOfNetwrokInfo());
  };

  public getGenesis = async () => {
    return this.get<Test3Response.Genesis>(Test3ApiPath.createPathOfGenesis());
  };

  public getBlocks = async (minHeight: number, maxHeight: number) => {
    return this.get<Test3Response.Blocks>(Test3ApiPath.createPathOfBlocks(minHeight, maxHeight));
  };

  public getBlock = async (height: number) => {
    return this.get(Test3ApiPath.createPathOfBlock(height));
  };

  public getBlockResults = async (height: number) => {
    return this.get(Test3ApiPath.createPathOfBlockResults(height));
  };

  public getBlockCommit = async (height: number) => {
    return this.get(Test3ApiPath.createPathOfBlockCommit(height));
  };

  public getValidators = async () => {
    return this.get(Test3ApiPath.createPathOfValidators());
  };

  public getConsensusState = async () => {
    return this.get(Test3ApiPath.createPathOfConsensusState());
  };

  public getConsensusParams = async (height: number) => {
    return this.get(Test3ApiPath.createPathOfConsensusParams(height));
  };

  public getUnconfirmedTxs = async () => {
    return this.get(Test3ApiPath.createPathOfUnconfirmedTxs());
  };

  public getNumUnconfirmedTxs = async () => {
    return this.get(Test3ApiPath.createPathOfNumUnconfirmedTxs());
  };

  public broadcastTxCommit = async (tx: string) => {
    return this.get<Test3Response.BroadcastTxCommit>(
      Test3ApiPath.createPathOfBroadcastTxCommit(tx),
    );
  };

  public broadcastTxSync = async (tx: string) => {
    return this.get<Test3Response.BroadcastTxSync>(Test3ApiPath.createPathOfBroadcastTxSync(tx));
  };

  public broadcastTxAsync = async (tx: string) => {
    return this.get<Test3Response.BroadcastTxAsync>(Test3ApiPath.createPathOfBroadcastTxAsync(tx));
  };

  public getAbciInfo = async () => {
    return this.get(Test3ApiPath.createPathOfAbciInfo());
  };

  public executeAbciQuery = async (
    queryType: QueryType,
    request: {
      query?: { [key in string]: string };
      data?: Array<string>
    }
  ) => {
    return this.get<Test3Response.AbciQuery>(
      Test3ApiPath.createPathOfAbciQuery(queryType, request),
    );
  };

  public getTransactionHistory = async (address: string, page: number) => {
    const result = await axios.get<Test3Response.History>(
      Test3ApiPath.createPathOfHistoryTemp(address, page),
    );
    return result.data;
  };
}
