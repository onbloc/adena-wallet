import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { GenerateEventType, LLMFromModel, type GenerateEvent, type GenerateSettings } from '../../llm/core';
import { AIAgent } from '../agent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet } from '../testing/fakeWallet';
import { ToolName, WalletStatus } from '../wallet/constants';
import type { PreparedTransaction } from '../wallet/port';

const account = ACCOUNT;

const usage = (outputTokens: number) => ({
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
});
const step = (content: unknown[], unified: 'tool-calls' | 'stop') => ({
  content: content as never,
  finishReason: { unified, raw: unified },
  usage: usage(5),
  warnings: [],
});
const call = (toolName: string, input: unknown, id = toolName) =>
  step([{ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) }], 'tool-calls');
const answer = (value: string) => step([{ type: 'text', text: value }], 'stop');
type Step = ReturnType<typeof step>;

const collect = async (events: AsyncIterable<GenerateEvent>) => {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};
const results = (events: GenerateEvent[]) =>
  events.filter((event) => event.type === GenerateEventType.ToolResult);

/** An agent over a scripted model, a fake Onbloc MCP and a fake wallet; `prepared` collects what it builds. */
function setup(steps: Step[], { balance = '10000000', holdings }: { balance?: string; holdings?: unknown[] } = {}) {
  const mcp = fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance } },
    { name: 'get_token_balances', output: { address: account, items: holdings ?? [
      { address: account, symbol: 'WIZ', amount: '300', decimals: 0, tokenId: 'gno.land/r/wiz' },
      { address: account, symbol: 'GNS', amount: '1000000', decimals: 6, tokenId: 'gno.land/r/gnoswap/gns' },
      { address: account, symbol: 'xGNS', amount: '17528000000', decimals: 6, tokenId: 'gno.land/r/xgns' },
    ] } },
    { name: 'get_account_info', output: { address: account, label: 'active account' } },
  ]);
  const wallet = fakeWallet({ contacts: [FRIEND] });
  const prepared: PreparedTransaction[] = [];
  // A native llama stream would emit partial tool arguments; completing each step first avoids it.
  const model = new MockLanguageModelV4({
    doStream: async () => {
      throw new Error('Native stream would emit a partial { argument');
    },
    doGenerate: steps,
  });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  const harness = new Harness({
    toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
  });
  const real = new AIAgent({
    llm,
    harness,
    wallet,
    onTransaction: (transaction) => {
      prepared.push(transaction);
    },
  });
  // Runs for `account` unless a test passes another.
  const agent = {
    run: (settings: GenerateSettings, options: { account?: string; signal?: AbortSignal; allowTransactionPreparation?: boolean } = {}) =>
      real.run(settings, { account, ...options }),
  };
  return { agent, real, wallet, model, mcp, prepared };
}

describe('AIAgent', () => {
  const send = call(ToolName.Transfer, { to: RECIPIENT, amount: '1', token: 'GNOT' });
  const nativeRead = (id = 'get_balance') => call('get_balance', {
    kind: 'one', asset: { kind: 'symbol', value: 'GNOT' },
  }, id);

  it("reads for the agent's account and feeds the result to the model", async () => {
    const { agent, model, mcp } = setup([nativeRead(), answer('42000000 GNOT')], { balance: '42000000' });

    const events = await collect(agent.run({ prompt: 'My balance' }));

    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: account } }]);
    expect(results(events)).toEqual([expect.objectContaining({
      name: 'get_balance',
      output: expect.objectContaining({ kind: 'result', value: expect.objectContaining({
        account, status: 'complete', assets: [expect.objectContaining({ amount: '42000000', symbol: 'GNOT' })],
      }) }),
    })]);
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('42000000');
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, verifiedAnswer: true });
  });

  it('keeps structured balances in mixed read results and carries the answer into a follow-up', async () => {
    const { real, model } = setup([
      nativeRead(),
      call('get_account_info', {}),
      answer('Account is active.'),
      answer('That was your balance.'),
    ]);
    const conversation = real.createConversation({ account });

    const first = await collect(conversation.run({ prompt: 'Show my GNOT balance and account information' }));
    expect(results(first).map(event => event.name)).toEqual(['get_balance', 'get_account_info']);
    expect(first).toContainEqual(expect.objectContaining({
      type: GenerateEventType.Text, delta: expect.stringContaining('10 GNOT'),
    }));

    await collect(conversation.run({ prompt: 'What was my balance?' }));
    const followup = JSON.stringify(model.doGenerateCalls[3].prompt);
    expect(followup).toContain('10 GNOT');
    expect(followup).toContain('What was my balance?');
  });

  it('answers a public realm read from standard text without marking it as a verified balance', async () => {
    const path = 'gno.land/r/gnoswap/gns';
    const mcp = fakeOnblocMcp([
      { name: 'get_realm_info', content: [{ type: 'text', text: 'BalanceOf is in gns.gno' }] },
      { name: 'get_realm_source', content: [{ type: 'text', text: 'func BalanceOf() { return balance }' }] },
    ]);
    const model = new MockLanguageModelV4({ doGenerate: [
      call('get_realm_info', { path }),
      call('get_realm_source', { path, filename: 'gns.gno' }),
      answer('BalanceOf reads the balance.'),
    ] });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] });
    const events = await collect(new AIAgent({ llm, harness }).run({ prompt: 'Where is BalanceOf and what does it do?' }, { account }));
    expect(mcp.calls).toEqual([
      { name: 'get_realm_info', arguments: { path } },
      { name: 'get_realm_source', arguments: { path, filename: 'gns.gno' } },
    ]);
    expect(JSON.stringify(model.doGenerateCalls[2].prompt)).toContain('func BalanceOf()');
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'BalanceOf reads the balance.' });
    expect(events[events.length - 1]).not.toHaveProperty('verifiedAnswer', true);
  });

  it.each(['What is my xGNS balance?', '내 xGNS 잔액은 얼마야?'])(
    'lets the model select a balance operation rather than shortcutting the text: %s', async prompt => {
      const request = { kind: 'one', asset: { kind: 'symbol', value: 'xGNS' } };
      const { agent, mcp, model } = setup([call('get_balance', request), answer('Selected xGNS')]);
      const events = await collect(agent.run({ messages: [{ role: 'user', content: prompt }] }));
      expect(model.doGenerateCalls).toHaveLength(2);
      expect(mcp.calls).toEqual([{ name: 'get_token_balances', arguments: { address: account } }]);
      expect(results(events)).toEqual([expect.objectContaining({
        name: 'get_balance', output: expect.objectContaining({
          kind: 'result', value: expect.objectContaining({ request, status: 'complete' }),
        }),
      })]);
      expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, verifiedAnswer: true });
    }
  );

  it('does not mark a lookup verified when the selected token contradicts the request', async () => {
    const { agent } = setup([
      call('get_balance', { kind: 'one', asset: { kind: 'symbol', value: 'GNS' } }),
      answer('You have 1 GNS.'),
    ]);
    const events = await collect(agent.run({ prompt: 'What is my xGNS balance?' }));
    expect(events).toContainEqual({
      type: GenerateEventType.Text,
      delta: expect.stringContaining('The selected asset differs from the asset mentioned.'),
    });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, messages: [] });
    expect(events[events.length - 1]).not.toHaveProperty('verifiedAnswer', true);
  });

  it('uses an explicit structured request to get a complete portfolio without the model', async () => {
    const { real, mcp, model } = setup([]);
    const request = { kind: 'all' } as const;
    const balance = await real.getBalance(request, { account });
    expect(balance).toMatchObject({
      account, request, status: 'complete',
      assets: expect.arrayContaining([
        expect.objectContaining({ kind: 'native', symbol: 'GNOT', amount: '10000000' }),
        expect.objectContaining({ kind: 'token', symbol: 'xGNS', amount: '17528000000' }),
      ]),
    });
    expect(mcp.calls.map(call => call.name)).toEqual(expect.arrayContaining(['get_native_balance', 'get_token_balances']));
    expect(mcp.calls).toHaveLength(2);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('runs read-only with an account and harness even without a wallet', async () => {
    const { real, model, mcp } = setup([nativeRead(), answer('10 GNOT')]);
    const agent = new AIAgent({ llm: real.llm, harness: real.harness });
    await collect(agent.run({ prompt: 'What is my GNOT balance?' }, { account }));
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: account } }]);
    expect(model.doGenerateCalls[0].tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'get_balance' }),
    ]));
    expect(JSON.stringify(model.doGenerateCalls[0].tools)).not.toContain(`"name":"${ToolName.Transfer}"`);
  });

  it('reports a partial structured portfolio when one source is unavailable', async () => {
    const { real, model } = setup([]);
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance: '10000000' } },
    ]);
    const harness = new Harness({
      toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
    });
    const agent = new AIAgent({ llm: real.llm, harness });
    const balance = await agent.getBalance({ kind: 'all' }, { account });
    expect(balance).toMatchObject({
      account, status: 'partial', missing: ['tokens'],
      assets: [expect.objectContaining({ symbol: 'GNOT', amount: '10000000' })],
    });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('does not mark a partial model-selected portfolio as verified', async () => {
    const { real } = setup([call('get_balance', { kind: 'all' }), answer('All balances')]);
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance: '10000000' } },
    ]);
    const harness = new Harness({
      toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
    });
    const events = await collect(new AIAgent({ llm: real.llm, harness }).run({ prompt: 'Show my assets' }, { account }));
    expect(events).toContainEqual({
      type: GenerateEventType.Text,
      delta: expect.stringContaining('Some lookups could not be verified.'),
    });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, messages: [] });
    expect(events[events.length - 1]).not.toHaveProperty('verifiedAnswer', true);
  });

  it('defaults to read-only even when a wallet is supplied and rejects a forged transfer call', async () => {
    const { agent, model, wallet, prepared } = setup([send, answer('Sent')]);
    await collect(agent.run({ prompt: 'Send 1 GNOT' }));
    expect(JSON.stringify(model.doGenerateCalls[0].tools)).not.toContain(`"name":"${ToolName.Transfer}"`);
    expect(JSON.stringify(model.doGenerateCalls[0].tools)).not.toContain(`"name":"${ToolName.Approve}"`);
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });

  it('uses the host opt-in, not a balance-like prompt, to permit a transfer', async () => {
    const { agent, wallet, prepared } = setup([send, answer('Ready')]);
    await collect(agent.run({ prompt: 'What is my GNOT balance?' }, { allowTransactionPreparation: true }));
    expect(wallet.calls).toHaveLength(1);
    expect(prepared).toHaveLength(1);
  });

  it('reads through the harness and prepares a transfer in one run', async () => {
    const { agent, prepared } = setup([nativeRead(), send, answer('Ready to sign 1 GNOT')]);

    const events = await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    expect(results(events)).toEqual([
      expect.objectContaining({ name: 'get_balance', output: expect.objectContaining({ kind: 'result' }) }),
      expect.objectContaining({ name: ToolName.Transfer, output: { kind: 'result', value: expect.objectContaining({ status: WalletStatus.Prepared }) } }),
    ]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Unsigned transaction prepared. Nothing was sent.' });
    expect(prepared).toEqual([
      { summary: expect.objectContaining({ from: account, to: RECIPIENT, amount: '1', token: 'GNOT' }), tx: expect.anything() },
    ]);
    const done = events[events.length - 1];
    expect(done).toMatchObject({ type: GenerateEventType.Done, messages: [] });
  });

  it('does not hand a transaction to the app once reads consume the tool budget', async () => {
    const reads = [1, 2, 3, 4].map(n => nativeRead(`read-${n}`));
    const { agent, mcp, prepared } = setup([...reads, send]);
    const events = await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));
    expect(results(events).at(-1)).toMatchObject({
      name: ToolName.Transfer, output: { kind: 'denied', code: 'BUDGET_EXHAUSTED' },
    });
    expect(mcp.calls).toHaveLength(4);
    expect(prepared).toEqual([]);
  });

  it("gives the model the wallet's contacts by name", async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain(`Contacts: ${FRIEND.alias}`);
  });

  it('keeps a system prompt the caller gives', async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go', system: 'Be terse.' }));

    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(prompt).toContain('Be terse.');
    expect(prompt).not.toContain('Contacts:');
  });

  it('does not present a model claim of settlement as the outcome of preparation', async () => {
    const { agent } = setup([send, answer('Payment confirmed on chain.')]);

    expect(await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }))).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Unsigned transaction prepared. Nothing was sent.',
    });
  });

  it('hands the transaction to the app and keeps it out of what the model reads', async () => {
    const { agent, model, prepared } = setup([send, answer('Ready')]);

    await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    expect(prepared).toHaveLength(1);
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).not.toContain('"tx"');
  });

  it('tells the model nothing is sent and offers get_approvals only when the wallet can list approvals', async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(prompt).toContain('nothing is sent');
    expect(prompt).not.toContain('get_approvals');
  });

  it('allows a terminology explanation without pretending it came from a wallet lookup', async () => {
    const { agent, mcp } = setup([answer('GNOT is the native token.')]);

    const events = await collect(agent.run({ prompt: 'What does native token mean?' }));

    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'GNOT is the native token.' });
    expect(mcp.calls).toEqual([]);
    const done = events.at(-1);
    expect(done?.type === GenerateEventType.Done && done.verifiedAnswer).toBeUndefined();
  });

  it('reports a failed lookup even when a wallet action ran, and does not remember the turn', async () => {
    const { agent } = setup([send, call('no_such_tool', {}), answer('All good')]);

    const events = await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    expect(events).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Unsigned transaction prepared. Nothing was sent. Some lookups could not be verified. Review the individual tool results.',
    });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, messages: [] });
  });

  it('shows only the last step as the answer', async () => {
    const { agent } = setup([nativeRead(), answer('Your balance is 10 GNOT')]);

    const texts = (await collect(agent.run({ prompt: 'go' }))).filter((e) => e.type === GenerateEventType.Text);

    expect(texts).toEqual([{ type: GenerateEventType.Text, delta: '10 GNOT' }]);
  });

  it('is the LLM alone when it has no wallet', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            controller.enqueue({ type: 'text-start', id: 't' });
            controller.enqueue({ type: 'text-delta', id: 't', delta: 'hi' });
            controller.enqueue({ type: 'text-end', id: 't' });
            controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(1) });
            controller.close();
          },
        }) as never,
      }),
    });
    const agent = new AIAgent({ llm: new LLMFromModel(model), harness: new Harness() });

    const events = await collect(agent.run({ prompt: 'hello' }));

    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'hi' });
  });

  it('fails when the harness offers no read tools', async () => {
    const { wallet } = setup([]);
    const llm = new LLMFromModel(new MockLanguageModelV4({ doGenerate: [answer('x')] }));
    const agent = new AIAgent({ llm, harness: new Harness(), wallet, onTransaction: () => {} });

    await expect(collect(agent.run({ prompt: 'go' }, { account }))).rejects.toThrow('No tools are available');
  });

  it('acts for the account each run is given, so the app can switch accounts', async () => {
    const other = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
    const { real, wallet, prepared } = setup([send, answer('One'), send, answer('Two')]);

    await collect(real.run({ prompt: 'go' }, { account, allowTransactionPreparation: true }));
    await collect(real.run({ prompt: 'go' }, { account: other, allowTransactionPreparation: true }));

    expect(wallet.calls.map(({ params }) => params.from)).toEqual([account, other]);
    expect(prepared.map(({ summary }) => summary.from)).toEqual([account, other]);
  });

  it('refuses to run a wallet agent without an account', async () => {
    const { real, wallet } = setup([send, answer('x')]);

    await expect(collect(real.run({ prompt: 'go' }))).rejects.toThrow('needs the account');
    expect(wallet.calls).toEqual([]);
  });

  it('shows the model a token holding by its identity and exact amount only', async () => {
    const holding = {
      address: account,
      tokenId: 'gno.land/r/gnoswap/gns',
      symbol: 'GNS',
      amount: '63607',
      decimals: 6,
      logoUrl: 'https://example.test/logo.png',
      usdPrice: '0.42',
    };
    const { agent, model } = setup([
      call('get_balance', { kind: 'all' }),
      answer('63607 GNS'),
    ], { holdings: [holding] });

    await collect(agent.run({ prompt: 'My tokens' }));

    const prompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(prompt).toContain('63607');
    expect(prompt).toContain('gno.land/r/gnoswap/gns');
    expect(prompt).not.toContain('logoUrl');
    expect(prompt).not.toContain('usdPrice');
  });

  it.each([
    ['an amount that is not a string', { to: RECIPIENT, amount: 5, token: 'GNOT' }],
    ['a missing token', { to: RECIPIENT, amount: '1' }],
  ])('never lets %s reach the wallet', async (_label, input) => {
    const { agent, wallet, prepared } = setup([call(ToolName.Transfer, input), answer('x')]);

    const events = await collect(agent.run({ prompt: 'go' }, { allowTransactionPreparation: true }));

    expect(events).toContainEqual(expect.objectContaining({ type: GenerateEventType.ToolCall, name: ToolName.Transfer, invalid: true }));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });
});
