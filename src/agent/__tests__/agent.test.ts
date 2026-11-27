import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { Harness, type Budget, type HarnessRun } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp, type FakeOnblocTool } from '../../harness/mcp/testing/fakeOnblocMcp';
import { canRememberTurn, createChatSession, LLMFromModel, type GenerateEvent, type LLM } from '../../llm/core';
import { AIAgent } from '../agent';
import type { BalanceRequest } from '../balanceOperation';
import type { PreparationProposal, RequestIntent } from '../requestIntent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet, type FakeWalletOptions } from '../testing/fakeWallet';
import { intentReplyText } from '../testing/intentReply';
import { WalletError, type PreparedTransaction, type TransferSummary, type WalletOperationOptions } from '../wallet/port';

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
const transferProposal = { operation: 'transfer', recipient: RECIPIENT,
  asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } } satisfies PreparationProposal;
const send = proposal(transferProposal);
const half = proposal({ operation: 'transfer', recipient: FRIEND.alias,
  asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'fraction', numerator: '1', denominator: '2' } });
const permission = { account: ACCOUNT, allowTransactionPreparation: true };
async function collect(events: AsyncIterable<GenerateEvent>) { const out: GenerateEvent[] = []; for await (const event of events) out.push(event); return out; }
const textOf = (events: GenerateEvent[]) => events.filter(event => event.type === 'text').map(event => event.delta).join('');
const doneOf = (events: GenerateEvent[]) => events.find(event => event.type === 'done');
function setup(steps: Step[], { intent = native, selection, fit = true, fallbackFit, walletOptions, remote = true, withWallet = true, failAudit = false, classificationText, tools, budget, contextTokens }: {
  intent?: RequestIntent; selection?: string[]; fit?: boolean; fallbackFit?: boolean; walletOptions?: FakeWalletOptions; remote?: boolean; withWallet?: boolean; failAudit?: boolean;
  classificationText?: string; tools?: FakeOnblocTool[]; budget?: Partial<Budget>; contextTokens?: number;
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
    ...(intent.kind === 'lookup' && intent.explanation && intent.requests.some(request => request.target === 'balance')
      ? [answer('{"needsBalance":true}')] : []),
    ...(intent.kind === 'lookup' && intent.requests.some(request => request.target === 'balance' && request.request.kind === 'all')
      ? [answer('{"kind":"all"}')] : []),
    ...(selection === undefined ? [] : [answer(JSON.stringify({ toolNames: selection })),
      ...(selection.length ? [answer(JSON.stringify({ supported: fit }))] : [])]),
    ...(fallbackFit === undefined ? [] : [answer(JSON.stringify({ supported: fallbackFit }))]), ...steps] });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }), { contextTokens });
  const harness = new Harness({ audit: () => { if (failAudit) throw new Error('Audit storage failed'); },
    toolSources: remote ? [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher })] : [] });
  const agent = withWallet ? new AIAgent({ llm, harness, wallet, budget, onTransaction: transaction => { prepared.push(transaction); } })
    : new AIAgent({ llm, harness, budget });
  return { agent, model, wallet, prepared, mcp, fetcher, llm, harness };
}

describe('integrated request execution', () => {
  it.each([
    ['Send 1 MYST to carol.', 'MYST', 'unknown_token'],
    ['carol에게 MYST 1개 보내줘', 'MYST', 'unknown_token'],
    ['Send 1 GNOT to Morgan.', 'Morgan', 'invalid_address'],
    ['Morgan에게 GNOT 1개 보내줘', 'Morgan', 'invalid_address'],
  ] as const)('retains the requested identifier in localized wallet refusals: %s', async (prompt, identifier, code) => {
    const recipient = code === 'invalid_address' ? identifier : FRIEND.alias;
    const token = code === 'unknown_token' ? identifier : 'GNOT';
    const { agent, prepared } = setup([proposal({ operation: 'transfer', recipient,
      asset: { kind: 'symbol', value: token }, amount: { kind: 'exact', value: '1' } })],
    { intent: prepare, walletOptions: { failWith: new WalletError(code, 'Wallet refused') } });
    const events = await collect(agent.run({ prompt }, permission));
    expect(textOf(events)).toContain(identifier);
    expect(prepared).toEqual([]);
  });
  it.each(['Send -2 GNOT to carol.', 'carol에게 GNOT -2개 보내줘'])(
    'explains an invalid amount even when classified as chat: %s', async prompt => {
      const { agent, prepared, wallet } = setup([], { intent: { kind: 'chat' } });
      const events = await collect(agent.run({ prompt }, permission));
      expect(textOf(events)).toMatch(/amount|금액/i);
      expect(prepared).toEqual([]);
      expect(wallet.calls).toEqual([]);
    });
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
  it.each([false, true])('refuses a checksum-invalid explicit address without falling back to the active account (classified: %s)', async classified => {
    const address = RECIPIENT.slice(0, -1) + (RECIPIENT.endsWith('q') ? 'p' : 'q');
    const { agent, mcp, wallet } = setup([], { classificationText: JSON.stringify({
      route: 'lookup', requests: native.requests, ...(classified ? { account: address } : {}),
    }) });
    const events = await collect(agent.run({ prompt: `What is the GNOT balance of this address: ${address}?` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('valid Gno public address');
    expect(mcp.calls).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
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
  it('does not verify a balance selected by an invented package ID', async () => {
    const { agent } = setup([], { intent: { kind: 'lookup', requests: [
      { target: 'balance', request: { kind: 'one', asset: { kind: 'id', value: 'gno.land/r/gns' } } },
    ] } });
    const events = await collect(agent.run({ prompt: 'My GNS balance?' }, { account: ACCOUNT }));
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(textOf(events)).toContain('Please confirm which asset');
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
    const llm: LLM = {
      kind: delegate.kind,
      contextTokens: delegate.contextTokens,
      async *generate(settings, options) {
        if (settings.outputSchema !== undefined) { yield* delegate.generate(settings, options); return; }
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
    expect(agent.turns[0].answer).toContain('list_account_transactions result omitted from history.');
    expect(agent.turns[0].answer).not.toContain('tx-123');
  });
  it('preserves approval data next to normalized balances', async () => {
    const { agent } = setup([call('get_approvals')], { intent: { kind: 'lookup', requests: [
      { target: 'balance', request: one('GNOT') }, { target: 'other', query: 'List my approvals.' },
    ] }, selection: ['get_approvals'], walletOptions: { allowances: [{ spender: RECIPIENT, token: 'GNS', amount: '10' }] } });
    const events = await collect(agent.run({ prompt: 'Balance and approvals.' }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain(RECIPIENT);
    expect(textOf(events)).toContain('"amount": "10"');
    // The user sees the data; the conversation keeps only that it was read.
    expect(agent.turns[0].answer).toContain('get_approvals result omitted from history.');
    expect(agent.turns[0].answer).not.toContain(RECIPIENT);
    expect(agent.turns[0].answer).toContain('42 GNOT');
  });
  it('executes an argument-free selected NFT read without asking the model to invent arguments', async () => {
    const { agent, mcp } = setup([], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List my NFTs.' }] },
      selection: ['get_nfts_balance'],
      tools: [{ name: 'get_nfts_balance', output: { address: ACCOUNT, items: [{ name: 'Example NFT' }] } }],
    });
    const events = await collect(agent.run({ prompt: 'List my NFTs.' }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'get_nfts_balance', arguments: { address: ACCOUNT } }]);
    expect(textOf(events)).toContain('Example NFT');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
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
    expect(model.doGenerateCalls).toHaveLength(4);
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
  it.each(['Show the wallet transactions.', 'Show transactions of this account.'])('uses the active account when "the/this wallet" has no earlier address: %s', async prompt => {
    const { agent, mcp } = setup([call('list_account_transactions', { limit: 5 })], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    await collect(agent.run({ prompt }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([{ name: 'list_account_transactions', arguments: { address: ACCOUNT, limit: 5 } }]);
  });
  it('asks for an address when "that wallet" refers to nothing', async () => {
    const { agent, mcp } = setup([], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt: 'Show transactions of that wallet.' }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
    expect(textOf(events)).toContain('valid Gno public address');
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
  it('uses the classified self-contained query for selection', async () => {
    const { agent, model } = setup([], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'What is the current block height?' }] },
      selection: [],
    });
    const events = await collect(agent.run({ prompt: '지금 블록 높이 알려줘' }, { account: ACCOUNT }));
    expect(JSON.stringify(model.doGenerateCalls[1])).toContain('What is the current block height?');
    expect(textOf(events)).toContain('요청한 조회를 완료하지 못했습니다');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
  });
  it.each(['List my approvals.', 'What is the current block height?'])('does not execute a selected history tool when capability fit rejects %s', async query => {
    const { agent, mcp } = setup([], { intent: { kind: 'lookup', requests: [{ target: 'other', query }] },
      selection: ['list_account_transactions'], fit: false });
    const events = await collect(agent.run({ prompt: query }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
    expect(textOf(events)).toContain('Unable to complete');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
  });
  it.each([
    { prompt: 'Show approvals.', classifiedAccount: undefined },
    { prompt: `Show my existing token approvals for ${RECIPIENT}. Do not create an approval.`, classifiedAccount: RECIPIENT },
    { prompt: `${RECIPIENT}에게 내가 승인해 준 토큰 사용 권한을 보여줘. 새로 승인하지 마.`, classifiedAccount: RECIPIENT },
  ])('reads the owner’s allowances without treating the spender as an owner: $prompt', async ({ prompt, classifiedAccount }) => {
    const { agent, wallet } = setup([call('get_approvals')], { intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List approvals.' }], account: classifiedAccount }, selection: ['get_approvals'], remote: false,
      walletOptions: { allowances: [{ spender: RECIPIENT, token: 'GNS', amount: '10' }] } });
    wallet.getContacts = jest.fn().mockRejectedValue(new Error('Address book unavailable'));
    const events = await collect(agent.run({ prompt }, { account: ACCOUNT }));
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
  it.each(['transfer', 'approve'] as const)('rejects an unrequested %s target despite host permission', async operation => {
    const planned = proposal({ operation, recipient: RECIPIENT, asset: { kind: 'symbol', value: 'GNOT' },
      amount: { kind: 'exact', value: '1' } });
    const { agent, wallet, prepared } = setup([planned], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send 1 GNOT to carol.' }, permission));
    expect(textOf(events)).toContain('No transaction was prepared');
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).toMatch(/recipient|받는/iu);
    expect(agent.turns.at(-1)?.answer).toBe(textOf(events));
  });
  it('does not use the sole asset mention as an invented recipient', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: 'GNOT',
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send 1 GNOT.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).toMatch(/recipient/i);
  });
  it('grounds Latin names and quantities followed by Korean particles', async () => {
    const { agent, wallet, prepared } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    await collect(agent.run({ prompt: 'carol에게 GNOT 1개 보내줘' }, permission));
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '1', token: 'GNOT' } }]);
    expect(prepared).toHaveLength(1);
  });
  it('prepares a request following a recipient statement without treating the question as another asset', async () => {
    const { agent, prepared } = setup([proposal({ ...transferProposal, amount: { kind: 'exact', value: '2' } })], { intent: prepare });
    await collect(agent.run({ prompt: `${RECIPIENT} needs 2 GNOT, can you send it over?` }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ to: RECIPIENT, amount: '2', token: 'GNOT' });
  });
  it('prepares the exact decimal allowance for an explicitly named address', async () => {
    const planned = proposal({ operation: 'approve', recipient: RECIPIENT, asset: { kind: 'symbol', value: 'GNS' }, amount: { kind: 'exact', value: '7.5' } });
    const { agent, prepared } = setup([planned], { intent: prepare });
    await collect(agent.run({ prompt: `Let ${RECIPIENT} spend 7.5 GNS from my account` }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ spender: RECIPIENT, amount: '7.5', token: 'GNS' });
  });
  it('does not prepare one of multiple assets', async () => {
    const { agent, prepared } = setup([proposal({ ...transferProposal, amount: { kind: 'exact', value: '2' } })], { intent: prepare });
    await collect(agent.run({ prompt: `Send 2 GNOT, GNS to ${RECIPIENT}.` }, permission));
    expect(prepared).toEqual([]);
  });
  it('prepares an explicitly named full balance share', async () => {
    const { agent, prepared } = setup([proposal({ ...transferProposal, recipient: FRIEND.alias, amount: { kind: 'fraction', numerator: '1', denominator: '1' } })], { intent: prepare });
    await collect(agent.run({ prompt: '내 GNOT 전부 carol에게 보내줘' }, permission));
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ to: FRIEND.address, amount: '42', token: 'GNOT' });
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
  it('keeps a streamed transfer call and its history bound to the original validated amount', async () => {
    const { agent, prepared } = setup([send], { intent: prepare, remote: false });
    for await (const event of agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission)) {
      if (event.type === 'tool-call' && event.name === 'transfer') {
        expect(event.input).toEqual({ to: RECIPIENT, amount: '1', token: 'GNOT' });
        Reflect.set(event.input as object, 'amount', '9');
      }
    }
    expect(prepared.map(tx => tx.summary.amount)).toEqual(['1']);
    expect(agent.serialize()).toContain('\\"amount\\":\\"1\\"');
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
  it('repeats a scoped clarification for bare confirmations until a complete request is restated', async () => {
    const { agent, prepared, wallet } = setup([send, answer(intentReplyText(prepare)), send], { intent: prepare });
    const first = await collect(agent.run({ prompt: `Snd 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(textOf(first)).toContain('?');
    for (const prompt of ['yes', 'yes']) {
      const followup = await collect(agent.run({ prompt }, permission));
      expect(textOf(followup)).toContain('?');
      expect(prepared).toEqual([]);
      expect(wallet.calls).toEqual([]);
    }
    await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
  });
  it('keeps an invalid planner result in restatement-only state for bare confirmations', async () => {
    const invalid = answer(JSON.stringify({ ...transferProposal, asset: { kind: 'symbol', value: 'INVALID SYMBOL' } }));
    const { agent, prepared, wallet } = setup([invalid, answer(intentReplyText(prepare)), send], { intent: prepare });
    expect(textOf(await collect(agent.run({ prompt: `Send 1 token to ${RECIPIENT}` }, permission)))).toContain('?');
    for (const prompt of ['yes', '네']) {
      expect(textOf(await collect(agent.run({ prompt }, permission)))).toContain('?');
      expect(prepared).toEqual([]);
      expect(wallet.calls).toEqual([]);
    }
    await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
  });
  it('asks which of two named people to pay instead of preparing for one of them', async () => {
    const { agent, prepared, wallet, fetcher } = setup([proposal({ ...transferProposal, recipient: FRIEND.alias })], { intent: prepare });
    wallet.getContacts = async () => [FRIEND];
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to carol and to ${RECIPIENT}.` }, permission));
    expect(textOf(events)).toMatch(/Who should receive|choose one action/i);
    expect(prepared).toEqual([]);
    expect(wallet.calls).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ['2', true],
    ['Send 2 GNOT', false],
  ])('continues an incomplete preparation only for an explicit missing-field reply: %s', async (followup, prepares) => {
    const { agent, prepared, wallet } = setup([
      proposal({ operation: 'clarification', question: 'What amount?' }), answer(intentReplyText(prepare)),
      proposal({ ...transferProposal, amount: { kind: 'exact', value: '2' } }),
    ], { intent: prepare });
    await collect(agent.run({ prompt: `Send GNOT to ${RECIPIENT}` }, permission));
    await collect(agent.run({ prompt: followup }, permission));
    expect(wallet.calls).toHaveLength(prepares ? 1 : 0);
    expect(prepared).toHaveLength(prepares ? 1 : 0);
  });
  it('does not reuse the recipient from a completed preparation', async () => {
    const { agent, prepared, wallet } = setup([
      send, answer(intentReplyText(prepare)), proposal({ ...transferProposal, amount: { kind: 'exact', value: '2' } }),
    ], { intent: prepare });
    await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}` }, permission));
    await collect(agent.run({ prompt: 'Send 2 GNOT' }, permission));
    expect(wallet.calls).toHaveLength(1);
    expect(prepared).toHaveLength(1);
  });
  it.each(['next turn', 'reset', 'clear', 'cancel', 'account change'] as const)('scopes clarification state to one turn and clears it on %s', async mode => {
    const next = proposal({ ...transferProposal, amount: { kind: 'exact', value: '2' } });
    const { agent, prepared } = setup([
      proposal({ operation: 'clarification', question: 'What amount?' }),
      answer(intentReplyText(prepare)), next, answer(intentReplyText(prepare)), next,
    ], { intent: prepare });
    await collect(agent.run({ prompt: `Send GNOT to ${RECIPIENT}` }, permission));
    if (mode === 'reset') agent.reset();
    if (mode === 'clear') agent.clearPending();
    if (mode === 'cancel') await collect(agent.run({ prompt: '2' }, { ...permission, signal: AbortSignal.abort() }));
    await collect(agent.run({ prompt: '2' }, { ...permission, account: mode === 'account change' ? FRIEND.address : ACCOUNT }));
    expect(prepared).toHaveLength(mode === 'next turn' ? 1 : 0);
    await collect(agent.run({ prompt: '2' }, permission));
    expect(prepared).toHaveLength(mode === 'next turn' ? 1 : 0);
  });
  it.each(['next turn', 'reset', 'clear', 'cancel', 'account change'] as const)('scopes a verified balance referent to one turn and clears it on %s', async mode => {
    const relative = proposal({ ...transferProposal, amount: { kind: 'fraction', numerator: '1', denominator: '2' } });
    const { agent, prepared } = setup([
      answer(intentReplyText(prepare)), relative, answer(intentReplyText(prepare)), relative,
    ]);
    await collect(agent.run({ prompt: 'My GNOT balance?' }, { account: ACCOUNT }));
    if (mode === 'reset') agent.reset();
    if (mode === 'clear') agent.clearPending();
    if (mode === 'cancel') await collect(agent.run({ prompt: 'Continue.' }, { ...permission, signal: AbortSignal.abort() }));
    const prompt = `Send half of it to ${RECIPIENT}.`;
    await collect(agent.run({ prompt }, { ...permission, account: mode === 'account change' ? FRIEND.address : ACCOUNT }));
    expect(prepared).toHaveLength(mode === 'next turn' ? 1 : 0);
    await collect(agent.run({ prompt }, permission));
    expect(prepared).toHaveLength(mode === 'next turn' ? 1 : 0);
  });
  it('retains planner clarification and permits a fully restated follow-up', async () => {
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
    await run('Send 1 GNOT to carol.');
    expect(prepared).toHaveLength(1);
    expect(prepared[0].summary).toMatchObject({ to: FRIEND.address, amount: '1' });
    expect(JSON.stringify(model.doGenerateCalls[3].prompt)).toContain(question);
    await run('Thanks.');
    expect(wallet.calls).toHaveLength(1);
    expect(prepared).toHaveLength(1);
    expect(model.doGenerateCalls).toHaveLength(6);
  });
  it('rejects a planner-invented package ID even when the symbol was requested', async () => {
    const { agent, wallet, prepared } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'id', value: 'gno.land/r/invented/gns' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send 1 GNS to carol.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it('does not prepare a model-invented exact amount', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send GNOT to carol.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(events.some(event => event.type === 'tool-call')).toBe(false);
  });
  it('safely refuses a negative amount returned by the planner', async () => {
    const { agent, wallet } = setup([answer(JSON.stringify({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '-1' } }))], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send -1 GNOT to carol.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).toMatch(/negative/i);
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it('recovers an explicit decimal amount instead of using an invented fraction', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'fraction', numerator: '1', denominator: '8' } })], { intent: prepare });
    await collect(agent.run({ prompt: 'Send 1.25 GNOT to carol.' }, permission));
    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, to: FRIEND.address, amount: '1.25', token: 'GNOT' } }]);
  });
  it('rejects a fraction not supported by the user-supplied share', async () => {
    const { agent, wallet, fetcher } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'fraction', numerator: '1', denominator: '8' } })], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send half my GNOT to carol.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it.each([
    ['Send 1.25 GNOT to carol.', '1'],
    ['Send 1.25 GNOT to carol.', '25'],
    ['Send 10% of my GNOT to carol.', '10'],
  ])('does not mistake a numeric substring or share for an exact amount: %s', async (prompt, amount) => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: amount } })], { intent: prepare });
    const events = await collect(agent.run({ prompt }, permission));
    expect(wallet.calls).toEqual([]);
    expect(events.some(event => event.type === 'tool-call')).toBe(false);
  });
  it('does not use an unrelated decimal fee as a fallback amount', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'fraction', numerator: '1', denominator: '2' } })], { intent: prepare });
    const events = await collect(agent.run({ prompt: 'Send a quarter of my GNOT to carol with a 1.25 fee.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it('requires restating the recipient when a follow-up supplies only a package ID', async () => {
    const asset = 'gno.land/r/example/token';
    const { agent, wallet, prepared } = setup([
      proposal({ operation: 'clarification', question: 'Which asset should I send?' }),
      answer(intentReplyText(prepare)),
      proposal({ operation: 'transfer', recipient: FRIEND.alias, asset: { kind: 'id', value: asset },
        amount: { kind: 'exact', value: '1' } }),
    ], { intent: prepare });
    await collect(agent.run({ prompt: 'Send 1 token to carol.' }, permission));
    const events = await collect(agent.run({ prompt: asset }, permission));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it('does not treat model-authored clarification text as authorization to reuse an identity', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    agent.session.complete('Send 1 GNOT to carol.', 'Which asset should I send to carol?');
    const events = await collect(agent.run({ prompt: 'GNOT' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).toContain('No transaction was prepared');
  });
  it('does not recover a recipient from an unrelated completed turn', async () => {
    const { agent, wallet } = setup([proposal({ operation: 'transfer', recipient: FRIEND.alias,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } })], { intent: prepare });
    agent.session.complete('Send 1 GNOT to carol.', 'Unsigned transaction prepared.');
    const events = await collect(agent.run({ prompt: 'Send 1 GNOT.' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(textOf(events)).toContain('No transaction was prepared');
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
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(textOf(events)).toContain('No transaction was prepared');
    expect(fetcher).not.toHaveBeenCalled();
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
  it('rejects a length-truncated proposal even when its JSON is otherwise valid', async () => {
    const { agent, wallet, prepared, fetcher, model } = setup([{ ...send,
      finishReason: { unified: 'length', raw: 'length' } }], { intent: prepare });
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(textOf(events)).toContain('No transaction was prepared');
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
    await expect(collect(invalid.agent.run({ prompt: 'Read data.' }, { account: ACCOUNT }))).rejects.toThrow('AGENT_INTENT_INVALID');
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
    await expect(collect(agent.run({ prompt: 'Send 1 GNOT to carol.' }, { allowTransactionPreparation: true }))).rejects.toThrow('AGENT_ACCOUNT_REQUIRED');
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
    const { agent, model, mcp } = setup([], { withWallet: false, intent, selection: ['get_realm_info', 'get_realm_source'], tools: [info,
      { name: 'get_realm_source', output: { path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} {\n _ = "}" // {\n if amount > 0 { return amount }\n return 0\n}` } },
    ] });
    const events = await collect(agent.run({ prompt: `${path}: Deposit의 구현을 보여줘` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain(`${path}/vault.gno:3`);
    expect(textOf(events)).toContain('return amount');
    expect(textOf(events)).toContain('return 0');
    expect(mcp.calls.map(call => call.name)).toEqual(['get_realm_info', 'get_realm_source']);
    expect(model.doGenerateCalls).toHaveLength(3);
  });
  it.each([
    `${path} realm에서 Deposit 함수가 어떤 파일에 정의되어 있고 무슨 일을 하는지 알려줘.`,
    `Which file implements Deposit in ${path}, and what does it return?`,
  ])('uses the discovered index when tool selection is empty: %s', async prompt => {
    const { agent, mcp } = setup([], { withWallet: false, intent, selection: [], fallbackFit: true, tools: [info,
      { name: 'get_realm_source', output: { path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} { return amount }` } },
    ] });
    const events = await collect(agent.run({ prompt }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([
      { name: 'get_realm_info', arguments: { path } },
      { name: 'get_realm_source', arguments: { path, filename: 'vault.gno' } },
    ]);
    expect(textOf(events)).toContain('return amount');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
  });
  it('uses the indexed file for another realm and a lowercase function', async () => {
    const otherPath = 'gno.land/r/example/registry';
    const otherSignature = 'func resolve(key string) string';
    const { agent, mcp } = setup([], { withWallet: false, selection: [], fallbackFit: true, intent: {
      kind: 'lookup', requests: [{ target: 'other', query: `Show the implementation of resolve in ${otherPath}.` }],
    }, tools: [
      { name: 'get_realm_info', output: { path: otherPath, sourceFiles: ['entries.gno'], functions: [
        { name: 'resolve', signature: otherSignature, filename: 'entries.gno', line: 2 },
      ] } },
      { name: 'get_realm_source', output: { path: otherPath, filename: 'entries.gno', content: `package registry\n${otherSignature} { return key }` } },
    ] });
    const events = await collect(agent.run({ prompt: `Show the implementation of resolve in ${otherPath}.` }, { account: ACCOUNT }));
    expect(mcp.calls.map(call => call.arguments)).toEqual([{ path: otherPath }, { path: otherPath, filename: 'entries.gno' }]);
    expect(textOf(events)).toContain('return key');
  });
  it('does not choose a realm when multiple explicit paths are supplied', async () => {
    const { agent, mcp } = setup([], { withWallet: false, selection: [], intent, tools: [info] });
    await collect(agent.run({ prompt: `Compare the Deposit function in ${path} and gno.land/r/example/other.` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
  });
  it('does not let a realm fallback complete a mixed query with an unavailable capability', async () => {
    const { agent, mcp } = setup([], { withWallet: false, selection: [], fallbackFit: false,
      intent: { kind: 'lookup', requests: [{ target: 'other', query: `Show Deposit implementation in ${path} and current validator count.` }] },
      tools: [info, { name: 'get_realm_source', output: {
        path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} { return amount }`,
      } }],
    });
    const events = await collect(agent.run({ prompt: `Show Deposit implementation in ${path} and current validator count.` }, { account: ACCOUNT }));
    expect(mcp.calls).toEqual([]);
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
  });
  it('retains every separately selected read in a mixed realm lookup', async () => {
    const { agent, mcp } = setup([
      call('get_transaction', { txHash: 'tx-123' }), call('list_account_transactions', { limit: 5 }),
    ], {
      withWallet: false, selection: ['get_realm_info', 'get_transaction', 'list_account_transactions'],
      intent: { kind: 'lookup', requests: [{ target: 'other', query: `Show the Deposit implementation in ${path}, transaction tx-123, and my recent transactions.` }] },
      tools: [info,
        { name: 'get_realm_source', output: { path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} { return amount }` } },
        { name: 'get_transaction', output: { hash: 'tx-123', status: 'success' } },
        { name: 'list_account_transactions', output: { address: ACCOUNT, items: [{ hash: 'tx-456' }] } },
      ],
    });
    const events = await collect(agent.run({ prompt: `Show the Deposit implementation in ${path}, transaction tx-123, and my recent transactions.` }, { account: ACCOUNT }));
    expect(mcp.calls.map(call => call.name)).toEqual(['get_realm_info', 'get_realm_source', 'get_transaction', 'list_account_transactions']);
    expect(textOf(events)).toContain('return amount');
    expect(textOf(events)).toContain('tx-123');
    expect(textOf(events)).toContain('tx-456');
    expect(doneOf(events)?.verifiedAnswer).toBe(true);
  });
  it.each([
    ['wrong realm', { path: 'gno.land/r/other', filename: 'vault.gno', content: signature + ' {}' }],
    ['wrong file', { path, filename: 'other.gno', content: signature + ' {}' }],
    ['comment only', { path, filename: 'vault.gno', content: '\n\n// ' + signature + ' {}' }],
    ['wrong declaration', { path, filename: 'vault.gno', content: '\n\nfunc Deposit() {}' }],
    ['missing closing brace', { path, filename: 'vault.gno', content: `\n\n${signature} {\n return amount` }],
    ['nested closing brace only', { path, filename: 'vault.gno', content: `\n\n${signature} { if true { return amount }` }],
    ['source longer than the excerpt limit', { path, filename: 'vault.gno', content: `\n\n${signature} {\n${' value++\n'.repeat(20)}}` }],
  ])('does not trust %s source evidence', async (_label, source) => {
    const { agent } = setup([], { withWallet: false, intent, selection: ['get_realm_info'], tools: [info, { name: 'get_realm_source', output: source }] });
    const events = await collect(agent.run({ prompt: `${path}: Deposit implementation?` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('could not be verified');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
  });
  it.each([false, true])('refuses missing indexed source or unavailable source tool (indexed: %s)', async indexed => {
    const metadata: FakeOnblocTool = { name: 'get_realm_info', output: {
      path, ...(indexed ? { sourceFiles: ['vault.gno'] } : {}),
      functions: [{ filename: 'vault.gno', line: 3, name: 'Deposit', signature }],
    } };
    const { agent } = setup([], {
      withWallet: false, intent, selection: ['get_realm_info'], tools: [metadata],
    });
    const events = await collect(agent.run({ prompt: `${path}: Deposit implementation?` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('could not be verified');
    expect(doneOf(events)?.verifiedAnswer).toBeUndefined();
    expect(agent.turns).toEqual([]);
  });
  it('preserves the balance alongside verified realm source in a mixed lookup', async () => {
    const { agent } = setup([], { withWallet: false,
      intent: { kind: 'lookup', requests: [{ target: 'balance', request: one('GNOT') }, { target: 'other', query: `${path} Deposit implementation` }] },
      selection: ['get_realm_info'], tools: [info,
        { name: 'get_realm_source', output: { path, filename: 'vault.gno', content: `package vault\n// Deposit adds funds.\n${signature} { return amount }` } },
        { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '42000000' } },
      ] });
    const events = await collect(agent.run({ prompt: `Show my GNOT balance and ${path} Deposit implementation.` }, { account: ACCOUNT }));
    expect(textOf(events)).toContain('42 GNOT');
    expect(textOf(events)).toContain(`${path}/vault.gno:3`);
    expect(textOf(events)).toContain('return amount');
    expect(agent.turns[0].answer).toBe(textOf(events));
  });
});

describe('library execution policy and cancellation', () => {
  it.each(['caller', 'deadline', 'close'] as const)('discards a transfer prepared after %s cancellation', async cancellation => {
    const { agent, harness, wallet, prepared } = setup([send], {
      intent: prepare, budget: { timeoutMs: cancellation === 'deadline' ? 1000 : 300_000 },
    });
    const startRun = jest.spyOn(harness, 'startRun');
    const started = Promise.withResolvers<AbortSignal>();
    const preparation = Promise.withResolvers<PreparedTransaction<TransferSummary>>();
    const transaction = await fakeWallet().transfer({ from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' });
    wallet.transfer = (_params, options) => {
      started.resolve(options!.signal);
      return preparation.promise;
    };
    const controller = new AbortController();
    const events = collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, { ...permission, signal: controller.signal }));
    const signal = await started.promise;
    const stopped = Promise.withResolvers<void>();
    signal.addEventListener('abort', () => stopped.resolve(), { once: true });
    if (cancellation === 'caller') controller.abort();
    if (cancellation === 'close') {
      const run: HarnessRun = await startRun.mock.results[0].value;
      run.close();
    }
    await stopped.promise;
    preparation.resolve(transaction);
    const done = doneOf(await events);
    expect(done).toMatchObject({ aborted: true });
    expect(done?.warnings.some(warning => warning.includes('timed out'))).toBe(cancellation === 'deadline');
    expect(prepared).toEqual([]);
    expect(agent.turns).toEqual([]);
  });

  it('closes the effective wallet operation signal after successful preparation', async () => {
    const { agent, wallet, prepared } = setup([send], { intent: prepare });
    const transfer = wallet.transfer.bind(wallet);
    let operation: WalletOperationOptions | undefined;
    wallet.transfer = (params, options) => {
      operation = options;
      expect(options?.signal.aborted).toBe(false);
      return transfer(params, options);
    };
    await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission));
    expect(prepared).toHaveLength(1);
    expect(operation?.signal.aborted).toBe(true);
  });

  it('closes the run when contact setup fails after planning', async () => {
    const { agent, wallet, model } = setup([send], { intent: prepare });
    let signal: AbortSignal | undefined;
    wallet.getContacts = async options => {
      signal = options?.signal;
      throw new Error('contacts unavailable');
    };
    await expect(collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission))).rejects.toThrow('contacts unavailable');
    expect(signal?.aborted).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it.each(['caller', 'close'] as const)('cancels uncooperative contact setup on %s cancellation', async cancellation => {
    const { agent, harness, wallet, model } = setup([send], { intent: prepare });
    const startRun = jest.spyOn(harness, 'startRun');
    const started = Promise.withResolvers<AbortSignal>();
    const contacts = Promise.withResolvers<[]>();
    wallet.getContacts = options => {
      started.resolve(options!.signal);
      return contacts.promise;
    };
    const controller = new AbortController();
    const completion = collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, { ...permission, signal: controller.signal }));
    const signal = await started.promise;
    if (cancellation === 'caller') controller.abort();
    else (await startRun.mock.results[0].value as HarnessRun).close();
    expect(doneOf(await completion)).toMatchObject({ aborted: true });
    contacts.resolve([]);
    expect(signal.aborted).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it('does not discover tools or load contacts when already cancelled', async () => {
    const { agent, harness, wallet, model } = setup([send], { intent: prepare });
    const startRun = jest.spyOn(harness, 'startRun');
    const contacts = jest.spyOn(wallet, 'getContacts');
    const events = await collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, { ...permission, signal: AbortSignal.abort() }));
    expect(doneOf(events)).toMatchObject({ aborted: true });
    expect(startRun).not.toHaveBeenCalled();
    expect(contacts).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  const history: RequestIntent = { kind: 'lookup', requests: [{ target: 'other', query: 'Show my recent transactions.' }] };
  it.each([1, 2])('bounds lookup execution by %s configured steps, not generation maxSteps', async maxSteps => {
    const { agent, model, mcp } = setup([
      call('list_account_transactions', { limit: 'invalid' }), call('list_account_transactions', { limit: 5 }), answer('unused'),
    ], { intent: history, selection: ['list_account_transactions'],
      budget: { maxSteps, maxToolCalls: undefined, maxTokens: undefined, timeoutMs: undefined } });
    const events = await collect(agent.run({ prompt: 'Show my recent transactions.', maxSteps: 4 }, { account: ACCOUNT }));
    expect(model.doGenerateCalls).toHaveLength(3 + maxSteps);
    expect(mcp.calls).toHaveLength(maxSteps === 2 ? 1 : 0);
    expect(doneOf(events)?.verifiedAnswer).toBe(maxSteps === 2 ? true : undefined);
  });

  it('preserves an output reserve above 512 for the lookup model step', async () => {
    const { agent, model } = setup([call('list_account_transactions', { limit: 5 })],
      { intent: history, selection: ['list_account_transactions'] });
    await collect(agent.run({ prompt: 'Show my recent transactions.', maxOutputTokens: 1024 }, { account: ACCOUNT }));
    expect(model.doGenerateCalls.map(call => call.maxOutputTokens)).toEqual([512, 512, 512, 1024]);
  });

  it('refuses a lookup whose full output reserve leaves no context for input', async () => {
    const { agent, model, mcp } = setup([call('list_account_transactions', { limit: 5 })],
      { intent: history, selection: ['list_account_transactions'], contextTokens: 8192 });
    await expect(collect(agent.run({ prompt: 'Show my recent transactions.', maxOutputTokens: 8192 }, { account: ACCOUNT })))
      .rejects.toThrow(Error);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(mcp.calls).toEqual([]);
  });

  it('enforces the harness token budget before lookup execution, after separate routing', async () => {
    const { agent, model, mcp } = setup([call('list_account_transactions', { limit: 5 })],
      { intent: history, selection: ['list_account_transactions'], budget: { maxTokens: 1 } });
    await expect(collect(agent.run({ prompt: 'Show my recent transactions.' }, { account: ACCOUNT }))).rejects.toThrow(Error);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(mcp.calls).toEqual([]);
  });

  it.each([
    { maxSteps: 0 }, { maxToolCalls: -1 }, { maxTokens: Number.MAX_SAFE_INTEGER + 1 },
    { timeoutMs: 2_147_483_648 }, { maxSteps: 1.5 },
  ])('rejects invalid execution policy before model or wallet access: %j', async budget => {
    const { agent, wallet, model } = setup([send], { intent: prepare, budget });
    const contacts = jest.spyOn(wallet, 'getContacts');
    await expect(collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, permission))).rejects.toThrow(RangeError);
    expect(contacts).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, 8193])('rejects an invalid output reserve: %s', async maxOutputTokens => {
    const { agent, model } = setup([], { contextTokens: 8192 });
    await expect(collect(agent.run({ prompt: 'Hello.', maxOutputTokens }))).rejects.toThrow(RangeError);
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('rejects overflow in the default derived token budget before starting a run', async () => {
    const { agent, harness, model } = setup([], { contextTokens: Number.MAX_SAFE_INTEGER });
    const startRun = jest.spyOn(harness, 'startRun');
    await expect(collect(agent.run({ prompt: 'Hello.' }))).rejects.toThrow(RangeError);
    expect(startRun).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('lets a cooperative wallet stop preparation on caller abort', async () => {
    const { agent, wallet, prepared } = setup([send], { intent: prepare });
    const started = Promise.withResolvers<void>();
    let stopped = false;
    wallet.transfer = (_params, options) => {
      const preparation = Promise.withResolvers<PreparedTransaction<TransferSummary>>();
      options!.signal.addEventListener('abort', () => {
        stopped = true;
        preparation.reject(options!.signal.reason);
      }, { once: true });
      started.resolve();
      return preparation.promise;
    };
    const controller = new AbortController();
    const completion = collect(agent.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }, { ...permission, signal: controller.signal }));
    await started.promise;
    controller.abort();
    expect(doneOf(await completion)).toMatchObject({ aborted: true });
    expect(stopped).toBe(true);
    expect(prepared).toEqual([]);
  });
});

describe('stateful SDK token selection', () => {
  const candidates = ['gno.land/r/a/gns', 'gno.land/r/b/gns'];
  const choiceProposal = proposal({ ...transferProposal, asset: { kind: 'id', value: candidates[0] } });
  const replay = [answer(intentReplyText(prepare)), choiceProposal];

  function setupCandidate(extra: Step[] = [], {
    operation = 'transfer', recipient = RECIPIENT, failAudit = false,
  }: { operation?: 'transfer' | 'approve'; recipient?: string; failAudit?: boolean } = {}) {
    const fixture = setup([
      proposal({ ...transferProposal, operation, recipient, asset: { kind: 'symbol', value: 'GNS' } }), ...extra,
    ], { intent: prepare, remote: false, failAudit });
    const transfer = fixture.wallet.transfer.bind(fixture.wallet);
    fixture.wallet.transfer = jest.fn(async (params, options) => {
      if (params.token === 'GNS') throw new WalletError('ambiguous_token', 'Choose a token.', candidates);
      return transfer(params, options);
    });
    const approve = fixture.wallet.approve!.bind(fixture.wallet);
    fixture.wallet.approve = jest.fn(async (params, options) => {
      if (params.token === 'GNS') throw new WalletError('ambiguous_token', 'Choose a token.', candidates);
      return approve(params, options);
    });
    return fixture;
  }

  it.each(['transfer', 'approve'] as const)('uses a one-shot exact SDK candidate for %s without another model call', async operation => {
    const { agent, wallet, prepared, model } = setupCandidate(replay, { operation });
    const prompt = operation === 'transfer' ? `Send 1 GNS to ${RECIPIENT}.` : `Let ${RECIPIENT} spend 1 GNS.`;
    await collect(agent.run({ prompt }, permission));
    expect(prepared).toEqual([]);
    await collect(agent.run({ prompt: ` ${candidates[1]} ` }, permission));
    expect(wallet.calls).toEqual([{ method: operation, params: {
      from: ACCOUNT, [operation === 'transfer' ? 'to' : 'spender']: RECIPIENT, amount: '1', token: candidates[1],
    } }]);
    expect(prepared).toHaveLength(1);
    expect(model.doGenerateCalls).toHaveLength(2);
    await collect(agent.run({ prompt: candidates[0] }, permission));
    expect(prepared).toHaveLength(1);
    expect(wallet[operation]).toHaveBeenCalledTimes(2);
  });

  it('freezes the resolved recipient instead of trusting a subsequently changed contact', async () => {
    const { agent, wallet, prepared } = setupCandidate([], { recipient: FRIEND.alias });
    const contacts = [{ ...FRIEND }];
    wallet.getContacts = async () => contacts;
    await collect(agent.run({ prompt: 'Send 1 GNS to carol.' }, permission));
    contacts[0].address = RECIPIENT;
    await collect(agent.run({ prompt: candidates[1] }, permission));
    expect(wallet.calls).toEqual([{ method: 'transfer', params: {
      from: ACCOUNT, to: FRIEND.address, amount: '1', token: candidates[1],
    } }]);
    expect(prepared).toHaveLength(1);
  });

  it.each(['yes', 'unrelated', 'clear', 'reset', 'cancel', 'read-only', 'account'] as const)(
    'invalidates candidate authority after %s', async invalidation => {
      const otherTurn = invalidation === 'yes' || invalidation === 'unrelated'
        ? [answer(intentReplyText({ kind: 'chat' })), answer('Please restate the transaction.')]
        : invalidation === 'read-only' ? [answer(intentReplyText(prepare))] : [];
      const { agent, wallet, prepared } = setupCandidate([...otherTurn, ...replay]);
      await collect(agent.run({ prompt: `Send 1 GNS to ${RECIPIENT}.` }, permission));
      if (invalidation === 'yes' || invalidation === 'unrelated') {
        await collect(agent.run({ prompt: invalidation === 'yes' ? 'yes' : 'Thanks.' }, permission));
      }
      if (invalidation === 'clear') {
        const saved = agent.serialize();
        agent.clearPending();
        expect(agent.serialize()).toBe(saved);
      }
      if (invalidation === 'reset') agent.reset();
      if (invalidation === 'cancel') await collect(agent.run({ prompt: candidates[0] }, { ...permission, signal: AbortSignal.abort() }));
      if (invalidation === 'read-only') await collect(agent.run({ prompt: candidates[0] }, { account: ACCOUNT }));
      await collect(agent.run({ prompt: candidates[0] }, { ...permission, account: invalidation === 'account' ? FRIEND.address : ACCOUNT }));
      expect(wallet.transfer).toHaveBeenCalledTimes(1);
      expect(prepared).toEqual([]);
    });

  it.each(['new agent', 'restored session', 'chain'] as const)('does not transfer candidate authority through %s', async replacement => {
    const { agent, llm, harness, wallet, prepared } = setupCandidate(replay);
    await collect(agent.run({ prompt: `Send 1 GNS to ${RECIPIENT}.` }, permission));
    const next = new AIAgent({ llm, harness, wallet,
      session: replacement === 'restored session' ? createChatSession(agent.serialize()) : agent.session,
      chainId: replacement === 'chain' ? 'another-chain' : 'gnoland-1',
      onTransaction: tx => { prepared.push(tx); } });
    await collect(next.run({ prompt: candidates[0] }, permission));
    expect(wallet.transfer).toHaveBeenCalledTimes(1);
    expect(prepared).toEqual([]);
  });

  it('does not retain candidates from an audit-failed ambiguity', async () => {
    const { agent, wallet, prepared } = setupCandidate(replay, { failAudit: true });
    await collect(agent.run({ prompt: `Send 1 GNS to ${RECIPIENT}.` }, permission));
    await collect(agent.run({ prompt: candidates[0] }, permission));
    expect(wallet.transfer).toHaveBeenCalledTimes(1);
    expect(prepared).toEqual([]);
  });

  it('rejects a non-candidate package path instead of treating it as a fresh authorization', async () => {
    const other = 'gno.land/r/other/gns';
    const { agent, wallet, prepared } = setupCandidate([
      answer(intentReplyText(prepare)), proposal({ ...transferProposal, asset: { kind: 'id', value: other } }),
    ]);
    await collect(agent.run({ prompt: `Send 1 GNS to ${RECIPIENT}.` }, permission));
    await collect(agent.run({ prompt: other }, permission));
    expect(wallet.transfer).toHaveBeenCalledTimes(1);
    expect(prepared).toEqual([]);
  });

  it.each(['none', 'clear', 'reset', 'replacement turn'] as const)(
    'controls a late candidate preparation after %s', async invalidation => {
      const extra = invalidation === 'replacement turn'
        ? [answer(intentReplyText({ kind: 'chat' })), answer('New conversation turn.')] : [];
      const { agent, wallet, prepared } = setupCandidate(extra);
      const transfer = wallet.transfer.bind(wallet);
      const ready = Promise.withResolvers<AbortSignal>();
      const release = Promise.withResolvers<void>();
      wallet.transfer = async (params, options) => {
        if (params.token === 'GNS') return transfer(params, options);
        ready.resolve(options!.signal);
        await release.promise;
        return transfer(params, options);
      };
      await collect(agent.run({ prompt: `Send 1 GNS to ${RECIPIENT}.` }, permission));
      const selecting = collect(agent.run({ prompt: candidates[0] }, permission));
      const signal = await ready.promise;
      if (invalidation === 'clear' || invalidation === 'replacement turn') agent.clearPending();
      if (invalidation === 'reset') agent.reset();
      if (invalidation === 'replacement turn') {
        await collect(agent.run({ prompt: 'Start another topic.' }, permission));
      }
      expect(signal.aborted).toBe(invalidation !== 'none');
      release.resolve();
      await selecting;
      expect(prepared).toHaveLength(invalidation === 'none' ? 1 : 0);
      if (invalidation !== 'none') {
        expect(agent.turns.some(turn => turn.prompt === candidates[0])).toBe(false);
      }
      if (invalidation === 'replacement turn') {
        expect(agent.turns.at(-1)?.answer).toBe('New conversation turn.');
      }
    });

  it('prevents an invalidated clarification turn from repopulating pending state', async () => {
    const { agent, wallet, prepared, llm } = setup([
      proposal({ operation: 'clarification', question: 'What amount?' }), answer(intentReplyText(prepare)),
      proposal({ ...transferProposal, amount: { kind: 'exact', value: '3' } }),
    ], { intent: prepare, remote: false });
    await collect(agent.run({ prompt: `Send GNOT to ${RECIPIENT}.` }, permission));
    const generate = llm.generate.bind(llm);
    const ready = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    llm.generate = async function* (settings, options) {
      if (settings.outputSchema) {
        ready.resolve();
        await release.promise;
      }
      yield* generate(settings, options);
    };
    const selecting = collect(agent.run({ prompt: '2' }, permission));
    await ready.promise;
    agent.clearPending();
    release.resolve();
    await selecting;
    llm.generate = generate;
    await collect(agent.run({ prompt: '3' }, permission));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });
});

describe('conversation continuity and library contract', () => {
  it('reads a new lookup instead of re-asking after a clarification', async () => {
    const { agent, prepared } = setup([
      proposal({ operation: 'clarification', question: 'What amount?' }), answer(intentReplyText(native)),
    ], { intent: prepare });
    await collect(agent.run({ prompt: `Send GNOT to ${RECIPIENT}` }, permission));
    const events = await collect(agent.run({ prompt: 'show my GNOT balance' }, permission));
    expect(textOf(events)).toContain('42 GNOT');
    expect(prepared).toEqual([]);
  });
  it('keeps a cancel word from answering a pending clarification', async () => {
    const { agent, wallet } = setup([
      proposal({ operation: 'clarification', question: 'What amount?' }), answer(intentReplyText({ kind: 'chat' })), answer('Okay.'),
    ], { intent: prepare });
    await collect(agent.run({ prompt: `Send GNOT to ${RECIPIENT}` }, permission));
    const events = await collect(agent.run({ prompt: '취소' }, permission));
    expect(textOf(events)).toContain('Okay.');
    expect(wallet.calls).toEqual([]);
  });
  it('matches a Korean contact name followed by a particle', async () => {
    const { agent, prepared, wallet } = setup([proposal({ ...transferProposal, recipient: '민수' })], { intent: prepare });
    wallet.getContacts = async () => [{ alias: '민수', address: FRIEND.address }];
    await collect(agent.run({ prompt: '민수에게 1 GNOT 보내줘' }, permission));
    expect(prepared).toHaveLength(1);
  });
  it('fails early and clearly when the window cannot hold the routing instructions', async () => {
    const { agent, model } = setup([], { contextTokens: 4096 });
    await expect(collect(agent.run({ prompt: 'hi' }, { account: ACCOUNT }))).rejects.toMatchObject({ code: 'AGENT_CONTEXT_LIMIT' });
    expect(model.doGenerateCalls).toEqual([]);
  });
  it('rejects a second turn while one runs, then lets go of an abandoned one after its deadline', async () => {
    const { agent } = setup([answer(intentReplyText(native))], { budget: { timeoutMs: 30 } });
    const abandoned = agent.run({ prompt: 'Balance?' }, { account: ACCOUNT });
    await abandoned.next();
    await expect(collect(agent.run({ prompt: 'Again?' }, { account: ACCOUNT }))).rejects.toMatchObject({ code: 'AGENT_TURN_ACTIVE' });
    // Move the clock past the deadline instead of waiting for it.
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    try {
      expect(textOf(await collect(agent.run({ prompt: 'Again?' }, { account: ACCOUNT })))).toContain('42 GNOT');
    } finally {
      clock.mockRestore();
    }
  });
  it('gives every agent its own operation ids', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 2; index++) {
      const { agent, harness } = setup([]);
      const startRun = harness.startRun.bind(harness);
      jest.spyOn(harness, 'startRun').mockImplementation(options => { ids.push(options.operationId); return startRun(options); });
      await collect(agent.run({ prompt: 'Balance?' }, { account: ACCOUNT }));
    }
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
  it('hands the model only generation options, not host or agent state', async () => {
    const { agent, llm } = setup([answer('Hello!')], { intent: { kind: 'chat' } });
    const generate = jest.spyOn(llm, 'generate');
    await collect(agent.run({ prompt: 'Hi' }, { account: ACCOUNT, allowTransactionPreparation: true }));
    for (const [, options] of generate.mock.calls) {
      expect(Object.keys(options ?? {}).filter(key => !['signal', 'contextTokens', 'onContextCompacted', 'loop'].includes(key))).toEqual([]);
    }
  });
});

describe('negative amount refusal', () => {
  it.each([
    ['Send -5 GNOT to carol', true],
    ['Show my transfer history from block 100 - 200', false],
  ])('%s', async (prompt, refused) => {
    const { agent, mcp } = setup([call('list_account_transactions', { limit: 5 })], {
      intent: { kind: 'lookup', requests: [{ target: 'other', query: 'List recent transactions.' }] }, selection: ['list_account_transactions'],
    });
    const events = await collect(agent.run({ prompt }, permission));
    expect(textOf(events).includes('cannot be negative')).toBe(refused);
    expect(mcp.calls).toHaveLength(refused ? 0 : 1);
  });
});
