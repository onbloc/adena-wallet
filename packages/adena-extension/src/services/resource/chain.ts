import { CommonError } from "@common/errors/common";
import { ChainRepository, Network } from "@repositories/common";
import { GnoClient } from "gno-client";

export class ChainService {

  private chainRepository: ChainRepository;

  constructor(chainRepository: ChainRepository) {
    this.chainRepository = chainRepository;
  }

  public getNetworks = async () => {
    const networks = await this.chainRepository.getNetworks();
    if (networks.length > 0) {
      return networks;
    }

    const fetchedNetworks = await this.chainRepository.fetchNetworks();
    if (fetchedNetworks.length === 0) {
      throw new CommonError("NOT_FOUND_NETWORKS")
    }

    return fetchedNetworks;
  };

  public updateNetworks = async (networks: Array<Network>) => {
    await this.chainRepository.updateNetworks(networks);
    return true;
  };

  public getCurrentNetwork = async () => {
    const networks = await this.getNetworks();
    const currentChaindId = await this.chainRepository.getCurrentChainId();
    return networks.find(network => network.chainId === currentChaindId) ?? networks[0];
  };

  public updateCurrentNetwork = async (chainId: string) => {
    await this.chainRepository.updateCurrentChainId(chainId);
    return true;
  };

  public getCurrentClient = async () => {
    const network = await this.getCurrentNetwork();
    return GnoClient.createNetwork(network);
  };

  public clear = async () => {
    await this.chainRepository.deleteCurrentChainId();;
    await this.chainRepository.deleteNetworks();
  };

}
