import { Network } from '../domain/network';
import { BUILT_IN_NETWORKS } from '../resources';

export const AI_CONFIG = {
  defaultModel: 'gpt-6-luna',
} as const;

const MCP_ENDPOINTS: Readonly<Record<string, string>> = {
  'gnoland-1': 'https://dev-gnoscan-v2.api.onbloc.xyz/mcp',
  'onyx-1': 'https://dev-testnet-gnoscan-v2.api.onbloc.xyz/mcp',
};

// A chain ID alone cannot authorize a custom RPC to use a trusted chain's tools.
export const getAiNetworkConfig = (network: Network): { chainId: string; mcpEndpoint: string } | undefined => {
  const mcpEndpoint = MCP_ENDPOINTS[network.id];
  const builtin = BUILT_IN_NETWORKS.find(item => item.id === network.id);

  if (!mcpEndpoint || !builtin || network.isCustom || network.family !== 'gno'
    || network.chainId !== builtin.chainId || network.isMainnet !== builtin.isMainnet
    || network.rpcUrl !== builtin.rpcUrl || network.fallbackRpcUrl !== builtin.fallbackRpcUrl
    || network.apiUrl !== builtin.apiUrl || network.restUrl !== builtin.restUrl
    || network.addressPrefix !== builtin.addressPrefix) {
    return undefined;
  }

  return { chainId: builtin.chainId, mcpEndpoint };
};
