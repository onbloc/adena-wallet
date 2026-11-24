import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Harness } from '../core';
import { createMcpReadToolSource } from './read-tool-source';

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
