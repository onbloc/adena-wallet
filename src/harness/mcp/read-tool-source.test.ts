import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { z } from 'zod';
import { Harness } from '../core';
import { createMcpReadToolSource } from './read-tool-source';
import { discoveredReadTool } from './discovered-read-tool';

it('routes same-named reads to their configured server and rejects model-supplied accounts', async () => {
  const clients: Client[] = [];
  const servers: McpServer[] = [];
  const input = z.strictObject({});
  try {
    const sources = [];
    for (const namespace of ['first', 'second']) {
      const server = new McpServer({ name: namespace, version: '1' });
      servers.push(server);
      server.registerTool('lookup', { inputSchema: { account: z.string() } }, ({ account }) => ({
        content: [], structuredContent: { account, provider: namespace },
      }));
      const client = new Client({ name: 'wallet', version: '1' });
      clients.push(client);
      const [local, remote] = InMemoryTransport.createLinkedPair();
      await server.connect(remote);
      await client.connect(local);
      sources.push(createMcpReadToolSource({ namespace, client, supports: context => context.chainId === 'example', operations: {
        lookup: {
          description: 'Lookup the active account', inputSchema: { type: 'object', additionalProperties: false },
          arguments: (raw, ctx) => input.safeParse(raw).success ? { account: ctx.account } : undefined,
          parse: (raw, ctx) => z.object({ account: z.literal(ctx.account), provider: z.string() }).safeParse(raw).data,
        },
      } }));
    }
    const run = await new Harness({ toolSources: sources }).startRun({ account: 'active', chainId: 'example',
      scope: 'read-only', purpose: 'mainnet-read', operationId: 'two-servers' });
    try {
      for (const namespace of ['first', 'second']) {
        expect(await run.dispatch({ name: `${namespace}__lookup`, input: {} })).toEqual({ kind: 'result',
          value: { chainId: 'example', untrustedData: { account: 'active', provider: namespace } } });
      }
      expect(await run.dispatch({ name: 'second__lookup', input: { account: 'other' } })).toEqual({ kind: 'denied', code: 'INVALID_INPUT' });
    } finally { run.close(); }
  } finally { await Promise.all([...clients, ...servers].map(peer => peer.close())); }
});

it('reuses discovered schemas with host-owned account permissions for another provider', async () => {
  const context = { account: 'active-account', chainId: 'example' };
  const calls: Record<string, unknown>[] = [];
  const remote = discoveredReadTool({
    tool: {
      name: 'lookup', description: 'Find an item',
      inputSchema: {
        type: 'object', properties: { ownerAccount: { type: 'string' }, query: { type: 'string' } },
        required: ['ownerAccount', 'query'], additionalProperties: false,
      },
    },
    permission: { requiredFields: ['query'], account: { field: 'ownerAccount' } },
    context, validator: new AjvJsonSchemaValidator(),
    call: async args => {
      calls.push(args);
      return { content: [], structuredContent: { result: 'found' } };
    },
  });
  if (!remote) throw new Error('Reviewed tool was not exposed');
  const run = await new Harness({ toolSources: [async () => new Map([['lookup', remote]])] }).startRun({
    ...context, operationId: 'other-provider', scope: 'read-only', purpose: 'mainnet-read',
  });
  try {
    expect(await run.dispatch({ name: 'lookup', input: { query: 'item' } })).toEqual({
      kind: 'result', value: { chainId: 'example', untrustedData: { result: 'found' } },
    });
    expect(await run.dispatch({ name: 'lookup', input: { query: 'item', ownerAccount: 'someone-else' } }))
      .toEqual({ kind: 'denied', code: 'INVALID_INPUT' });
    expect(calls).toEqual([{ query: 'item', ownerAccount: 'active-account' }]);
  } finally { run.close(); }
});
