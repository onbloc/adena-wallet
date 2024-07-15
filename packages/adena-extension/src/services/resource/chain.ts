import { CommonError } from '@common/errors/common';
import { ChainRepository } from '@repositories/common';
import { NetworkMetainfo } from '@types';

export class ChainService {
  private chainRepository: ChainRepository;

  constructor(chainRepository: ChainRepository) {
    this.chainRepository = chainRepository;
  }

  public getNetworks = async (): Promise<NetworkMetainfo[]> => {
    const networks = await this.chainRepository.getNetworks();
    if (networks.length > 0) {
      return networks;
    }

    const fetchedNetworks = await this.chainRepository.fetchNetworkMetainfos();
    if (fetchedNetworks.length === 0) {
      throw new CommonError('NOT_FOUND_NETWORKS');
    }

    return fetchedNetworks;
  };

  public addGnoNetwork = async (
    name: string,
    rpcUrl: string,
    chainId: string,
  ): Promise<boolean> => {
    const addedNetwork = {
      id: `${Date.now()}`,
      default: false,
      main: false,
      chainId: chainId,
      chainName: 'GNO.LAND',
      networkId: chainId,
      networkName: name,
      addressPrefix: 'g',
      rpcUrl: rpcUrl,
      indexerUrl: '',
      gnoUrl: rpcUrl,
      apiUrl: '',
      linkUrl: '',
    };
    return this.chainRepository.addNetwork(addedNetwork);
  };

  public updateNetworks = async (networks: Array<NetworkMetainfo>): Promise<boolean> => {
    await this.chainRepository.updateNetworks(networks);
    return true;
  };

  public getCurrentNetworkId = async (): Promise<string> => {
    return this.chainRepository.getCurrentNetworkId();
  };

  public getCurrentNetwork = async (): Promise<NetworkMetainfo> => {
    const networks = await this.getNetworks();
    const networkId = await this.chainRepository.getCurrentNetworkId();
    return networks.find((network) => network.id === networkId) ?? networks[0];
  };

  public updateCurrentNetworkId = async (chainId: string): Promise<boolean> => {
    await this.chainRepository.updateCurrentNetworkId(chainId);
    return true;
  };

  public clear = async (): Promise<void> => {
    await this.chainRepository.deleteCurrentChainId();
    await this.chainRepository.deleteNetworks();
    await this.chainRepository.deleteCurrentNetworkId();
  };
}
