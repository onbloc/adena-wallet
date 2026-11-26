import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { DEFAULT_BUDGET, Harness, type Budget } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp, type FakeOnblocTool } from '../../harness/mcp/testing/fakeOnblocMcp';
import { canRememberTurn, LLMFromModel, type GenerateEvent, type LLM } from '../../llm/core';
import { AIAgent } from '../agent';
import type { BalanceRequest } from '../balanceOperation';
import type { PreparationProposal, RequestIntent } from '../requestIntent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet, type FakeWalletOptions } from '../testing/fakeWallet';
import { intentReplyText } from '../testing/intentReply';
import { WalletError, type PreparedTransaction } from '../wallet/port';

const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
type Content = { type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: string };
type Step = { content: Content[]; finishReason: { unified: 'stop' | 'tool-calls' | 'length'; raw: string }; usage: typeof usage; warnings: [] };
const step = (content: Content[], reason: 'stop' | 'tool-calls'): Step => ({ content, finishReason: { unified: reason, raw: reason }, usage, warnings: [] });
const answer = (text: string) => step([{ type: 'text', text }], 'stop');
const call = (toolName: string, input: unknown = {}, id = toolName) => step([{ type: 'tool-call', toolName, toolCallId: id, input: JSON.stringify(input) }], 'tool-calls');
const one = (value: string): BalanceRequest => ({ kind: 'one', asset: { kind: 'symbol', value } });
const native: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request: one('GNOT') }] };
const prepare: RequestIntent = { kind: 'prepare' };
const proposal = (value: PreparationProposal) => answer(JSON.stringify(value));
const transferProposal: PreparationProposal = { operation: 'transfer', recipient: RECIPIENT,
  asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } };
const send = proposal(transferProposal);
const half = proposal({ operation: 'transfer', recipient: FRIEND.alias,
  asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'fraction', numerator: '1', denominator: '2' } });
const permission = { account: ACCOUNT, allowTransactionPreparation: true };
async function collect(events: AsyncIterable<GenerateEvent>) { const out: GenerateEvent[] = []; for await (const event of events) out.push(event); return out; }
const textOf = (events: GenerateEvent[]) => events.filter(event => event.type === 'text').map(event => event.delta).join('');
const doneOf = (events: GenerateEvent[]) => events.find(event => event.type === 'done');
function setup(steps: Step[], { intent = native, selection, walletOptions, remote = true, withWallet = true, failAudit = false, classificationText, tools, budget }: {
  intent?: RequestIntent; selection?: string[]; walletOptions?: FakeWalletOptions; remote?: boolean; withWallet?: boolean; failAudit?: boolean;
  classificationText?: string; tools?: FakeOnblocTool[]; budget?: Partial<Budget>;
} = {}) {
  const mcp = fakeOnblocMcp(tools ?? [
    { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '42000000' } },
    { name: 'get_token_balances', output: { address: ACCOUNT, items: [
      { symbol: 'GNS', tokenId: 'gno.land/r/gns', amount: '250000000', decimals: 6 },
      { symbol: 'xGNS', tokenId: 'gno.land/r/xgns', amount: '300', decimals: 0 },
    ] } },
    { name: 'list_account_transactions', output: { address: ACCOUNT, items: [{ hash: 'tx-123', amount: '2' }] } },
  ]);
  const fetcher = jest.fn(mcp.fetcher);
  const wallet = fakeWallet({ contacts: [FRIEND], ...walletOptions });
  const prepared: PreparedTransaction[] = [];
  const model = new MockLanguageModelV4({ doGenerate: [answer(classificationText ?? intentReplyText(intent)),
    ...(selection === undefined ? [] : [answer(JSON.stringify({ toolNames: selection }))]), ...steps] });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  const harness = new Harness({ budget: { ...DEFAULT_BUDGET, ...budget }, audit: () => { if (failAudit) throw new Error('Audit storage failed'); },
    toolSources: remote ? [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher })] : [] });
  const agent = withWallet ? new AIAgent({ llm, harness, wallet, onTransaction: transaction => { prepared.push(transaction); } })
    : new AIAgent({ llm, harness });
  return { agent, model, wallet, prepared, mcp, fetcher, llm, harness };
}

describe('integrated request execution', () => {
  it('renders normalized exact units for the bound account with no arithmetic model step', async () => {
    const { agent, model, mcp } = setup([]);
    const events = await collect(agent.run({ prompt: 'My GNOT balance?' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain(ACCOUNT);
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: ACCOUNT } }]);
    expect(model.doGenerateCalls).toHaveLength(1);
  });
  it('reads current data with an account and harness without requiring a wallet', async () => {
    const { agent } = setup([], { withWallet: false });
    const events = await collect(agent.run({ prompt: 'My balance?' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain(ACCOUNT);
  });
  it('reads an explicitly named public address rather than the active account and identifies it in the answer', async () => {
    const { agent, mcp } = setup([], { classificationText: JSON.stringify({ route: 'lookup', requests: native.requests, account: RECIPIENT }), tools: [
      { name: 'get_native_balance', output: { address: RECIPIENT, denom: 'ugnot', balance: '7000000' } },
    ] });
    const events = await collect(agent.run({ prompt: `What is the GNOT balance of ${RECIPIENT}?` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: RECIPIENT } }]);
    expect(textOf(events)).toContain('7 GNOT');
    expect(textOf(events)).toContain(RECIPIENT);
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
  });
  it('reads a single explicitly referenced Korean address even if classification omits the account', async () => {
    const address = 'g1nkjy6s86gfz937284zh0flpgcjqtpfqjmceffq';
    const { agent, mcp } = setup([], { intent: native, tools: [
      { name: 'get_native_balance', output: { address, denom: 'ugnot', balance: '7000000' } },
    ] });
    const events = await collect(agent.run({ prompt: `${address} 해당 주소의 잔고 보여줘` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address } }]);
    expect(textOf(events)).toContain(address);
    expect(textOf(events)).toContain('7 GNOT');
  });
  it('reads an explicitly named public address without an active account', async () => {
    const { agent, mcp } = setup([], { withWallet: false, classificationText: JSON.stringify({ route: 'lookup', requests: native.requests, account: RECIPIENT }), tools: [
      { name: 'get_native_balance', output: { address: RECIPIENT, denom: 'ugnot', balance: '7000000' } },
    ] });
    const events = await collect(agent.run({ prompt: `What is the GNOT balance of ${RECIPIENT}?` }, {}));
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: RECIPIENT } }]);
    expect(textOf(events)).toContain(RECIPIENT);
    expect(textOf(events)).toContain('7 GNOT');
  });
  it('asks which address to read instead of choosing between multiple public addresses', async () => {
    const { agent, mcp } = setup([], { classificationText: JSON.stringify({ route: 'lookup', requests: native.requests, account: RECIPIENT }) });
    const events = await collect(agent.run({ prompt: `What is the GNOT balance of ${RECIPIENT} and ${FRIEND.address}?` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(textOf(events)).toMatch(/which|clarif|specify/i);
  });
  it('keeps the structured getBalance API independent of classification and generation', async () => {
    const { agent, model } = setup([]);
    expect(await agent.getBalance({ kind: 'all' }, { account: ACCOUNT })).toMatchObject({ status: 'complete', assets: expect.arrayContaining([
      expect.objectContaining({ symbol: 'GNOT', amount: '42000000' }), expect.objectContaining({ symbol: 'xGNS', amount: '300' }),
    ]) });
    expect(model.doGenerateCalls).toHaveLength(0);
  });
  it('retains each distinct requested asset rather than a raw model summary', async () => {
    const { agent } = setup([], { intent: { kind: 'lookup', requests: [{ target: 'balance', request: one('GNS') }, { target: 'balance', request: one('xGNS') }] } });
    const events = await collect(agent.run({ prompt: 'My GNS and xGNS balances?' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('250 GNS (gno.land/r/gns)');
    expect(textOf(events)).toContain('300 xGNS (gno.land/r/xgns)');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
  });
  it('does not trust a classifier-selected symbol embedded in a different requested symbol', async () => {
    const { agent } = setup([], { intent: { kind: 'lookup', requests: [{ target: 'balance', request: one('GNS') }] } });
    const events = await collect(agent.run({ prompt: 'My xGNS balance?' }, { account: ACCOUNT }));
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
    expect(textOf(events)).toContain('selected asset differs');
  });
  it('displays partial normalized assets but does not commit an incomplete portfolio', async () => {
    const { agent } = setup([], { intent: { kind: 'lookup', requests: [{ target: 'balance', request: { kind: 'all' } }] },
      tools: [{ name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '1000000' } }] });
    const events = await collect(agent.run({ prompt: 'Show all my assets.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('1 GNOT');
    expect(textOf(events)).toContain('token balances');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
  });
  it('preserves explanation and fresh balance in both the answer and retained conversation', async () => {
    const { agent } = setup([answer('GNOT is native to Gno.land.')], { intent: { kind: 'lookup', requests: [{ target: 'balance', request: one('GNOT') }], explanation: 'What is GNOT?' } });
    const events = await collect(agent.run({ prompt: 'Explain GNOT and show my balance.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain('GNOT is native to Gno.land.');
    expect(agent.turns[0].answer).toBe(textOf(events));
  });
  it.each(['length', 'throw', 'missing-terminal'] as const)('preserves facts but not a compound answer when its explanation ends with %s', async ending => {
    const explanation = 'What is GNOT?';
    const { llm: delegate, harness } = setup([], { intent: { ...native, explanation } });
    let calls = 0;
    const llm: LLM = {
      contextTokens: delegate.contextTokens,
      async *generate(settings, options) {
        if (calls++ === 0) { yield* delegate.generate(settings, options); return; }
        yield { type: 'text', delta: 'GNOT is the native' };
        if (ending === 'throw') throw new Error('Explanation interrupted');
        if (ending === 'length') yield { type: 'done', aborted: false, finishReason: 'length',
          warnings: [], messages: [{ role: 'assistant', content: 'GNOT is the native' }], metrics: { totalMs: 1, ttftMs: 1 } };
      },
    };
    const agent = new AIAgent({ llm, harness });
    const events = await collect(agent.run({ prompt: 'Explain GNOT and show my balance.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain('GNOT is the native');
    expect(textOf(events)).toContain('explanation did not complete');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(doneOf(events)!)).toBe(false);
    expect(agent.turns).toEqual([]);
  });
  it('retains a selected read after an invalid attempt is corrected', async () => {
    const { agent, mcp } = setup([
      call('list_account_transactions', { limit: 'five' }, 'invalid'),
      call('list_account_transactions', { limit: 5 }, 'corrected'),
    ], { intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] },
      selection: ['list_account_transactions'] });
    const events = await collect(agent.run({ prompt: 'List my recent transactions.' }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'list_account_transactions', arguments: { address: ACCOUNT, limit: 5 } }]);
    expect(textOf(events)).toContain('tx-123');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
    expect(agent.turns[0].answer).toBe(textOf(events));
  });
  it('preserves approval data next to normalized balances', async () => {
    const { agent } = setup([call('get_approvals')], { intent: { kind: 'lookup', requests: [
      { target: 'balance', request: one('GNOT') }, { target: 'other', query: 'List my approvals.' },
    ] }, selection: ['get_approvals'], walletOptions: { allowances: [{ spender: RECIPIENT, token: 'GNS', amount: '10' }] } });
    const events = await collect(agent.run({ prompt: 'Balance and approvals.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain(RECIPIENT);
    expect(textOf(events)).toContain('"amount": "10"');
    expect(agent.turns[0].answer).toBe(textOf(events));
  });
  it('does not accept an unrelated balance call instead of selected transaction history', async () => {
    const { agent, mcp } = setup([call('get_native_balance'), answer('All history returned.')], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt: 'Recent transactions.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('could not be verified');
    expect(mcp.calls).toEqual([]);
    expect(agent.turns).toEqual([]);
  });
  it('renders every selected history result and stops without a summary model call', async () => {
    const { agent, model } = setup([call('list_account_transactions', { limit: 5 })], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt: 'Recent transactions.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('tx-123');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(3);
  });
  it('reads explicitly named account history instead of the active account', async () => {
    const { agent, mcp } = setup([call('list_account_transactions', { limit: 5 })], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: `List recent transactions for ${RECIPIENT}.` }] },
      classificationText: JSON.stringify({ route: 'lookup', requests: [{ target: 'other', query: `List recent transactions for ${RECIPIENT}.` }], account: RECIPIENT }),
      selection: ['list_account_transactions'],
      tools: [{ name: 'list_account_transactions', output: { address: RECIPIENT, items: [{ hash: 'other-tx' }] } }],
    });
    const events = await collect(agent.run({ prompt: `Recent transactions for ${RECIPIENT}.` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'list_account_transactions', arguments: { address: RECIPIENT, limit: 5 } }]);
    expect(textOf(events)).toContain('other-tx');
    expect(textOf(events)).toContain(RECIPIENT);
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
  });
  it('uses the active account for history when no address is named', async () => {
    const { agent, mcp } = setup([call('list_account_transactions', { limit: 5 })], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt: 'Recent transactions.' }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'list_account_transactions', arguments: { address: ACCOUNT, limit: 5 } }]);
    expect(textOf(events)).toContain(ACCOUNT);
    expect(textOf(events)).toContain('tx-123');
  });
  it('asks for clarification before reading history for multiple addresses', async () => {
    const { agent, mcp } = setup([], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] },
      classificationText: JSON.stringify({ route: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }], account: RECIPIENT }),
      selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt: `Recent transactions for ${RECIPIENT} and ${FRIEND.address}.` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(textOf(events)).toMatch(/which|clarif|specify/i);
  });
  it('does not commit the available part when another requested capability is unavailable', async () => {
    const { agent } = setup([], { intent: { kind: 'lookup', requests: [{ target: 'balance', request: one('GNOT') }, { target: 'other', query: 'List sessions.' }] }, selection: [] });
    const events = await collect(agent.run({ prompt: 'Balance and sessions.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(agent.turns).toEqual([]);
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
  });
  it('uses wallet allowance reads without external MCP or address-book access', async () => {
    const { agent, wallet } = setup([call('get_approvals')], { intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List approvals.' }] }, selection: ['get_approvals'], remote: false,
      walletOptions: { allowances: [{ spender: RECIPIENT, token: 'GNS', amount: '10' }] } });
    wallet.getContacts = jest.fn().mockRejectedValue(new Error('Address book unavailable'));
    const events = await collect(agent.run({ prompt: 'Show approvals.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain(RECIPIENT);
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
    expect(wallet.getContacts).not.toHaveBeenCalled();
  });
  it('requires host opt-in even when the classifier requests preparation', async () => {
    const { agent, prepared, fetcher, model } = setup([send], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send 1 GNOT to carol.' }, { account: ACCOUNT }));
    expect(prepared).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(textOf(events)).toContain('not enabled');
  });
  it('cannot use host opt-in to turn a read request into preparation', async () => {
    const { agent, prepared } = setup([send]);
    expect(textOf(await collect(agent.run({ prompt: 'My GNOT balance?' }, permission)))).toContain('42 GNOT');
    expect(prepared).toEqual([]);
  });
  it('prepares once without external reads or a fallible post-preparation model call', async () => {
    const { agent, model, prepared, wallet, fetcher } = setup([send], { intent: prepare, remote: false });
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ from: ACCOUNT, to: RECIPIENT, amount: '1' });
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' } }]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-call', name: 'transfer', input: { to: RECIPIENT, amount: '1', token: 'GNOT' } }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'transfer', output: expect.objectContaining({ kind: 'result' }) }));
    expect(textOf(events)).toContain('Unsigned transaction prepared');
    expect(doneOf(events)?.messages).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('keeps the active sender after looking up another public address', async () => {
    const { agent, mcp, wallet, prepared } = setup([answer(intentReplyText(prepare)), send], {
      classificationText: JSON.stringify({ route: 'lookup', requests: native.requests, account: FRIEND.address }),
      tools: [{ name: 'get_native_balance', output: { address: FRIEND.address, denom: 'ugnot', balance: '7000000' } }],
    });
    const read = await collect(agent.run({ prompt: `What is the GNOT balance of ${FRIEND.address}?` }, { account: ACCOUNT }));
    expect(textOf(read)).toContain(FRIEND.address);
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: FRIEND.address } }]);
    await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ from: ACCOUNT, to: RECIPIENT });
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' } }]);
  });
  it('preserves a completed handoff and reports auditing failure separately', async () => {
    const { agent, prepared, model } = setup([send], { intent: prepare, failAudit: true });
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
    expect(textOf(events)).toContain('Unsigned transaction prepared');
    expect(doneOf(events)?.warnings.some(warning => warning.includes('Audit'))).toBe(true);
    expect(events.some(event => event.type === 'tool-error')).toBe(false);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('obtains a normalized prerequisite and its exact units before a relative transfer', async () => {
    const { agent, model, prepared, mcp } = setup([half], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send half my GNOT to carol.' }, permission));
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: ACCOUNT } }]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-call', name: 'get_balance', input: one('GNOT') }));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ to: FRIEND.address, amount: '21', from: ACCOUNT });
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('respects the host call budget across the prerequisite and preparation', async () => {
    const { agent, prepared, wallet, mcp } = setup([half], { intent: prepare, budget: { maxToolCalls: 1 } });
    const events = await collect(agent.run({ prompt: 'Send half my GNOT to carol.' }, permission));
    expect(prepared).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(mcp.calls.map(call => call.name)).toEqual(['get_native_balance']);
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'transfer', output: { kind: 'denied', code: 'BUDGET_EXHAUSTED' } }));
  });
  it('reports definitive wallet refusals without letting the model substitute a new amount', async () => {
    const { agent, prepared, model, wallet } = setup([send, proposal({ ...transferProposal, amount: { kind: 'exact', value: '0.1' } })], {
      intent: prepare, walletOptions: { failWith: new WalletError('insufficient_balance', 'Available balance is zero.') },
    });
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toEqual([]);
    expect(textOf(events)).toContain('Available balance is zero.');
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' } }]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('prepares the requested approval with the recipient alias and never substitutes a transfer', async () => {
    const { agent, prepared, model, wallet, fetcher } = setup([proposal({ operation: 'approve', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNS' }, amount: { kind: 'exact', value: '10' } })], { intent: prepare, remote: false });
    const events = await collect(agent.run({ prompt: 'Let carol spend 10 GNS.' }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ type: 'allowance', spender: FRIEND.address, amount: '10' });
    expect(wallet.calls).toEqual([{ method: 'approve', params: { from: ACCOUNT, spender: FRIEND.address, amount: '10', token: 'GNS' } }]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'approve', output: expect.objectContaining({ kind: 'result' }) }));
    expect(textOf(events)).toContain('Unsigned transaction prepared');
    expect(fetcher).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('does not substitute a transfer when the wallet cannot prepare approvals', async () => {
    const { agent, prepared, wallet, model, fetcher } = setup([proposal({ operation: 'approve', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNS' }, amount: { kind: 'exact', value: '10' } })], { intent: prepare, walletOptions: { approve: false } });
    const events = await collect(agent.run({ prompt: 'Let carol spend 10 GNS.' }, permission));
    expect(prepared).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).not.toContain('Unsigned transaction prepared');
    expect(fetcher).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('asks which of two named people to pay instead of preparing for one of them', async () => {
    const { agent, prepared, wallet, fetcher } = setup([proposal({ ...transferProposal, recipient: FRIEND.alias })], { intent: prepare });
    wallet.getContacts = async () => [FRIEND];
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to carol and to ${RECIPIENT}.` }, permission));
    expect(textOf(events)).toBe(`Who should receive it: carol or ${RECIPIENT}?`);
    expect(prepared).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(agent.turns[0]).toEqual({ prompt: `Send 1 GNOT to carol and to ${RECIPIENT}.`, answer: textOf(events) });
  });
  it('retains planner clarification and resolves a follow-up without replaying preparation authority', async () => {
    const question = 'Who should receive 1 GNOT?';
    const { agent, prepared, wallet, fetcher, model } = setup([
      proposal({ operation: 'clarification', question }), answer(intentReplyText(prepare)),
      proposal({ ...transferProposal, recipient: FRIEND.alias }), answer(intentReplyText({ kind: 'explanation' })), answer('You are welcome.'),
    ], { intent: prepare });
    wallet.getContacts = jest.fn().mockRejectedValue(new Error('Address book unavailable'));
    const run = (prompt: string) => collect(agent.run({ prompt }, permission));
    const clarification = await run('Send 1 GNOT.');
    expect(textOf(clarification)).toBe(question);
    expect(prepared).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(agent.turns[0]).toEqual({ prompt: 'Send 1 GNOT.', answer: question });
    expect(wallet.getContacts).not.toHaveBeenCalled();
    wallet.getContacts = async () => [FRIEND];
    await run('To carol.');
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ to: FRIEND.address, amount: '1' });
    expect(JSON.stringify(model.doGenerateCalls[3].prompt)).toContain(question);
    await run('Thanks.');
    expect(wallet.calls).toHaveLength(1);
    expect(prepared).toHaveLength(1);
    expect(model.doGenerateCalls).toHaveLength(6);
  });
  it.each([
    { units: '9223372036854775806', numerator: '1', denominator: '2', expected: '4611686018427.387903' },
    { units: '42000000', numerator: '125', denominator: '1000', expected: '5.25' },
  ])('calculates $numerator/$denominator of $units base units without floating-point loss', async ({ units, numerator, denominator, expected }) => {
    const { agent, prepared, wallet } = setup([proposal({ ...transferProposal,
      amount: { kind: 'fraction', numerator, denominator } })], { intent: prepare,
      tools: [{ name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: units } }] });
    await collect(agent.run({ prompt: `Send ${numerator}/${denominator} of my GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: expected, token: 'GNOT' } }]);
    expect(prepared[0].summary.amount).toBe(expected);
  });
  it('rejects a fractional base-unit remainder instead of rounding the transfer', async () => {
    const { agent, wallet, prepared, model } = setup([half], { intent: prepare,
      tools: [{ name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '42000001' } }] });
    const events = await collect(agent.run({ prompt: 'Send half my GNOT to carol.' }, permission));
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'get_balance' }));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).not.toContain('Unsigned transaction prepared');
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it.each<{ status: string; tools: FakeOnblocTool[] }>([
    { status: 'partial', tools: [{ name: 'get_token_balances', output: { address: ACCOUNT, hasMore: true,
      items: [{ symbol: 'GNS', tokenId: 'gno.land/r/gns', amount: '42000000', decimals: 6 }] } }] },
    { status: 'ambiguous', tools: [{ name: 'get_token_balances', output: { address: ACCOUNT, items: [
      { symbol: 'GNS', tokenId: 'gno.land/r/gns', amount: '42000000', decimals: 6 },
      { symbol: 'GNS', tokenId: 'gno.land/r/other', amount: '10000000', decimals: 6 },
    ] } }] },
    { status: 'unavailable', tools: [] },
  ])('does not prepare from a $status normalized balance', async ({ status, tools }) => {
    const { agent, wallet, prepared } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNS' }, amount: { kind: 'fraction', numerator: '1', denominator: '2' } })],
    { intent: prepare, tools });
    const events = await collect(agent.run({ prompt: 'Send half my GNS to carol.' }, permission));
    expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'get_balance',
      output: expect.objectContaining({ kind: 'result', value: expect.objectContaining({ status }) }) }));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).not.toContain('Unsigned transaction prepared');
  });
  it('does not prepare a relative transfer after its prerequisite audit fails', async () => {
    const { agent, wallet, prepared } = setup([half], { intent: prepare, failAudit: true });
    const events = await collect(agent.run({ prompt: 'Send half my GNOT to carol.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).not.toContain('Unsigned transaction prepared');
  });
  it.each([
    'not JSON',
    '{"operation":"transfer"',
    JSON.stringify({ operation: 'transfer' }),
    JSON.stringify({ ...transferProposal, from: ACCOUNT }),
    JSON.stringify({ ...transferProposal, amount: { kind: 'fraction', numerator: '1', denominator: '0' } }),
    JSON.stringify([transferProposal, transferProposal]),
  ])('rejects malformed preparation output before discovery or execution: %s', async output => {
    const { agent, wallet, prepared, fetcher, model } = setup([answer(output)], { intent: prepare });
    await expect(collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission))).rejects.toThrow('ADENA_PREPARATION_INVALID');
    expect(fetcher).not.toHaveBeenCalled();
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('rejects a length-truncated proposal even when its JSON is otherwise valid', async () => {
    const { agent, wallet, prepared, fetcher, model } = setup([{ ...send,
      finishReason: { unified: 'length', raw: 'length' } }], { intent: prepare });
    await expect(collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission))).rejects.toThrow('ADENA_PREPARATION_INVALID');
    expect(fetcher).not.toHaveBeenCalled();
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('performs no discovery or wallet work when proposal generation is cancelled', async () => {
    const controller = new AbortController();
    const { agent, llm, fetcher, wallet, prepared } = setup([send], { intent: prepare });
    const generate = llm.generate.bind(llm);
    let calls = 0;
    jest.spyOn(llm, 'generate').mockImplementation((settings, options) => {
      if (++calls === 1) return generate(settings, options);
      return (async function* (): AsyncGenerator<GenerateEvent> {
        yield { type: 'text', delta: '{"operation":' };
        controller.abort();
        yield { type: 'done', aborted: true, warnings: [], messages: [],
          metrics: { totalMs: 1, ttftMs: null, outputTokens: 1 } };
      })();
    });
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, { ...permission, signal: controller.signal }));
    expect(calls).toBe(2);
    expect(doneOf(events)?.aborted).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });
  it('avoids discovery for pure explanations and invalid or cancelled classifications', async () => {
    const plain = setup([answer('GNOT is native to Gno.land.')], { intent: { kind: 'explanation' } });
    await collect(plain.agent.run({ prompt: 'What is GNOT?' }, { account: ACCOUNT }));
    expect(plain.fetcher).not.toHaveBeenCalled();
    const invalid = setup([], { classificationText: 'not JSON' });
    await expect(collect(invalid.agent.run({ prompt: 'Read data.' }, { account: ACCOUNT }))).rejects.toThrow('ADENA_INTENT_INVALID');
    expect(invalid.fetcher).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    const stopped = setup([]);
    expect(doneOf(await collect(stopped.agent.run({ prompt: 'Read data.' }, { account: ACCOUNT, signal: controller.signal })))?.aborted).toBe(true);
    expect(stopped.fetcher).not.toHaveBeenCalled();
  });
  it('answers a question without an account: the route never depends on one', async () => {
    const { agent, model, wallet } = setup([answer('GNOT is the native token.')], { intent: { kind: 'explanation' } });
    expect(textOf(await collect(agent.run({ prompt: 'What is GNOT?' })))).toBe('GNOT is the native token.');
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(wallet.calls).toEqual([]);
  });
  it('answers small talk freely and remembers it, without tools or the explanation warning', async () => {
    const { agent, model, mcp } = setup([answer('Why did the token cross the chain? To get to the other block.')], { intent: { kind: 'chat' } });
    const events = await collect(agent.run({ prompt: 'Tell me a joke.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('other block');
    const done = doneOf(events);
    expect(done).toMatchObject({ warnings: [], aborted: false });
    expect(done?.type === 'done' && canRememberTurn(done)).toBe(true);
    expect(mcp.calls).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it.each([
    ['a balance lookup', native],
    ['a transfer', prepare],
  ])('asks the host to link a wallet when %s has no account', async (_label, intent) => {
    const { agent, mcp, wallet, model } = setup([send], { intent });
    await expect(collect(agent.run({ prompt: 'Send 1 GNOT to carol.' }, { allowTransactionPreparation: true }))).rejects.toThrow('ADENA_ACCOUNT_REQUIRED');
    expect(mcp.calls).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});

describe('indexed source evidence', () => {
  const path = 'gno.land/r/example/vault';
  const signature = 'func Deposit(owner address, amount int64) int64';
  const info: FakeOnblocTool = { name: 'get_realm_info', output: { path, sourceFiles: ['vault.gno'], functions: [{ filename: 'vault.gno', line: 3, name: 'Deposit', signature }] } };
  const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'other', query: `${path}: show Deposit implementation.` }] };
  it('fetches only the indexed source and cites its implementation instead of model invention', async () => {
    const { agent, model, mcp } = setup([call('get_realm_info', { path })], { withWallet: false, intent, selection: ['get_realm_info', 'get_realm_source'], tools: [info,
      { name: 'get_realm_source', output: { path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} {\n return amount\n}` } },
    ] });
    const events = await collect(agent.run({ prompt: `${path}: Deposit의 구현을 보여줘` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain(`${path}/vault.gno:3`);
    expect(textOf(events)).toContain('return amount');
    expect(mcp.calls.map(call => call.name)).toEqual(['get_realm_info', 'get_realm_source']);
    expect(model.doGenerateCalls).toHaveLength(3);
  });
  it.each([
    ['wrong realm', { path: 'gno.land/r/other', filename: 'vault.gno', content: signature + ' {}' }],
    ['wrong file', { path, filename: 'other.gno', content: signature + ' {}' }],
    ['comment only', { path, filename: 'vault.gno', content: '\n\n// ' + signature + ' {}' }],
    ['wrong declaration', { path, filename: 'vault.gno', content: '\n\nfunc Deposit() {}' }],
  ])('does not trust %s source evidence', async (_label, source) => {
    const { agent } = setup([call('get_realm_info', { path })], { withWallet: false, intent, selection: ['get_realm_info'], tools: [info, { name: 'get_realm_source', output: source }] });
    const events = await collect(agent.run({ prompt: `${path}: Deposit implementation?` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('could not be verified');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
  });
});
