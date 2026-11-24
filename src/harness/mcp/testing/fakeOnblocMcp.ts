// An in-process Onbloc MCP server for tests: answers the streamable-HTTP calls the harness makes.

import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export type FakeOnblocTool = {
  name: string;
  description?: string;
  inputSchema?: Tool['inputSchema'];
  outputSchema?: Tool['outputSchema'];
  annotations?: Tool['annotations'];
  execution?: Tool['execution'];
  output?: unknown;
  content?: CallToolResult['content'];
  isError?: boolean;
};

const field = { type: 'string' };
const page = { type: ['integer', 'null'] };
const schemas: Record<string, Tool['inputSchema']> = {
  get_native_balance: { type: 'object', properties: { address: field }, required: ['address'], additionalProperties: false },
  get_nfts_balance: { type: 'object', properties: { address: field }, required: ['address'], additionalProperties: false },
  get_token_balances: { type: 'object', properties: { address: field }, required: ['address'], additionalProperties: false },
  list_account_transactions: { type: 'object', properties: { address: field, cursor: field, limit: page }, required: ['address'], additionalProperties: false },
  list_native_transfers: { type: 'object', properties: { address: field, page, limit: page }, required: ['address'], additionalProperties: false },
  list_token_transfers: {
    type: 'object', properties: { address: { type: ['string', 'null'] }, tokenKey: { type: ['string', 'null'] }, page, limit: page },
    additionalProperties: false,
  },
  get_realm_info: { type: 'object', properties: { path: field }, required: ['path'], additionalProperties: false },
  get_realm_source: { type: 'object', properties: { path: field, filename: field }, required: ['path', 'filename'], additionalProperties: false },
  get_token_info: { type: 'object', properties: { tokenKey: field }, required: ['tokenKey'], additionalProperties: false },
  get_transaction: { type: 'object', properties: { txHash: field }, required: ['txHash'], additionalProperties: false },
};

/** An in-process server with independently configurable discovery and tool results. */
export function fakeOnblocMcp(tools: readonly FakeOnblocTool[]) {
  const calls: { name: string; arguments: unknown }[] = [];

  const fetcher: typeof fetch = async (_url, init) => {
    if (init?.method !== 'POST') return new Response(null, { status: 405 });
    const request = JSON.parse(String(init.body));
    if (request.id === undefined) return new Response(null, { status: 202 });
    let result;
    switch (request.method) {
      case 'initialize':
        result = {
          protocolVersion: '2025-11-25',
          capabilities: { tools: {} },
          serverInfo: { name: 'onbloc', version: '1' },
        };
        break;
      case 'tools/list':
        result = {
          tools: tools.map(({ name, description, inputSchema, outputSchema, annotations, execution }) => ({
            name,
            description: description ?? name,
            inputSchema: inputSchema ?? schemas[name] ?? { type: 'object', properties: {}, additionalProperties: false },
            ...(outputSchema ? { outputSchema } : {}),
            annotations: annotations ?? { readOnlyHint: true },
            ...(execution ? { execution } : {}),
          })),
        };
        break;
      case 'tools/call': {
        calls.push(request.params);
        const tool = tools.find(({ name }) => name === request.params.name);
        result = {
          content: tool?.content ?? [],
          ...(tool?.output !== undefined ? { structuredContent: tool.output } : {}),
          ...(tool?.isError ? { isError: true } : {}),
        };
        break;
      }
      default:
        throw new Error(`Unexpected method ${request.method}`);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  return { fetcher, calls };
}
