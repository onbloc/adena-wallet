import { GNO_MAINNET_CHAIN, gnoChainId, gnoPublicAddress, parseOnblocEndpoint } from '../../harness/mcp';

export const DEFAULT_ONBLOC_MCP_URL = 'https://dev-gnoscan-v2.api.onbloc.xyz/mcp';
export const DEFAULT_ONBLOC_ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';

export type OnblocSettings = {
  /** Both endpoint and account empty: plain chat without wallet tools. */
  enabled: boolean;
  endpoint: string;
  account: string;
  chainId: string;
  chainIdError: string | null;
  endpointError: string | null;
  accountError: string | null;
};

/** Validates endpoint, account and the exact host-selected chain identity. */
export function resolveOnblocSettings(
  rawEndpoint: string,
  rawAccount: string,
  chainId = GNO_MAINNET_CHAIN,
  allowLoopbackHttp?: true
): OnblocSettings {
  const endpoint = rawEndpoint.trim();
  const account = rawAccount.trim();
  const enabled = endpoint !== '' || account !== '';

  let endpointError: string | null = null;
  if (enabled) {
    try {
      parseOnblocEndpoint(endpoint, allowLoopbackHttp);
    } catch (error) {
      endpointError = endpoint === '' ? 'Required.' : (error as Error).message;
    }
  }
  const accountError =
    enabled && !gnoPublicAddress.safeParse(account).success ? 'Must be a g1... address.' : null;

  const chainIdError = enabled && !gnoChainId.safeParse(chainId).success
    ? 'Chain ID must contain 1–128 characters without whitespace.' : null;
  return { enabled, endpoint, account, chainId, chainIdError, endpointError, accountError };
}
