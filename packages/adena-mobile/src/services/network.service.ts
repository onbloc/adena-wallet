import { AppError, AppErrorCode } from '../core/errors';
import { ChainFamily, Network } from '../domain/network';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { NetworkRepository } from '../repositories/network.repository';
import { BUILT_IN_NETWORKS, DEFAULT_NETWORK_ID } from '../resources';

export interface CustomNetworkInput {
  networkName: string;
  rpcUrl: string;
  // Reuses the family, prefix and native token of this built-in network.
  baseNetworkId: string;
}

// localhost, emulator host (10.0.2.2), private IPv4 ranges, `.local` and unqualified LAN names.
export const isLocalHost = (host: string): boolean => {
  const name = host.toLowerCase().replace(/^\[|\]$/g, '');
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(name);

  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];

    return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  }

  if (name.includes(':')) {
    // IPv6: loopback, unique-local (fc00::/7) and link-local (fe80::/10).
    return name === '::1' || /^f[cd][0-9a-f]{0,2}:/.test(name) || /^fe[89ab][0-9a-f]?:/.test(name);
  }

  return name === 'localhost' || name.endsWith('.local') || !name.includes('.');
};

export class NetworkService {
  constructor(
    private readonly networkRepository: NetworkRepository,
    private readonly chainRegistry: ChainRegistry,
    private readonly builtInNetworks: Network[] = BUILT_IN_NETWORKS,
    private readonly onSelectionChange: () => void = () => {},
  ) {}

  getNetworks(): Network[] {
    return [...this.builtInNetworks, ...this.networkRepository.getCustomNetworks()]
      .filter(network => this.chainRegistry.supports(network.family));
  }

  getNetwork(networkId: string): Network {
    const network = this.getNetworks().find(item => item.id === networkId);

    if (!network) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, `Unknown network ${networkId}`);
    }

    return network;
  }

  findByChainId(chainId: string): Network | undefined {
    return this.getNetworks().find(network => network.chainId === chainId);
  }

  getCurrentNetwork(): Network {
    const networks = this.getNetworks();
    const currentId = this.networkRepository.getCurrentNetworkId() ?? DEFAULT_NETWORK_ID;

    return networks.find(network => network.id === currentId) ?? networks[0];
  }

  selectNetwork(networkId: string): Network {
    const network = this.getNetwork(networkId);

    if (this.getCurrentNetwork().id !== network.id) {
      this.onSelectionChange();
    }

    this.networkRepository.setCurrentNetworkId(network.id);
    return network;
  }

  async addCustomNetwork(input: CustomNetworkInput): Promise<Network> {
    const base = this.getNetwork(input.baseNetworkId);
    const rpcUrl = input.rpcUrl.trim().replace(/\/+$/, '');

    const endpoint = /^(https?):\/\/(\[[^\]]*\]|[^/:?#]+)/i.exec(rpcUrl);

    if (!endpoint) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'URL must start with http:// or https://');
    }

    // iOS ATS blocks cleartext to public hosts, so http:// is limited to local development endpoints.
    if (endpoint[1].toLowerCase() === 'http' && !isLocalHost(endpoint[2])) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Use an https:// URL. http:// is only allowed for localhost or a private network address.');
    }

    // Cosmos networks are reached through their LCD REST endpoint.
    const draft: Network = {
      ...base,
      id: '',
      rpcUrl,
      restUrl: base.family === ChainFamily.COSMOS ? rpcUrl : undefined,
      networkName: input.networkName.trim(),
      fallbackRpcUrl: undefined,
      // Custom networks never inherit the base network's data sources or explorer.
      apiUrl: undefined,
      linkUrl: undefined,
      isCustom: true,
      isMainnet: false,
    };
    // The chain id always comes from the node so a typo cannot mislabel a network.
    const chainId = await this.chainRegistry.forNetwork(draft).getChainId(draft);
    const network: Network = { ...draft, id: `custom:${chainId}:${rpcUrl}`, chainId };

    if (this.getNetworks().some(item => item.id === network.id)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This network is already added');
    }

    this.networkRepository.saveCustomNetworks([...this.networkRepository.getCustomNetworks(), network]);
    return network;
  }

  removeCustomNetwork(networkId: string): void {
    const remaining = this.networkRepository.getCustomNetworks().filter(network => network.id !== networkId);

    this.networkRepository.saveCustomNetworks(remaining);

    if (this.networkRepository.getCurrentNetworkId() === networkId) {
      this.onSelectionChange();
      this.networkRepository.setCurrentNetworkId(DEFAULT_NETWORK_ID);
    }
  }
}
