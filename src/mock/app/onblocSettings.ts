import { gnoPublicAddress } from '../../harness/mcp/gno';
import { parseOnblocEndpoint } from '../../harness/mcp/onbloc-endpoint';

export const DEFAULT_ONBLOC_MCP_URL = 'https://dev-gnoscan-v2.api.onbloc.xyz/mcp';
export const DEFAULT_ONBLOC_ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';

export type OnblocSettings = {
  /** Both fields empty: the mock wallet is used instead of Onbloc. */
  enabled: boolean;
  endpoint: string;
  account: string;
  endpointError: string | null;
  accountError: string | null;
};

/** Validates the raw Settings inputs. Empty fields are not errors unless the other one is set. */
export function resolveOnblocSettings(
  rawEndpoint: string,
  rawAccount: string,
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

  return { enabled, endpoint, account, endpointError, accountError };
}
