import { SCANNER_URL } from '@common/constants/resource.constant';
import { NetworkMetainfo } from '@types';
import { makeQueryString } from './string-utils';

/**
 * Shape of the network context appended to scanner/explorer links so the
 * explorer can resolve which chain (and, for custom networks, which RPC and
 * indexer) the link refers to.
 *
 * - Official networks: `{ chainId }`
 * - Custom networks: `{ type: 'custom', rpcUrl, indexerUrl }`
 */
export type ScannerParameters = { [key in string]: string };

/**
 * Minimal network context needed to build scanner links. `isOfficial`
 * distinguishes hosted networks (linked by chainId) from custom ones (linked
 * by raw rpcUrl/indexerUrl). Callers derive it from `!!network.apiUrl`, but
 * passing the boolean keeps the builder usable from the background script,
 * which already holds that flag rather than a full NetworkMetainfo.
 */
export interface ScannerNetworkInfo {
  chainId: string;
  isOfficial: boolean;
  rpcUrl: string;
  indexerUrl?: string;
}

/**
 * Derive the scanner network context from a full NetworkMetainfo. A network is
 * official when it exposes a hosted `apiUrl`.
 */
export const toScannerNetworkInfo = (network: NetworkMetainfo): ScannerNetworkInfo => ({
  chainId: network.chainId,
  isOfficial: !!network.apiUrl,
  rpcUrl: network.rpcUrl,
  indexerUrl: network.indexerUrl,
});

/**
 * Build the network parameters appended to a scanner link.
 *
 * Official networks only need a `chainId`. Custom networks have no hosted API,
 * so the explorer is pointed at the raw `rpcUrl`/`indexerUrl` instead.
 */
export const makeScannerParameters = (network: ScannerNetworkInfo): ScannerParameters => {
  if (network.isOfficial) {
    return { chainId: network.chainId };
  }

  const parameters: ScannerParameters = {
    type: 'custom',
    rpcUrl: network.rpcUrl || '',
  };

  // Only attach indexerUrl when the caller supplied one. The background script
  // has no indexerUrl on hand, and omitting the key keeps its links identical
  // to the previous `type=custom&rpcUrl=...` form.
  if (network.indexerUrl !== undefined) {
    parameters.indexerUrl = network.indexerUrl;
  }

  return parameters;
};

/**
 * Compose a full scanner URL from a base scanner host, a path, and query
 * parameters. Returns the path without a trailing `?` when there are no
 * parameters.
 */
export const makeScannerUrl = (
  scannerUrl: string,
  path: string,
  parameters: ScannerParameters = {},
): string => {
  const baseUrl = `${scannerUrl}${path}`;
  const queryString = makeQueryString(parameters);

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Build a transaction-details scanner URL for the given network, merging the
 * network parameters (chainId / custom rpcUrl) with the transaction hash.
 *
 * `scannerUrl` defaults to the global SCANNER_URL but callers may pass a
 * network profile's `linkUrl` to honour per-network explorer overrides.
 */
export const makeTransactionScannerUrl = (
  network: ScannerNetworkInfo,
  txHash: string,
  scannerUrl: string = SCANNER_URL,
): string => {
  const parameters = {
    ...makeScannerParameters(network),
    txhash: txHash,
  };

  return makeScannerUrl(scannerUrl, '/transactions/details', parameters);
};
