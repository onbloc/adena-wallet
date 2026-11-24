import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { discoveredReadTool, type DiscoveredReadPermission } from './discovered-read-tool';
import { parseOnblocEndpoint } from './onbloc-endpoint';
import { gnoPublicAddress, GNO_MAINNET_CHAIN } from './gno';
import type { RemoteTool, ToolSource } from '../core';

/** Supply the approved mainnet endpoint from trusted application configuration, not user input. */
export type OnblocMcpConfig = Readonly<{
  endpoint: string;
  fetcher?: typeof fetch;
  allowLoopbackHttp?: true;
  /** Host assertion that this specific server enforces read-only access. Never derive from endpoint input or server hints. */
  trustedServerEnforcesReadOnly?: true;
}>;

/** The harness tool source for an Onbloc MCP: mainnet reads for a valid public address. */
export function createOnblocToolSource(config: OnblocMcpConfig): ToolSource {
  const read = createOnblocReader(config);
  return async ({ account, chainId }, signal) =>
    chainId === GNO_MAINNET_CHAIN && gnoPublicAddress.safeParse(account).success ? read(account, signal) : new Map();
}

// Discovery supplies schemas, not authority. Only these host-reviewed reads may be exposed.
const account = { field: 'address' } as const;
const permissions: Readonly<Record<string, DiscoveredReadPermission>> = {
  get_native_balance: { requiredFields: [], account },
  get_nfts_balance: { requiredFields: [], account },
  get_token_balances: { requiredFields: [], account },
  list_account_transactions: { requiredFields: ['cursor', 'limit'], account },
  list_native_transfers: { requiredFields: ['page', 'limit'], account },
  list_token_transfers: {
    requiredFields: ['page', 'limit', 'tokenKey'], account: { ...account, unlessProvided: 'tokenKey' },
  },
  get_realm_info: { requiredFields: ['path'] },
  get_realm_source: { requiredFields: ['path', 'filename'] },
  get_token_info: { requiredFields: ['tokenKey'] },
  get_transaction: { requiredFields: ['txHash'] },
};
const maxDiscoveryPages = 4;
const maxDiscoveredTools = 32;
const maxCatalogChars = 32_000;

export function createOnblocReader({ endpoint, fetcher, allowLoopbackHttp, trustedServerEnforcesReadOnly }: OnblocMcpConfig) {
  const url = parseOnblocEndpoint(endpoint, allowLoopbackHttp);

  return async (address: string, signal: AbortSignal) => {
    const validator = new AjvJsonSchemaValidator();
    const client = new Client({ name: 'adena-wallet-harness', version: '0.1.0' });
    const transport = new StreamableHTTPClientTransport(url, { fetch: fetcher, requestInit: { redirect: 'error' } });
    const options = { signal, timeout: 12000 };
    const close = () => { void client.close().catch(() => {}); };
    signal.addEventListener('abort', close, { once: true });
    const tools = new Map<string, RemoteTool>();
    try {
      if (signal.aborted) throw new Error('Onbloc discovery cancelled.');
      await client.connect(transport, options);
      let cursor: string | undefined;
      const cursors = new Set<string>();
      let pages = 0;
      let discovered = 0;
      let catalogChars = 0;
      const seen = new Set<string>();
      do {
        if (++pages > maxDiscoveryPages) throw new Error('Onbloc MCP discovery exceeded the page limit.');
        const page = await client.request({ method: 'tools/list', params: cursor === undefined ? {} : { cursor } }, ListToolsResultSchema, options);
        discovered += page.tools.length;
        catalogChars += JSON.stringify(page.tools).length;
        if (discovered > maxDiscoveredTools || catalogChars > maxCatalogChars) {
          throw new Error('Onbloc MCP discovery exceeded the catalog limit.');
        }
        for (const tool of page.tools) {
          const { name } = tool;
          if (!Object.hasOwn(permissions, name) && !trustedServerEnforcesReadOnly) continue;
          if (seen.has(name)) throw new Error('Duplicate Onbloc tool name.');
          seen.add(name);
          const remote = discoveredReadTool({
            tool,
            permission: Object.hasOwn(permissions, name) ? permissions[name] : undefined,
            trustedServerEnforcesReadOnly,
            context: { account: address, chainId: GNO_MAINNET_CHAIN },
            validator,
            call: args => client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema, options),
            accepts(data, input, accountBound) {
              const requestedHash = input.txHash;
              if (typeof requestedHash === 'string' && typeof data.txHash === 'string' &&
                requestedHash.toLowerCase() !== data.txHash.toLowerCase() && requestedHash !== data.txHashBase64) return false;
              return !((Object.hasOwn(data, 'network') && data.network !== GNO_MAINNET_CHAIN) ||
                (accountBound && ((Object.hasOwn(data, 'address') && data.address !== address) ||
                  (Array.isArray(data.items) && data.items.some(item => item && typeof item === 'object' &&
                    'address' in item && item.address !== address)))));
            },
          });
          if (remote) tools.set(name, remote);
        }
        cursor = page.nextCursor;
        if (cursor !== undefined) {
          if (cursors.has(cursor)) throw new Error('Repeated Onbloc tools cursor.');
          cursors.add(cursor);
        }
      } while (cursor !== undefined);
      if (signal.aborted) throw new Error('Onbloc discovery cancelled.');
      return tools;
    } catch (error) {
      signal.removeEventListener('abort', close);
      await client.close();
      throw error;
    }
  };
}

