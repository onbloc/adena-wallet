import { DEFAULT_EXPLORER_URL } from '../config/endpoints';
import { ChainFamily, Network } from '../domain/network';

// Gnoscan query value for networks it does not know by chain id.
const GNOSCAN_CUSTOM_NETWORK_TYPE = 'custom';

// Gnoscan rules from the extension: official networks pass chainId, custom ones their RPC.
const gnoscanUrl = (network: Network, path: string, extra: Record<string, string> = {}): string => {
  const base = network.linkUrl ?? DEFAULT_EXPLORER_URL;
  const params = network.apiUrl
    ? { chainId: network.chainId, ...extra }
    : { type: GNOSCAN_CUSTOM_NETWORK_TYPE, rpcUrl: network.rpcUrl, ...extra };
  const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');

  return `${base}${path}?${query}`;
};

// Cosmos networks link to Mintscan-style explorers only when one is configured.
export const transactionExplorerUrl = (network: Network, hash: string): string | null =>
  network.family === ChainFamily.COSMOS
    ? network.linkUrl ? `${network.linkUrl}/tx/${hash}` : null
    : gnoscanUrl(network, '/transactions/details', { txhash: hash });

export const accountExplorerUrl = (network: Network, address: string): string | null =>
  network.family === ChainFamily.COSMOS
    ? network.linkUrl ? `${network.linkUrl}/address/${address}` : null
    : gnoscanUrl(network, `/account/${address}`);

export const tokenExplorerUrl = (network: Network, tokenId: string): string | null =>
  network.family === ChainFamily.GNO ? gnoscanUrl(network, `/tokens/${tokenId}`) : null;
