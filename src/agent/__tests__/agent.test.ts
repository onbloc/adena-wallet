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
      { address: account, symbol: 'xGNS', amount: '17528000000', decimals: 6, tokenId: 'gno.land/r/xgns' },
    ] } },
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
    run: (settings: GenerateSettings, options: { account?: string; signal?: AbortSignal } = {}) =>
      real.run(settings, { account, ...options }),
  };
  return { agent, real, wallet, model, mcp, prepared };
}

describe('AIAgent', () => {
  const send = call(ToolName.Transfer, { to: RECIPIENT, amount: '1', token: 'GNOT' });

  it("reads for the agent's account and feeds the result to the model", async () => {
    const { agent, model, mcp } = setup([call('get_native_balance', {}), answer('42000000 GNOT')], { balance: '42000000' });

    const events = await collect(agent.run({ prompt: 'My balance' }));

    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: account } }]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: '42 GNOT' });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('42000000');
  });

  it.each(['What is my xGNS balance?', '내 xGNS 잔액은 얼마야?'])('fetches only the requested holding: %s', async prompt => {
    const { agent, mcp, model } = setup([]);
    const events = await collect(agent.run({ messages: [{ role: 'user', content: prompt }] }));
    expect(mcp.calls).toEqual([{ name: 'get_token_balances', arguments: { address: account } }]);
    expect(events.filter(e => e.type === GenerateEventType.Text)).toEqual([{ type: GenerateEventType.Text, delta: '17528 xGNS (gno.land/r/xgns)' }]);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it.each(['Show me all my assets.', '내 모든 자산을 보여줘'])('combines native and token balances for %s', async prompt => {
    const { agent, mcp } = setup([]);
    const events = await collect(agent.run({ prompt }));
    expect(mcp.calls.map(call => call.name)).toEqual(['get_native_balance', 'get_token_balances']);
    expect(events.filter(e => e.type === GenerateEventType.Text)).toEqual([{
      type: GenerateEventType.Text,
      delta: '10 GNOT\n\nGRC20 balances:\n- 300 WIZ (gno.land/r/wiz)\n- 17528 xGNS (gno.land/r/xgns)',
    }]);
  });

  it('reads through the harness and prepares a transfer in one run', async () => {
    const { agent, prepared } = setup([call('get_native_balance', {}), send, answer('Ready to sign 1 GNOT')]);

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(results(events)).toEqual([
      expect.objectContaining({ name: 'get_native_balance', output: expect.objectContaining({ kind: 'result' }) }),
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
    const reads = [1, 2, 3, 4].map(n => call('get_native_balance', {}, `read-${n}`));
    const { agent, prepared } = setup([...reads, send]);
    const events = await collect(agent.run({ prompt: 'go' }));
    expect(results(events).at(-1)).toMatchObject({ name: ToolName.Transfer, output: { kind: 'denied', code: 'BUDGET_EXHAUSTED' } });
    expect(prepared).toEqual([]);
  });

  it("gives the model the wallet's contacts by name", async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go' }));

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

    expect(await collect(agent.run({ prompt: 'go' }))).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Unsigned transaction prepared. Nothing was sent.',
    });
  });

  it('hands the transaction to the app and keeps it out of what the model reads', async () => {
    const { agent, model, prepared } = setup([send, answer('Ready')]);

    await collect(agent.run({ prompt: 'go' }));

    expect(prepared).toHaveLength(1);
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).not.toContain('"tx"');
  });

  it('tells the model nothing is sent and offers get_approvals only when the wallet can list approvals', async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go' }));

    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(prompt).toContain('nothing is sent');
    expect(prompt).not.toContain('get_approvals');
  });

  it('replaces an answer that rests on no lookup and no action', async () => {
    const { agent } = setup([answer('You have 5 GNOT')]);

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(events).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'No Onbloc lookup returned verified data.',
    });
    expect(events).not.toContainEqual({ type: GenerateEventType.Text, delta: 'You have 5 GNOT' });
  });

  it('reports a failed lookup even when a wallet action ran, and does not remember the turn', async () => {
    const { agent } = setup([send, call('no_such_tool', {}), answer('All good')]);

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(events).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Unsigned transaction prepared. Nothing was sent. Some Onbloc lookups failed. Review the individual tool results.',
    });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, messages: [] });
  });

  it('shows only the last step as the answer', async () => {
    const { agent } = setup([call('get_native_balance', {}), answer('Your balance is 10 GNOT')]);

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

    await expect(collect(agent.run({ prompt: 'go' }, { account }))).rejects.toThrow('No read tools are available');
  });

  it('acts for the account each run is given, so the app can switch accounts', async () => {
    const other = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
    const { real, wallet, prepared } = setup([send, answer('One'), send, answer('Two')]);

    await collect(real.run({ prompt: 'go' }, { account }));
    await collect(real.run({ prompt: 'go' }, { account: other }));

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
    const { agent, model } = setup([call('get_token_balances', {}), answer('63607 GNS')], { holdings: [holding] });

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

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(events).toContainEqual(expect.objectContaining({ type: GenerateEventType.ToolCall, name: ToolName.Transfer, invalid: true }));
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });
});
