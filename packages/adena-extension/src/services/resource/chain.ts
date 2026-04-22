import { CommonError } from '@common/errors/common';
import { ChainRepository, NetworkModeValue } from '@repositories/common';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';

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
    indexerUrl: string,
  ): Promise<boolean> => {
    const addedNetwork = {
      id: `${Date.now()}`,
      default: false,
      main: false,
      chainId: chainId,
      chainName: 'Gno.land',
      networkId: chainId,
      networkName: name,
      addressPrefix: 'g',
      rpcUrl: rpcUrl,
      indexerUrl,
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

  public getAtomoneNetworks = async (): Promise<AtomoneNetworkMetainfo[]> => {
    return this.chainRepository.getAtomoneNetworks();
  };

  public addAtomoneNetwork = async (
    name: string,
    rpcUrl: string,
    restUrl: string,
    chainId: string,
  ): Promise<boolean> => {
    const addedNetwork: AtomoneNetworkMetainfo = {
      id: `${Date.now()}`,
      default: false,
      isMainnet: false,
      chainGroup: 'atomone',
      chainType: 'cosmos',
      chainId,
      chainName: 'AtomOne',
      networkId: chainId,
      networkName: name,
      addressPrefix: 'atone',
      rpcUrl,
      restUrl,
    };
    return this.chainRepository.addAtomoneNetwork(addedNetwork);
  };

  public updateAtomoneNetworks = async (
    networks: Array<AtomoneNetworkMetainfo>,
  ): Promise<boolean> => {
    await this.chainRepository.updateAtomoneNetworks(networks);
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

  public getNetworkMode = async (): Promise<NetworkModeValue | null> => {
    return this.chainRepository.getNetworkMode();
  };

  public updateNetworkMode = async (mode: NetworkModeValue): Promise<boolean> => {
    return this.chainRepository.updateNetworkMode(mode);
  };

  public getCurrentAtomoneNetworkId = async (): Promise<string | null> => {
    return this.chainRepository.getCurrentAtomoneNetworkId();
  };

  public updateCurrentAtomoneNetworkId = async (networkId: string): Promise<boolean> => {
    return this.chainRepository.updateCurrentAtomoneNetworkId(networkId);
  };

  public clear = async (): Promise<void> => {
    await this.chainRepository.deleteCurrentChainId();
    await this.chainRepository.deleteNetworks();
    await this.chainRepository.deleteAtomoneNetworks();
    await this.chainRepository.deleteCurrentNetworkId();
    await this.chainRepository.deleteCurrentAtomoneNetworkId();
    await this.chainRepository.deleteNetworkMode();
  };
}
