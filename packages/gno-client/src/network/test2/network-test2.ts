import { GnoClientApi, GnoClientResnpose } from '../../api';
import { AxiosAdapter } from 'axios';
import { NetworkConfig } from '../network-config';
import { Test2ApiFetcher, Test2Mapper, Test2Response } from './api';

export class NetworkTest2 implements GnoClientApi {
  private fetcher: Test2ApiFetcher;

  constructor(config: NetworkConfig, axiosAdapter?: AxiosAdapter) {
    this.fetcher = new Test2ApiFetcher(config, axiosAdapter);
  }

  public isHealth = async () => {
    return this.fetcher.getHealth();
  };

  public getNetwrokInfo = async () => {
    const networkInfoOfTest2 = await this.fetcher.getNetwrokInfo();
    const networkInfo = Test2Mapper.StatusMapper.toNetworkInfo(networkInfoOfTest2);
    return networkInfo;
  };

  public getGenesis = async () => {
    const genesisOfTest2 = await this.fetcher.getGenesis();
    const genesis = Test2Mapper.GenesisMapper.toGenesis(genesisOfTest2);
    return genesis;
  };

  public getBlocks = async (minHeight: number, maxHeight: number) => {
    return this.fetcher.getBlocks(minHeight, maxHeight);
  };

  public getBlock = async (height: number) => {
    return this.fetcher.getBlock(height);
  };

  public getBlockResults = async (height: number) => {
    return this.fetcher.getBlockResults(height);
  };

  public getBlockCommit = async (height: number) => {
    return this.fetcher.getBlockCommit(height);
  };

  public getValidators = async () => {
    return this.fetcher.getValidators();
  };

  public getConsensusState = async () => {
    return this.fetcher.getConsensusState();
  };

  public getConsensusParams = async (height: number) => {
    return this.fetcher.getConsensusParams(height);
  };

  public getUnconfirmedTxs = async () => {
    return this.fetcher.getUnconfirmedTxs();
  };

  public getNumUnconfirmedTxs = async () => {
    return this.fetcher.getNumUnconfirmedTxs();
  };

  public getAbciInfo = async () => {
    return this.fetcher.getAbciInfo();
  };

  public broadcastTxCommit = async (tx: string) => {
    const txCommitResponseOfTest2 = await this.fetcher.broadcastTxCommit(tx);
    const txCommitResponse =
      Test2Mapper.BroadcastTxCommitMapper.toBroadcastTxCommit(txCommitResponseOfTest2);
    return txCommitResponse;
  };

  public broadcastTxSync = async (tx: string) => {
    return this.fetcher.broadcastTxSync(tx);
  };

  public broadcastTxAsync = async (tx: string) => {
    return this.fetcher.broadcastTxAsync(tx);
  };

  public getAccount = async (address: string) => {
    const query = {
      address
    };
    const result = await this.fetcher.executeAbciQuery('GET_ACCOUNT_INFO', { query });
    if (!result.response?.ResponseBase?.Data || result.response?.ResponseBase?.Data === null) {
      return GnoClientResnpose.AccountNone;
    }

    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    const accountDataOfTest2: Test2Response.AbciQueryAuthAccount | null = JSON.parse(abciQueryResponse.ResponseBase.Data ?? "");
    const accountData = Test2Mapper.AbciQueryAuthAccountMapper.toAccount(accountDataOfTest2);
    return accountData;
  };

  public getBalances = async (address: string) => {
    const query = {
      address
    };
    const result = await this.fetcher.executeAbciQuery('GET_BALANCES', { query });
    if (!result.response?.ResponseBase?.Data || result.response?.ResponseBase?.Data === null) {
      return GnoClientResnpose.BalancesDefault;
    }

    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    const balanceDataOfTest2: string = abciQueryResponse.ResponseBase.Data ?? "";
    const balanceData = Test2Mapper.AbciQueryBankBalancesMapper.toBalances(balanceDataOfTest2);
    return balanceData;
  };

  public getTransactionHistory = async (address: string, page?: number) => {
    return this.fetcher.getTransactionHistory(address, page ?? 0);
  };

  public queryRender = async (packagePath: string, data?: Array<string>) => {
    const result = await this.fetcher.executeAbciQuery('QUERY_RENDER', { data: [packagePath, ...data ?? [""]] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }

  public queryEval = async (packagePath: string, functionName: string, data?: Array<string>) => {
    const functionParams = data?.map(param => `\"${param}\"`).join(',') ?? [""];
    const functionData = `${functionName}(${functionParams})`
    const result = await this.fetcher.executeAbciQuery('QUERY_EVAL', { data: [packagePath, functionData] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }

  public queryPackage = async (packagePath: string) => {
    const result = await this.fetcher.executeAbciQuery('QUERY_PACKAGE', { data: [packagePath] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }

  public queryFunctions = async (packagePath: string) => {
    const result = await this.fetcher.executeAbciQuery('QUERY_FUNCTIONS', { data: [packagePath] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }

  public queryFile = async (packagePath: string) => {
    const result = await this.fetcher.executeAbciQuery('QUERY_FILE', { data: [packagePath] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }

  public queryStore = async (packagePath: string) => {
    const result = await this.fetcher.executeAbciQuery('QUERY_STORE', { data: [packagePath] });
    const abciQueryResponse = Test2Mapper.AbciQueryMapper.toAbciQuery(result);
    return abciQueryResponse;
  }
}
