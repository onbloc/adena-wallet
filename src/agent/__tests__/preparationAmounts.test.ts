import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { LLMFromModel, type GenerateEvent } from '../../llm/core';
import { AIAgent } from '../agent';
import type { PreparationProposal } from '../requestIntent';
import { ACCOUNT, FRIEND, fakeWallet } from '../testing/fakeWallet';
import { intentReplyText } from '../testing/intentReply';
import { WalletError, type PreparedTransaction } from '../wallet/port';

const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
const answer = (text: string) => ({ content: [{ type: 'text' as const, text }], finishReason: { unified: 'stop' as const, raw: 'stop' }, usage, warnings: [] });
const transfer = (asset: string, amount: Exclude<PreparationProposal, { operation: 'clarification' }>['amount']): PreparationProposal => ({
  operation: 'transfer', recipient: FRIEND.alias, asset: { kind: 'symbol', value: asset }, amount,
});

async function run(prompt: string, proposal: PreparationProposal, options: { nativeUnits?: string; failWith?: WalletError } = {}) {
  const mcp = fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: options.nativeUnits ?? '42000000' } },
    { name: 'get_token_balances', output: { address: ACCOUNT, items: [
      { symbol: 'GNS', tokenId: 'gno.land/r/gns', amount: '250000000', decimals: 6 },
    ] } },
  ]);
  const wallet = fakeWallet({ contacts: [FRIEND], failWith: options.failWith });
  const prepared: PreparedTransaction[] = [];
  const model = new MockLanguageModelV4({ doGenerate: [answer(intentReplyText({ kind: 'prepare' })), answer(JSON.stringify(proposal))] });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] });
  const agent = new AIAgent({ llm, harness, wallet, onTransaction: transaction => { prepared.push(transaction); } });
  const events: GenerateEvent[] = [];
  for await (const event of agent.run({ prompt }, { account: ACCOUNT, allowTransactionPreparation: true })) events.push(event);
  return { wallet, prepared, events };
}

describe('grounded preparation amounts', () => {
  it('resolves a Korean percentage against the verified token balance', async () => {
    const result = await run('내 GNS의 20%를 carol에게 보내줘', transfer('GNS', { kind: 'fraction', numerator: '1', denominator: '5' }));
    expect(result.wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '50', token: 'GNS' } }]);
    expect(result.prepared).toHaveLength(1);
  });

  it('prepares the exact quantity expressed as a Korean mixed number', async () => {
    const result = await run('carol에게 GNOT 1개 반 보내줘', transfer('GNOT', { kind: 'exact', value: '1.5' }));
    expect(result.wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '1.5', token: 'GNOT' } }]);
    expect(result.prepared).toHaveLength(1);
  });

  it('passes a native base-unit quantity to the wallet without treating it as a display amount', async () => {
    const result = await run('Send 1000000 ugnot to carol', transfer('ugnot', { kind: 'exact', value: '1000000' }));
    expect(result.wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '1', token: 'GNOT' } }]);
    expect(result.prepared).toHaveLength(1);
  });

  it('refuses an unrepresentable share instead of rounding the smallest unit', async () => {
    const result = await run('내 GNOT의 절반을 carol에게 보내줘', transfer('GNOT', { kind: 'fraction', numerator: '1', denominator: '2' }), { nativeUnits: '1' });
    expect(result.wallet.calls).toEqual([]);
    expect(result.prepared).toEqual([]);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'text', delta: expect.stringContaining('smallest unit') }));
  });

  it('resolves a share of an id-kind ugnot asset in base units', async () => {
    const proposal: PreparationProposal = {
      operation: 'transfer', recipient: FRIEND.alias, asset: { kind: 'id', value: 'ugnot' }, amount: { kind: 'fraction', numerator: '1', denominator: '2' },
    };
    const result = await run('send half my ugnot to carol', proposal);
    expect(result.wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '21', token: 'GNOT' } }]);
  });

  it('does not replace an unknown token with a known asset', async () => {
    const result = await run('Send 1 got to carol', transfer('got', { kind: 'exact', value: '1' }), {
      failWith: new WalletError('unknown_token', 'Unknown token got'),
    });
    expect(result.wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '1', token: 'got' } }]);
    expect(result.prepared).toEqual([]);
  });
});
