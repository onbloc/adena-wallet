import { CommonError } from '@common/errors/common';
import { ChainRepository, Network } from '@repositories/common';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { GnoClient } from 'gno-client';

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

  public updateNetworks = async (networks: Array<Network>) => {
    await this.chainRepository.updateNetworks(networks);
    return true;
  };

  public getCurrentNetworkId = async () => {
    return this.chainRepository.getCurrentNetworkId();
  };

  public getCurrentNetwork = async () => {
    const networks = await this.getNetworks();
    const networkId = await this.chainRepository.getCurrentNetworkId();
    return networks.find((network) => network.chainId === networkId) ?? networks[0];
  };

  public updateCurrentNetworkId = async (chainId: string) => {
    await this.chainRepository.updateCurrentNetworkId(chainId);
    return true;
  };

  public getCurrentClient = async () => {
    const network = await this.getCurrentNetwork();
    const currentNetworkId = network.networkId.toUpperCase() === 'TEST3' ? 'TEST3' : 'TEST2';
    return GnoClient.createNetworkByType(network, currentNetworkId, fetchAdapter);
  };

  public clear = async () => {
    await this.chainRepository.deleteCurrentChainId();
    await this.chainRepository.deleteNetworks();
  };
}
