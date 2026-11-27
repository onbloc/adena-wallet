// An in-process Onbloc MCP server for tests: answers the streamable-HTTP calls the harness makes.

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export type FakeOnblocTool = {
  name: string;
  output: Record<string, unknown>;
  inputSchema?: Tool['inputSchema'];
  outputSchema?: Tool['outputSchema'];
};

/** Tools default to an account `address` input and return their fixed `output`. */
export function fakeOnblocMcp(tools: readonly FakeOnblocTool[]) {
  const calls: { name: string; arguments: unknown }[] = [];
  const defaultInputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: { address: { type: 'string' } },
    required: ['address'],
    additionalProperties: false,
  };

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
          tools: tools.map(({ name, inputSchema = defaultInputSchema, outputSchema }) => ({
            name,
            description: name,
            inputSchema,
            outputSchema,
            annotations: { readOnlyHint: true },
          })),
        };
        break;
      case 'tools/call':
        calls.push(request.params);
        result = {
          content: [],
          structuredContent: tools.find(({ name }) => name === request.params.name)?.output,
        };
        break;
      default:
        throw new Error(`Unexpected method ${request.method}`);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  return { fetcher, calls };
}
