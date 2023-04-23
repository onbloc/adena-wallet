import { NetworkConfig } from './network';
import { NetworkTest2 } from './network/test2';
import { NetworkTest3 } from './network/test3';
import { GnoClientApi } from './api';
import { AxiosAdapter } from 'axios';

export type NetworkMapperType = 'TEST2' | 'TEST3';
export class GnoClient {
  private network: GnoClientApi;

  private networkConfig: NetworkConfig;

  private mapperType: NetworkMapperType;

  constructor(network: GnoClientApi, networkConfig: NetworkConfig, mapperType: NetworkMapperType) {
    this.network = network;
    this.networkConfig = networkConfig;
    this.mapperType = mapperType;
  }

  public get chainId() {
    return this.networkConfig.chainId;
  }

  public get networkId() {
    return this.networkConfig.networkId;
  }

  public get chainName() {
    return this.networkConfig.chainName;
  }

  public get url() {
    return this.networkConfig.rpcUrl;
  }

  public get linkUrl() {
    return this.networkConfig.linkUrl;
  }

  public get config() {
    return this.networkConfig;
  }

  public clone = () => {
    return GnoClient.createNetworkByType(this.networkConfig, this.mapperType);
  };

  public static createNetwork(networkConfig: NetworkConfig) {
    return new GnoClient(new NetworkTest3(networkConfig), networkConfig, 'TEST3');
  }

  public static createNetworkByType(
    networkConfig: NetworkConfig,
    mapperType: NetworkMapperType,
    axiosAdapter?: AxiosAdapter,
  ) {
    switch (mapperType) {
      case 'TEST2':
        return new GnoClient(
          new NetworkTest2(networkConfig, axiosAdapter),
          networkConfig,
          mapperType,
        );
      case 'TEST3':
      default:
        return new GnoClient(
          new NetworkTest3(networkConfig, axiosAdapter),
          networkConfig,
          mapperType,
        );
    }
  }

  public get mapperVersion() {
    return this.mapperType;
  }

  public isHealth = async () => this.network.isHealth();

  public getNetwrokInfo = async () => this.network.getNetwrokInfo();

  public getGenesis = async () => this.network.getGenesis();

  public getBlocks = async (minHeight: number, maxHeight: number) =>
    this.network.getBlocks(minHeight, maxHeight);

  public getBlock = async (height: number) => this.network.getBlock(height);

  public getBlockResults = async (height: number) => this.network.getBlockResults(height);

  public getBlockCommit = async (height: number) => this.network.getBlockCommit(height);

  public getValidators = async () => this.network.getValidators();

  public getConsensusState = async () => this.network.getConsensusState();

  public getConsensusParams = async (height: number) => this.network.getConsensusParams(height);

  public getUnconfirmedTxs = async () => this.network.getUnconfirmedTxs();

  public getNumUnconfirmedTxs = async () => this.network.getNumUnconfirmedTxs();

  public getAbciInfo = async () => this.network.getAbciInfo();

  public broadcastTxCommit = async (tx: string) => this.network.broadcastTxCommit(tx);

  public broadcastTxSync = async (tx: string) => this.network.broadcastTxSync(tx);

  public broadcastTxAsync = async (tx: string) => this.network.broadcastTxAsync(tx);

  public getAccount = async (address: string) => this.network.getAccount(address);

  public getBalances = async (address: string) => this.network.getBalances(address);

  public getTransactionHistory = async (address: string, page?: number) =>
    this.network.getTransactionHistory(address, page ?? 0);

  public queryRender = async (packagePath: string, data?: Array<string>) =>
    this.network.queryRender(packagePath, data);

  public queryEval = async (packagePath: string, functionName: string, data?: Array<string>) =>
    this.network.queryEval(packagePath, functionName, data);

  public queryPackage = async (packagePath: string) => this.network.queryPackage(packagePath);

  public queryFunctions = async (packagePath: string) => this.network.queryFunctions(packagePath);

  public queryFile = async (packagePath: string) => this.network.queryFile(packagePath);

  public queryStore = async (packagePath: string) => this.network.queryStore(packagePath);
}
