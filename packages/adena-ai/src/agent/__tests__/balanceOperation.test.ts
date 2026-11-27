import { MockLanguageModelV4 } from 'ai/test';

import { DEFAULT_BUDGET, Harness, type PolicyEvent, type RemoteTool } from '../../harness/core';
import { createOnblocToolSource, GNO_MAINNET_CHAIN } from '../../harness/mcp';
import { onblocBalanceAdapter } from '../onblocBalanceAdapter';
import { fakeOnblocMcp, type FakeOnblocTool } from '../../harness/mcp/testing/fakeOnblocMcp';
import { LLMFromModel } from '../../llm/core';
import { AIAgent } from '../agent';
import { formatBalance, getBalance, type BalanceAdapter, type BalanceRequest } from '../balanceOperation';
import { ACCOUNT } from '../testing/fakeWallet';

const native = { address: ACCOUNT, denom: 'ugnot', balance: '10000000' };
const testChain = 'onyx-1';
const token = { address: ACCOUNT, tokenId: 'gno.land/r/shared.X', packagePath: 'gno.land/r/shared', symbol: 'X', amount: '0', decimals: 6 };
const one = (value: string): BalanceRequest => ({ kind: 'one', asset: { kind: 'symbol', value } });
const all: BalanceRequest = { kind: 'all' };
const server = (tokenOutput: Record<string, unknown>, nativeOutput: Record<string, unknown> = native): FakeOnblocTool[] => [
  { name: 'get_native_balance', output: nativeOutput },
  { name: 'get_token_balances', output: tokenOutput },
];
const tokens = (items: unknown[], extra: Record<string, unknown> = {}) => ({ address: ACCOUNT, items, ...extra });

async function query(tools: FakeOnblocTool[], request: BalanceRequest, maxToolCalls = 4, chainId = GNO_MAINNET_CHAIN) {
  const mcp = fakeOnblocMcp(tools);
  const audit: PolicyEvent[] = [];
  const harness = new Harness({
    toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', chainId, fetcher: mcp.fetcher })],
    budget: { ...DEFAULT_BUDGET, maxToolCalls },
    audit: event => { audit.push(event); },
  });
  const run = await harness.startRun({
    account: ACCOUNT, chainId, operationId: 'balance-test', scope: 'read-only', purpose: 'mainnet-read',
  });
  try {
    const result = await getBalance(run, request, { account: ACCOUNT, chainId, adapter: onblocBalanceAdapter });
    return { result, calls: mcp.calls, audit };
  } finally {
    run.close();
  }
}

describe('structured balance operations', () => {
  it.each([GNO_MAINNET_CHAIN, testChain])('reads native and token balances on the configured chain %s', async chainId => {
    const { result, calls } = await query(server(
      tokens([{ ...token, amount: '2500000' }], { network: chainId }),
      { ...native, network: chainId },
    ), all, 4, chainId);
    expect(result).toMatchObject({
      account: ACCOUNT, chainId, status: 'complete', missing: [],
      assets: [
        { kind: 'native', symbol: 'GNOT', amount: '10000000' },
        { kind: 'token', assetId: token.tokenId, symbol: 'X', amount: '2500000' },
      ],
    });
    expect(calls).toEqual([
      { name: 'get_native_balance', arguments: { address: ACCOUNT } },
      { name: 'get_token_balances', arguments: { address: ACCOUNT } },
    ]);
  });

  it('accepts configured testnet balances when the provider omits its optional network field', async () => {
    const { result } = await query(server(tokens([token])), all, 4, testChain);
    expect(result).toMatchObject({
      chainId: testChain, status: 'complete', missing: [], assets: [{ symbol: 'GNOT' }, { symbol: 'X' }],
    });
  });

  it.each([GNO_MAINNET_CHAIN, 'foreign-test-chain'])('rejects native and token data from %s on a configured testnet', async network => {
    const { result, audit } = await query(server(
      tokens([token], { network }), { ...native, network },
    ), all, 4, testChain);
    expect(result).toMatchObject({ chainId: testChain, status: 'unavailable', missing: ['native', 'tokens'], assets: [] });
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'get_native_balance', decision: 'denied', denial: 'INVALID_OUTPUT' }),
      expect.objectContaining({ tool: 'get_token_balances', decision: 'denied', denial: 'INVALID_OUTPUT' }),
    ]));
  });

  it.each([
    ['foreign result envelopes', GNO_MAINNET_CHAIN, testChain],
    ['foreign structured networks', testChain, GNO_MAINNET_CHAIN],
  ])('independently rejects %s in the balance adapter', async (_label, envelopeChain, network) => {
    const remotes = ['get_native_balance', 'get_token_balances'].map<RemoteTool>(name => ({
      definition: { name, description: 'Read a balance', jsonSchema: { type: 'object', properties: {} } },
      execute: async () => ({
        kind: 'result', value: {
          chainId: envelopeChain,
          untrustedData: name === 'get_native_balance' ? { ...native, network } : tokens([token], { network }),
        },
      }),
    }));
    const run = await new Harness({
      toolSources: [async () => new Map(remotes.map(remote => [remote.definition.name, remote]))],
    }).startRun({ account: ACCOUNT, chainId: testChain, operationId: 'balance-chain-check', scope: 'read-only', purpose: 'mainnet-read' });
    try {
      const result = await getBalance(run, all, { account: ACCOUNT, chainId: testChain, adapter: onblocBalanceAdapter });
      expect(result).toMatchObject({ status: 'unavailable', missing: ['native', 'tokens'], assets: [] });
    } finally { run.close(); }
  });

  it('distinguishes a true zero from a token absent from a complete response', async () => {
    const present = await query(server(tokens([token])), one('X'));
    expect(present.result).toMatchObject({ status: 'complete', missing: [], assets: [{ symbol: 'X', amount: '0' }] });
    expect(formatBalance(present.result)).toBe('0 X (gno.land/r/shared.X)');
    const absent = await query(server(tokens([token])), one('Y'));
    expect(absent.result).toMatchObject({ status: 'unavailable', missing: [], assets: [] });
    expect(formatBalance(absent.result)).toBe('No Y balance was returned for this account.');
  });

  it('reports duplicate symbols as ambiguous and allows disambiguation by asset ID', async () => {
    const other = { ...token, tokenId: 'gno.land/r/other.X', packagePath: 'gno.land/r/other', amount: '123' };
    const tools = server(tokens([token, other]));
    const ambiguous = await query(tools, one('X'));
    expect(ambiguous.result).toMatchObject({ status: 'ambiguous', assets: [{ assetId: token.tokenId }, { assetId: other.tokenId }] });
    const selected = await query(tools, { kind: 'one', asset: { kind: 'id', value: other.tokenId } });
    expect(selected.result).toMatchObject({ status: 'complete', assets: [{ assetId: other.tokenId, amount: '123' }] });
  });

  it('keeps distinct token IDs sharing a package path distinct', async () => {
    const other = { ...token, tokenId: 'gno.land/r/shared.Y', symbol: 'Y', amount: '7' };
    const { result } = await query(server(tokens([token, other])), all);
    expect(result).toMatchObject({
      status: 'complete',
      assets: expect.arrayContaining([
        expect.objectContaining({ assetId: token.tokenId, symbol: 'X' }),
        expect.objectContaining({ assetId: other.tokenId, symbol: 'Y' }),
      ]),
    });
  });

  it('does not trust duplicate asset IDs with conflicting balances', async () => {
    const { result } = await query(server(tokens([token, { ...token, amount: '10' }])), all);
    expect(result).toMatchObject({ status: 'partial', missing: ['tokens'], assets: [{ symbol: 'GNOT' }] });
  });

  it.each([
    ['a continuation cursor', { nextCursor: 'next' }],
    ['a has-more flag', { hasMore: true }],
    ['a total larger than the page', { total: 2 }],
  ])('marks %s as partial instead of a complete portfolio', async (_label, page) => {
    const { result } = await query(server(tokens([token], page)), all);
    expect(result).toMatchObject({ status: 'partial', missing: ['tokens'] });
    expect(result.assets).toEqual(expect.arrayContaining([expect.objectContaining({ assetId: token.tokenId })]));
  });

  it('rejects malformed token amounts without losing the verified native balance', async () => {
    const { result } = await query(server(tokens([{ ...token, amount: '-1' }])), all);
    expect(result).toMatchObject({ status: 'partial', missing: ['tokens'], assets: [{ symbol: 'GNOT' }] });
  });

  it('keeps valid tokens and flags the scope partial when one item is malformed', async () => {
    const odd = { ...token, tokenId: 'gno.land/r/odd.GNS', symbol: '$GNS' };
    const { result } = await query(server(tokens([odd, { ...token, tokenId: 'gno.land/r/ok.OK', symbol: 'OK' }])), all);
    expect(result).toMatchObject({ status: 'partial', missing: ['tokens'] });
    expect(result.assets.map(asset => asset.symbol)).toEqual(['GNOT', 'OK']);
  });

  it('does not turn an unstructured balance claim into a verified balance', async () => {
    const { result, audit } = await query([
      { name: 'get_native_balance', content: [{ type: 'text', text: '100 GNOT' }] },
    ], one('GNOT'));
    expect(result).toMatchObject({ status: 'unavailable', missing: ['native'], assets: [] });
    expect(audit).toContainEqual(expect.objectContaining({
      tool: 'get_native_balance', decision: 'denied', denial: 'INVALID_OUTPUT',
    }));
  });

  it.each([
    ['another account', { ...native, address: 'g1anotheraccount' }],
    ['another network', { ...native, network: 'another-chain' }],
  ])('rejects provider data claiming %s', async (_label, wrongNative) => {
    const { result } = await query(server(tokens([token]), wrongNative), all);
    expect(result).toMatchObject({ status: 'partial', missing: ['native'], assets: [{ symbol: 'X' }] });
  });

  it('applies and audits the same run budget to underlying provider calls', async () => {
    const { result, calls, audit } = await query(server(tokens([token])), all, 1);
    expect(result).toMatchObject({ status: 'partial', missing: ['tokens'], assets: [{ symbol: 'GNOT' }] });
    expect(calls.map(call => call.name)).toEqual(['get_native_balance']);
    expect(audit).toContainEqual(expect.objectContaining({ tool: 'get_token_balances', decision: 'denied', denial: 'BUDGET_EXHAUSTED' }));
  });

  it('rejects an account or chain different from the bound harness run before calling the adapter', async () => {
    const run = await new Harness().startRun({ account: ACCOUNT, chainId: GNO_MAINNET_CHAIN, operationId: 'scope-test', scope: 'read-only' });
    const read = jest.fn(async () => ({ assets: [], missing: [] }));
    const adapter: BalanceAdapter = { toolNames: [], read };
    try {
      await expect(getBalance(run, all, { account: 'another-account', chainId: GNO_MAINNET_CHAIN, adapter })).rejects.toThrow('Balance context does not match');
      await expect(getBalance(run, all, { account: ACCOUNT, chainId: 'another-chain', adapter })).rejects.toThrow('Balance context does not match');
      expect(read).not.toHaveBeenCalled();
    } finally {
      run.close();
    }
  });

  it('uses a host-injected adapter and its own provider on a different chain', async () => {
    const custom: RemoteTool = {
      definition: { name: 'custom_balance', description: 'Read a balance', jsonSchema: { type: 'object', properties: {} } },
      execute: async () => ({ kind: 'result', value: { amount: '1234' } }),
    };
    const audit: PolicyEvent[] = [];
    const harness = new Harness({
      toolSources: [async () => new Map([['custom_balance', custom]])],
      audit: event => { audit.push(event); },
    });
    const adapter: BalanceAdapter = {
      toolNames: ['custom_balance'],
      async read(run) {
        const value = await run.dispatch({ name: 'custom_balance', input: {} });
        if (value.kind !== 'result' || !value.value || typeof value.value !== 'object' ||
          !('amount' in value.value) || typeof value.value.amount !== 'string') {
          return { assets: [], missing: ['tokens'] };
        }
        return { assets: [{ kind: 'token', assetId: 'custom/coin', symbol: 'COIN', amount: value.value.amount, decimals: 2 }], missing: [] };
      },
    };
    const agent = new AIAgent({ llm: new LLMFromModel(new MockLanguageModelV4()), harness, chainId: 'custom-chain', balanceAdapter: adapter });
    const result = await agent.getBalance(one('COIN'), { account: 'custom-account' });
    expect(result).toMatchObject({ account: 'custom-account', chainId: 'custom-chain', status: 'complete', assets: [{ amount: '1234', symbol: 'COIN' }] });
    expect(audit).toContainEqual(expect.objectContaining({ tool: 'custom_balance', decision: 'result' }));
  });
});
