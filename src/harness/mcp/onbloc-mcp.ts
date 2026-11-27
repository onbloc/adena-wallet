import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import { parseOnblocEndpoint } from './onbloc-endpoint';
import { gnoPublicAddress, GNO_MAINNET_CHAIN } from './gno';
import type { RemoteTool, ToolSource } from '../core';

/** Supply the approved mainnet endpoint from trusted application configuration, not user input. */
export type OnblocMcpConfig = Readonly<{ endpoint: string; fetcher?: typeof fetch; allowLoopbackHttp?: true }>;

/** The harness tool source for an Onbloc MCP: mainnet reads for a valid public address. */
export function createOnblocToolSource(config: OnblocMcpConfig): ToolSource {
  const read = createOnblocReader(config);
  return async ({ account, chainId }, signal) =>
    chainId === GNO_MAINNET_CHAIN && gnoPublicAddress.safeParse(account).success ? read(account, signal) : new Map();
}

const record = z.record(z.string(), z.unknown());

const invalidInput = { kind: 'denied', code: 'INVALID_INPUT' } as const;
const invalidOutput = { kind: 'denied', code: 'INVALID_OUTPUT' } as const;
const maxDiscoveryPages = 4;
const maxDiscoveredTools = 32;
const maxCatalogChars = 32_000;
const maxResultChars = 12_000;

export function createOnblocReader({ endpoint, fetcher, allowLoopbackHttp }: OnblocMcpConfig) {
  const url = parseOnblocEndpoint(endpoint, allowLoopbackHttp);

  return async (address: string, signal: AbortSignal) => {
    const validator = new CfWorkerJsonSchemaValidator();
    const client = new Client({ name: 'ai-agent-harness', version: '0.1.0' }, { jsonSchemaValidator: validator });
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
      do {
        if (++pages > maxDiscoveryPages) throw new Error('Onbloc MCP discovery exceeded the page limit.');
        const page = await client.request({ method: 'tools/list', params: cursor === undefined ? {} : { cursor } }, ListToolsResultSchema, options);
        discovered += page.tools.length;
        catalogChars += JSON.stringify(page.tools).length;
        if (discovered > maxDiscoveredTools || catalogChars > maxCatalogChars) {
          throw new Error('Onbloc MCP discovery exceeded the catalog limit.');
        }
        for (const { name, description, inputSchema, outputSchema, annotations, execution } of page.tools) {
          // Trust the configured read-only service, not annotations as authorization.
          // Honor explicit write hints as an additional guard against accidental exposure.
          if (execution?.taskSupport === 'required' || annotations?.readOnlyHint === false || annotations?.destructiveHint === true ||
            !/^[a-zA-Z0-9_-]{1,64}$/.test(name)) continue;
          if (tools.has(name)) throw new Error('Duplicate Onbloc tool name.');

          const { address: addressProperty, ...properties } = inputSchema.properties ?? {};
          const walletScoped = addressProperty !== undefined || inputSchema.required?.includes('address') === true;
          const tokenAlternative = walletScoped && !inputSchema.required?.includes('address') && Object.hasOwn(properties, 'tokenKey');
          const jsonSchema = walletScoped ? {
            ...inputSchema,
            properties,
            required: inputSchema.required?.filter(field => field !== 'address'),
          } : inputSchema;
          const validate = validator.getValidator(inputSchema);
          const validateOutput = outputSchema && validator.getValidator(outputSchema);
          tools.set(name, {
            definition: { name, description: description ?? '', jsonSchema },
            async execute(raw) {
              const parsedInput = record.safeParse(raw);
              if (!parsedInput.success || Object.hasOwn(parsedInput.data, 'address')) return invalidInput;
              // An optional address alongside tokenKey is Onbloc's public token history selector.
              const input = parsedInput.data;
              const injectAddress = walletScoped && !(tokenAlternative && Object.hasOwn(input, 'tokenKey'));
              const args = injectAddress ? { ...input, address } : input;
              if (!validate(args).valid) return invalidInput;
              const result = await client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema, options);
              if (result.isError) return { kind: 'denied', code: 'MCP_TOOL_ERROR' };
              if (result.structuredContent && JSON.stringify(result.structuredContent).length > maxResultChars) {
                return { kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' };
              }
              if (validateOutput && !validateOutput(result.structuredContent).valid) return invalidOutput;
              const parsed = record.safeParse(result.structuredContent);
              if (!parsed.success) return invalidOutput;
              const data = parsed.data;
              const requestedHash = input.txHash;
              if (typeof requestedHash === 'string' && typeof data.txHash === 'string' &&
                requestedHash.toLowerCase() !== data.txHash.toLowerCase() && requestedHash !== data.txHashBase64) return invalidOutput;
              if ((Object.hasOwn(data, 'network') && data.network !== GNO_MAINNET_CHAIN) ||
                (injectAddress && ((Object.hasOwn(data, 'address') && data.address !== address) ||
                  (Array.isArray(data.items) && data.items.some(item => item && typeof item === 'object' &&
                    'address' in item && item.address !== address))))) return invalidOutput;
              return { kind: 'result', value: { chainId: GNO_MAINNET_CHAIN, untrustedData: data } };
            },
          });
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

