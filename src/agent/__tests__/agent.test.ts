import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { GenerateEventType, LLMFromModel, type GenerateEvent } from '../../llm/core';
import { autoApproval } from '../../mock/wallet/approval';
import { FIXTURE } from '../../mock/wallet/fixture';
import { MockWalletSdk } from '../../mock/wallet/mockWalletSdk';
import { AIAgent } from '../agent';
import { ApprovalPolicy, ToolName, TokenSymbol, WalletStatus } from '../wallet/constants';

const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';

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
const call = (toolName: string, input: unknown) =>
  step([{ type: 'tool-call', toolCallId: toolName, toolName, input: JSON.stringify(input) }], 'tool-calls');
const answer = (value: string) => step([{ type: 'text', text: value }], 'stop');
type Step = ReturnType<typeof step>;

const collect = async (events: AsyncIterable<GenerateEvent>) => {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};
const results = (events: GenerateEvent[]) =>
  events.filter((event) => event.type === GenerateEventType.ToolResult);

/** An agent over a scripted model, a fake Onbloc MCP and a mock wallet that owns `account`. */
function setup(
  steps: Step[],
  { policy = ApprovalPolicy.Approve, balance = '10000000' }: { policy?: ApprovalPolicy; balance?: string } = {}
) {
  const mcp = fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance } },
  ]);
  const wallet = new MockWalletSdk({
    requestApproval: autoApproval(policy),
    accounts: [{ name: 'me', address: account, balances: { GNOT: '10', GNS: '0' } }],
  });
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
  return { agent: new AIAgent({ llm, harness, wallet }), wallet, model, mcp };
}

describe('AIAgent', () => {
  const send = call(ToolName.Transfer, { to: FIXTURE.recipient, amount: '1', token: TokenSymbol.Gnot });

  it("reads for the wallet's active address and feeds the result to the model", async () => {
    const { agent, model, mcp } = setup([call('get_native_balance', {}), answer('42 GNOT')], { balance: '42000000' });

    const events = await collect(agent.run({ prompt: 'My balance' }));

    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: account } }]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: '42 GNOT' });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('42000000');
  });

  it('reads through the harness and transfers on the wallet in one run', async () => {
    const { agent, wallet } = setup([call('get_native_balance', {}), send, answer('Sent 1 GNOT')]);

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(results(events)).toEqual([
      expect.objectContaining({ name: 'get_native_balance', output: expect.objectContaining({ kind: 'result' }) }),
      expect.objectContaining({ name: ToolName.Transfer, output: expect.objectContaining({ status: WalletStatus.Signed }) }),
    ]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Sent 1 GNOT' });
    expect(await wallet.getBalance(account)).toMatchObject({ GNOT: '9' });
    const done = events[events.length - 1];
    expect(done.type === GenerateEventType.Done && done.messages.length).toBeGreaterThan(0);
  });

  it("gives the model the wallet's contacts by name", async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go' }));

    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('Contacts: alice');
  });

  it('keeps a system prompt the caller gives', async () => {
    const { agent, model } = setup([answer('hi')]);

    await collect(agent.run({ prompt: 'go', system: 'Be terse.' }));

    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(prompt).toContain('Be terse.');
    expect(prompt).not.toContain('Contacts:');
  });

  it('keeps the model answer when only a wallet action ran', async () => {
    const { agent } = setup([send, answer('Done')]);

    expect(await collect(agent.run({ prompt: 'go' }))).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Done',
    });
  });

  it('does not treat a rejected transfer as a failed lookup', async () => {
    const { agent, wallet } = setup([send, answer('Cancelled')], { policy: ApprovalPolicy.Reject });

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(results(events)).toEqual([
      expect.objectContaining({ output: expect.objectContaining({ status: WalletStatus.Rejected }) }),
    ]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Cancelled' });
    expect(await wallet.getBalance(account)).toMatchObject({ GNOT: '10' });
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
      delta: 'Some Onbloc lookups failed. Review the individual tool results.',
    });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, messages: [] });
  });

  it('shows only the last step as the answer', async () => {
    const { agent } = setup([call('get_native_balance', {}), answer('Your balance is 10 GNOT')]);

    const texts = (await collect(agent.run({ prompt: 'go' }))).filter((e) => e.type === GenerateEventType.Text);

    expect(texts).toEqual([{ type: GenerateEventType.Text, delta: 'Your balance is 10 GNOT' }]);
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
    const agent = new AIAgent({ llm, harness: new Harness(), wallet });

    await expect(collect(agent.run({ prompt: 'go' }))).rejects.toThrow('No read tools are available');
  });
});
