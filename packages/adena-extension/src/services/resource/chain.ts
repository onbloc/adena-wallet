import { CommonError } from '@common/errors/common';
import { ChainRepository } from '@repositories/common';
import { NetworkMetainfo } from '@states/network';

export class ChainService {
  private chainRepository: ChainRepository;

  constructor(chainRepository: ChainRepository) {
    this.chainRepository = chainRepository;
  }

  public fetchNetworkMetainfos = () => {
    return this.chainRepository.fetchNetworkMetainfos();
  };

  public getNetworks = async () => {
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

  public addGnoNetwork = async (name: string, rpcUrl: string, chainId: string) => {
    const addedNetwork = {
      id: `${Date.now()}`,
      main: false,
      chainId: chainId,
      chainName: 'GNO.LAND',
      networkId: chainId,
      networkName: name,
      addressPrefix: 'g',
      rpcUrl: rpcUrl,
      gnoUrl: rpcUrl,
      apiUrl: '',
      linkUrl: '',
      token: {
        denom: 'gnot',
        unit: 1,
        minimalDenom: 'ugnot',
        minimalUnit: 0.000001,
      },
    };
    return this.chainRepository.addNetwork(addedNetwork);
  };

  public updateNetworks = async (networks: Array<NetworkMetainfo>) => {
    await this.chainRepository.updateNetworks(networks);
    return true;
  };

  public getCurrentNetworkId = async () => {
    return this.chainRepository.getCurrentNetworkId();
  };

  public getCurrentNetwork = async () => {
    const networks = await this.getNetworks();
    const networkId = await this.chainRepository.getCurrentNetworkId();
    return networks.find((network) => network.networkId === networkId) ?? networks[0];
  };

  public updateCurrentNetworkId = async (chainId: string) => {
    await this.chainRepository.updateCurrentNetworkId(chainId);
    return true;
  };

  public clear = async () => {
    await this.chainRepository.deleteCurrentChainId();
    await this.chainRepository.deleteNetworks();
    await this.chainRepository.deleteCurrentNetworkId();
  };
}
