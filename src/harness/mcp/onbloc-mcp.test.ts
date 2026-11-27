import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Harness } from '../core';
import { createOnblocToolSource, GNO_MAINNET_CHAIN } from './index';
import { fakeOnblocMcp, type FakeOnblocTool } from './testing/fakeOnblocMcp';

const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const endpoint = 'https://example.test/mcp';
const invalidInput = { kind: 'denied', code: 'INVALID_INPUT' };
const invalidOutput = { kind: 'denied', code: 'INVALID_OUTPUT' };
const realm = 'gno.land/r/gnoswap/gns';

async function open(tools: FakeOnblocTool[], trustedServerEnforcesReadOnly?: true) {
  const { fetcher, calls } = fakeOnblocMcp(tools);
  const run = await new Harness({ toolSources: [createOnblocToolSource({ endpoint, fetcher, trustedServerEnforcesReadOnly })] }).startRun({
    account, chainId: GNO_MAINNET_CHAIN, operationId: 'onbloc-test', scope: 'read-only', purpose: 'mainnet-read',
    budget: { maxToolCalls: 30 },
  });
  return { run, calls };
}

const outputSchema: Tool['outputSchema'] = {
  type: 'object', properties: { content: { type: 'string' } }, required: ['content'], additionalProperties: false,
};
const text = (value: string) => [{ type: 'text' as const, text: value }];

describe('Onbloc discovered read policy', () => {
  it('keeps all ten reviewed reads, binding the account only for wallet-scoped calls', async () => {
    const examples = [
      ['get_native_balance', {}],
      ['get_nfts_balance', {}],
      ['get_token_balances', {}],
      ['list_account_transactions', { cursor: 'next', limit: 10 }],
      ['list_native_transfers', { page: 2 }],
      ['list_token_transfers', {}],
      ['get_realm_info', { path: realm }],
      ['get_realm_source', { path: realm, filename: 'gns.gno' }],
      ['get_token_info', { tokenKey: realm }],
      ['get_transaction', { txHash: '1234' }],
    ] as const;
    const { run, calls } = await open(examples.map(([name]) => ({ name, output: {} })));
    try {
      expect(run.tools.map(tool => tool.name)).toEqual(examples.map(([name]) => name));
      for (const [name, input] of examples) {
        expect(await run.dispatch({ name, input })).toMatchObject({ kind: 'result' });
      }
      expect(calls.slice(0, 6)).toEqual(examples.slice(0, 6).map(([name, input]) => ({
        name, arguments: { ...input, address: account },
      })));
      expect(calls.slice(6)).toEqual(examples.slice(6).map(([name, input]) => ({ name, arguments: input })));
    } finally { run.close(); }
  });

  it('does not grant authority to an unknown tool or to a known tool with a write hint', async () => {
    const { run, calls } = await open([
      { name: 'send_transaction', output: { ok: true }, annotations: { readOnlyHint: true } },
      { name: 'get_realm_info', output: {}, annotations: { readOnlyHint: false } },
      { name: 'get_realm_source', output: {}, annotations: { destructiveHint: true } },
      { name: 'get_token_info', output: {} },
    ]);
    try {
      expect(run.tools.map(tool => tool.name)).toEqual(['get_token_info']);
      expect(await run.dispatch({ name: 'send_transaction', input: {} })).toEqual({ kind: 'denied', code: 'UNKNOWN_TOOL' });
      expect(calls).toEqual([]);
    } finally { run.close(); }
  });

  it('uses the remote description and newly added optional fields without forwarding the account', async () => {
    const { run, calls } = await open([{
      name: 'get_realm_info', description: 'Updated description', output: { name: 'gns' },
      inputSchema: {
        type: 'object', properties: { path: { type: 'string' }, includePrivate: { type: 'boolean' } },
        required: ['path'], additionalProperties: false,
      },
    }]);
    try {
      expect(run.tools[0]).toMatchObject({ description: 'Updated description', jsonSchema: {
        properties: { path: { type: 'string' }, includePrivate: { type: 'boolean' } },
      } });
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: realm, includePrivate: true } })).toEqual({
        kind: 'result', value: { chainId: GNO_MAINNET_CHAIN, untrustedData: { name: 'gns' } },
      });
      expect(calls).toEqual([{ name: 'get_realm_info', arguments: { path: realm, includePrivate: true } }]);
    } finally { run.close(); }
  });

  it('requires review for new mandatory inputs and account or network selectors', async () => {
    const base = { path: { type: 'string' } };
    const { run } = await open([
      { name: 'get_realm_info', output: {}, inputSchema: {
        type: 'object', properties: { ...base, identity: { type: 'string' } }, required: ['path', 'identity'],
      } },
      { name: 'get_realm_source', output: {}, inputSchema: {
        type: 'object', properties: { ...base, filename: { type: 'string' }, walletAddress: { type: 'string' } },
        required: ['path', 'filename'],
      } },
      { name: 'get_token_info', output: {}, inputSchema: {
        type: 'object', properties: { tokenKey: { type: 'string' }, options: {
          type: 'object', properties: { network: { type: 'string' } },
        } }, required: ['tokenKey'],
      } },
    ]);
    try { expect(run.tools).toEqual([]); } finally { run.close(); }
  });

  it('rejects model-supplied identity selectors and the bound address hidden in arbitrary input', async () => {
    const { run, calls } = await open([
      { name: 'get_native_balance', output: { address: account } },
      { name: 'get_realm_info', output: {}, inputSchema: {
        type: 'object', properties: { path: { type: 'string' }, options: { type: 'object' } },
        required: ['path'], additionalProperties: false,
      } },
    ]);
    try {
      expect(await run.dispatch({ name: 'get_native_balance', input: { address: account } })).toEqual(invalidInput);
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: `gno.land/r/${account}` } })).toEqual(invalidInput);
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: realm, options: { value: account } } })).toEqual(invalidInput);
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: realm, options: { wallet: 'anyone' } } })).toEqual(invalidInput);
      expect(calls).toEqual([]);
    } finally { run.close(); }
  });

  it('supports public token history without injecting an account, and binds account history otherwise', async () => {
    const { run, calls } = await open([{ name: 'list_token_transfers', output: { items: [] } }]);
    try {
      expect(await run.dispatch({ name: 'list_token_transfers', input: { tokenKey: realm, limit: 10 } })).toMatchObject({ kind: 'result' });
      expect(await run.dispatch({ name: 'list_token_transfers', input: { page: 2 } })).toMatchObject({ kind: 'result' });
      expect(await run.dispatch({ name: 'list_token_transfers', input: { tokenKey: account } })).toEqual(invalidInput);
      expect(await run.dispatch({ name: 'list_token_transfers', input: { tokenKey: '' } })).toEqual(invalidInput);
      expect(calls).toEqual([
        { name: 'list_token_transfers', arguments: { tokenKey: realm, limit: 10 } },
        { name: 'list_token_transfers', arguments: { address: account, page: 2 } },
      ]);
    } finally { run.close(); }
  });

  it.each(['list_account_transactions', 'list_native_transfers', 'list_token_transfers'])(
    'limits over-returned items for reviewed pagination: %s', async name => {
      const items = [{ hash: 'one' }, { hash: 'two' }, { hash: 'three' }, { hash: 'four' }];
      const { run } = await open([{ name, output: { address: account, items } }]);
      try {
        expect(await run.dispatch({ name, input: { limit: 3 } })).toMatchObject({
          kind: 'result', value: { untrustedData: { address: account, items: items.slice(0, 3) } },
        });
      } finally { run.close(); }
    },
  );

  it('does not project unknown result shapes or unrelated reads', async () => {
    const entries = [1, 2, 3, 4];
    const { run } = await open([
      { name: 'list_account_transactions', output: { address: account, transactions: entries } },
      { name: 'custom_read', output: { items: entries }, inputSchema: {
        type: 'object', properties: { limit: { type: 'integer' } }, additionalProperties: false,
      } },
    ], true);
    try {
      expect(await run.dispatch({ name: 'list_account_transactions', input: { limit: 3 } })).toMatchObject({
        kind: 'result', value: { untrustedData: { transactions: entries } },
      });
      expect(await run.dispatch({ name: 'custom_read', input: { limit: 3 } })).toMatchObject({
        kind: 'result', value: { untrustedData: { items: entries } },
      });
    } finally { run.close(); }
  });

  it('accepts bounded standard text as untrusted data only for public reads', async () => {
    const { run } = await open([
      { name: 'get_realm_source', content: [...text('package gns'), ...text('func BalanceOf() {}')] },
      { name: 'get_native_balance', content: text('100 GNOT') },
      { name: 'list_token_transfers', content: text('transfer history') },
    ]);
    try {
      expect(await run.dispatch({ name: 'get_realm_source', input: { path: realm, filename: 'gns.gno' } })).toEqual({
        kind: 'result', value: { chainId: GNO_MAINNET_CHAIN, untrustedData: { text: 'package gns\nfunc BalanceOf() {}' } },
      });
      expect(await run.dispatch({ name: 'get_native_balance', input: {} })).toEqual(invalidOutput);
      expect(await run.dispatch({ name: 'list_token_transfers', input: {} })).toEqual(invalidOutput);
      expect(await run.dispatch({ name: 'list_token_transfers', input: { tokenKey: realm } })).toMatchObject({
        kind: 'result', value: { untrustedData: { text: 'transfer history' } },
      });
    } finally { run.close(); }
  });

  it('enforces the declared output schema instead of falling back to text', async () => {
    const { run } = await open([
      { name: 'get_realm_info', outputSchema, content: text('text only') },
      { name: 'get_realm_source', outputSchema, output: { content: 42 }, content: text('valid-looking text') },
      { name: 'get_token_info', outputSchema, output: { content: 'metadata' } },
      { name: 'get_transaction', outputSchema, output: { content: 'ok', unexpected: true } },
    ]);
    try {
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: realm } })).toEqual(invalidOutput);
      expect(await run.dispatch({ name: 'get_realm_source', input: { path: realm, filename: 'x.gno' } })).toEqual(invalidOutput);
      expect(await run.dispatch({ name: 'get_token_info', input: { tokenKey: realm } })).toEqual({
        kind: 'result', value: { chainId: GNO_MAINNET_CHAIN, untrustedData: { content: 'metadata' } },
      });
      expect(await run.dispatch({ name: 'get_transaction', input: { txHash: 'hash' } })).toEqual(invalidOutput);
    } finally { run.close(); }
  });

  it('rejects oversized, mixed-format, and error results rather than treating them as text', async () => {
    const { run } = await open([
      { name: 'get_realm_info', content: text('x'.repeat(12_001)) },
      { name: 'get_realm_source', content: [...text('partial'), { type: 'image', data: 'AA==', mimeType: 'image/png' }] },
      { name: 'get_token_info', output: { content: 'x'.repeat(12_001) } },
      { name: 'get_transaction', content: text('failure'), isError: true },
    ]);
    try {
      expect(await run.dispatch({ name: 'get_realm_info', input: { path: realm } })).toEqual({ kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' });
      expect(await run.dispatch({ name: 'get_realm_source', input: { path: realm, filename: 'x.gno' } })).toEqual(invalidOutput);
      expect(await run.dispatch({ name: 'get_token_info', input: { tokenKey: realm } })).toEqual({ kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' });
      expect(await run.dispatch({ name: 'get_transaction', input: { txHash: 'hash' } })).toEqual({ kind: 'denied', code: 'MCP_TOOL_ERROR' });
    } finally { run.close(); }
  });
  it('allows dynamically discovered reads only with host trust and never injects identity into new tools', async () => {
    const catalog: FakeOnblocTool[] = [
      { name: 'find_realm', inputSchema: { type: 'object', properties: { query: { type: 'string' } },
        required: ['query'], additionalProperties: false }, output: { found: true } },
      { name: 'unsafe', annotations: { readOnlyHint: false }, output: {} },
      { name: 'destructive', annotations: { destructiveHint: true }, output: {} },
    ];
    const { run, calls } = await open(catalog, true);
    try {
      expect(run.tools.map(tool => tool.name)).toContain('find_realm');
      expect(run.tools.map(tool => tool.name)).not.toContain('unsafe');
      expect(run.tools.map(tool => tool.name)).not.toContain('destructive');
      expect(await run.dispatch({ name: 'find_realm', input: { query: 'public' } })).toEqual({
        kind: 'result', value: { chainId: GNO_MAINNET_CHAIN, untrustedData: { found: true } },
      });
      expect(await run.dispatch({ name: 'find_realm', input: { query: account } })).toEqual(invalidInput);
      expect(await run.dispatch({ name: 'find_realm', input: { query: 'public', address: account } })).toEqual(invalidInput);
      expect(calls).toEqual([{ name: 'find_realm', arguments: { query: 'public' } }]);
    } finally { run.close(); }
  });

});
