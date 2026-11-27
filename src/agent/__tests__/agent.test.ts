import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness, type Budget, type HarnessRun } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { GenerateEventType, LLMFromModel, type GenerateEvent, type GenerateSettings } from '../../llm/core';
import { AIAgent } from '../agent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet } from '../testing/fakeWallet';
import { ToolName, WalletStatus } from '../wallet/constants';
import type { PreparedTransaction, TransferSummary, WalletOperationOptions } from '../wallet/port';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

/** An agent over a scripted model, a fake Onbloc MCP and a fake wallet; `prepared` collects what it builds. */
function setup(steps: Step[], { balance = '10000000', budget, contextTokens }: {
  balance?: string;
  budget?: Partial<Budget>;
  contextTokens?: number;
} = {}) {
  const mcp = fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance } },
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
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }), { contextTokens });
  const harness = new Harness({
    toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
  });
  const real = new AIAgent({
    llm,
    harness,
    wallet,
    budget,
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
    const { agent, model, mcp } = setup([call('get_native_balance', {}), answer('42 GNOT')], { balance: '42000000' });

    const events = await collect(agent.run({ prompt: 'My balance' }));

    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: account } }]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: '42 GNOT' });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('42000000');
  });

  it('reads through the harness and prepares a transfer in one run', async () => {
    const { agent, prepared } = setup([call('get_native_balance', {}), send, answer('Ready to sign 1 GNOT')]);

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(results(events)).toEqual([
      expect.objectContaining({ name: 'get_native_balance', output: expect.objectContaining({ kind: 'result' }) }),
      expect.objectContaining({ name: ToolName.Transfer, output: expect.objectContaining({ status: WalletStatus.Prepared }) }),
    ]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Ready to sign 1 GNOT' });
    expect(prepared).toEqual([
      { summary: expect.objectContaining({ from: account, to: RECIPIENT, amount: '1', token: 'GNOT' }), tx: expect.anything() },
    ]);
    const done = events[events.length - 1];
    expect(done.type === GenerateEventType.Done && done.messages.length).toBeGreaterThan(0);
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

  it('keeps the model answer when only a wallet action ran', async () => {
    const { agent } = setup([send, answer('Done')]);

    expect(await collect(agent.run({ prompt: 'go' }))).toContainEqual({
      type: GenerateEventType.Text,
      delta: 'Done',
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

  it('keeps ordinary conversation and passes it to the next turn', async () => {
    const { agent, model, mcp } = setup([answer('Hello Mina'), answer('Your name is Mina')]);
    const first = await collect(agent.run({ messages: [{ role: 'user', content: 'My name is Mina' }] }));
    const done = first[first.length - 1];
    if (done.type !== GenerateEventType.Done) throw new Error('Expected done');

    expect(first).toContainEqual({ type: GenerateEventType.Text, delta: 'Hello Mina' });
    expect(done.messages).toEqual([expect.objectContaining({ role: 'assistant' })]);
    const second = await collect(agent.run({ messages: [
      { role: 'user', content: 'My name is Mina' },
      ...done.messages,
      { role: 'user', content: 'What is my name?' },
    ] }));
    expect(second).toContainEqual({ type: GenerateEventType.Text, delta: 'Your name is Mina' });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('Hello Mina');
    expect(mcp.calls).toEqual([]);
  });

  it('shows a request for missing transfer details without a tool call', async () => {
    const { agent, prepared } = setup([answer('Who should receive the tokens?')]);
    const events = await collect(agent.run({ prompt: 'Send 1 GNOT' }));

    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Who should receive the tokens?' });
    expect(prepared).toEqual([]);
    expect(events[events.length - 1]).toMatchObject({ messages: [expect.objectContaining({ role: 'assistant' })] });
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

  it.each(['caller', 'deadline', 'close'] as const)('discards a transfer prepared after %s cancellation', async (cancellation) => {
    const { agent, real, wallet, prepared } = setup([send, answer('Ready')], {
      budget: { timeoutMs: cancellation === 'deadline' ? 1000 : 300_000 },
    });
    const startRun = jest.spyOn(real.harness, 'startRun');
    const started = deferred<AbortSignal>();
    const preparation = deferred<PreparedTransaction<TransferSummary>>();
    const transaction = await fakeWallet().transfer({ from: account, to: RECIPIENT, amount: '1', token: 'GNOT' });
    wallet.transfer = (_params, options) => {
      started.resolve(options!.signal);
      return preparation.promise;
    };
    const controller = new AbortController();
    const events = collect(agent.run({ prompt: 'go' }, { signal: controller.signal }));
    const operationSignal = await started.promise;
    const stopped = new Promise<void>((resolve) => {
      operationSignal.addEventListener('abort', () => resolve(), { once: true });
    });

    if (cancellation === 'caller') controller.abort();
    if (cancellation === 'close') {
      const run: HarnessRun = await startRun.mock.results[0].value;
      run.close();
    }
    await stopped;
    preparation.resolve(transaction);

    expect(operationSignal.aborted).toBe(true);
    expect((await events).at(-1)).toMatchObject({ type: GenerateEventType.Done, aborted: true });
    await preparation.promise;
    expect(prepared).toEqual([]);
  });

  it('closes the wallet operation signal when a successful run ends', async () => {
    const { agent, wallet, prepared } = setup([send, answer('Ready')]);
    const transfer = wallet.transfer.bind(wallet);
    let operation: WalletOperationOptions | undefined;
    wallet.transfer = (params, options) => {
      operation = options;
      expect(options?.signal.aborted).toBe(false);
      return transfer(params, options);
    };

    await collect(agent.run({ prompt: 'go' }));

    expect(prepared).toHaveLength(1);
    expect(operation?.signal.aborted).toBe(true);
  });

  it('closes the run when contact setup fails before generation', async () => {
    const { agent, wallet, model } = setup([answer('unused')]);
    let signal: AbortSignal | undefined;
    wallet.getContacts = async (options) => {
      signal = options?.signal;
      throw new Error('contacts unavailable');
    };

    await expect(collect(agent.run({ prompt: 'go' }))).rejects.toThrow('contacts unavailable');

    expect(signal?.aborted).toBe(true);
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('cancels contact setup even when the wallet ignores cancellation', async () => {
    const { agent, wallet, model } = setup([answer('unused')]);
    const started = deferred<AbortSignal>();
    const contacts = deferred<[]>();
    wallet.getContacts = (options) => {
      started.resolve(options!.signal);
      return contacts.promise;
    };
    const controller = new AbortController();
    const completion = collect(agent.run({ prompt: 'go' }, { signal: controller.signal }));
    const cancelled = expect(completion).rejects.toMatchObject({ name: 'AbortError' });
    const signal = await started.promise;

    controller.abort();
    await cancelled;
    contacts.resolve([]);

    expect(signal.aborted).toBe(true);
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('does not discover tools or load contacts for an already cancelled run', async () => {
    const { agent, real, wallet, model } = setup([answer('unused')]);
    const startRun = jest.spyOn(real.harness, 'startRun');
    const contacts = jest.spyOn(wallet, 'getContacts');
    const controller = new AbortController();
    controller.abort();

    await expect(collect(agent.run({ prompt: 'go' }, { signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' });

    expect(startRun).not.toHaveBeenCalled();
    expect(contacts).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('stops after the configured model-step limit rather than the generation setting', async () => {
    const { agent, model, prepared } = setup([send, send, send, answer('unused')], {
      budget: { maxSteps: 2, maxToolCalls: undefined, maxTokens: undefined, timeoutMs: undefined },
    });

    await collect(agent.run({ prompt: 'go', maxSteps: 4 }));

    expect(model.doGenerateCalls).toHaveLength(2);
    expect(prepared).toHaveLength(2);
  });

  it('honors an output reserve above 512 on every model step', async () => {
    const { agent, model } = setup([send, answer('Ready')]);

    await collect(agent.run({ prompt: 'go', maxOutputTokens: 1024 }));

    expect(model.doGenerateCalls.map(({ maxOutputTokens }) => maxOutputTokens)).toEqual([1024, 1024]);
  });

  it('refuses a model step when its requested output reserve exceeds remaining context capacity', async () => {
    const { agent, model } = setup([answer('unused')], { contextTokens: 8192 });

    await expect(collect(agent.run({ prompt: 'go', maxOutputTokens: 8192 })))
      .rejects.toThrow('Input estimate and output reserve exceed model context');

    expect(model.doGenerateCalls).toEqual([]);
  });

  it('enforces the total-token budget before starting a model step', async () => {
    const { agent, model } = setup([answer('unused')], { budget: { maxTokens: 1 } });

    await expect(collect(agent.run({ prompt: 'go' }))).rejects.toThrow(Error);

    expect(model.doGenerateCalls).toEqual([]);
  });

  it.each([
    { maxSteps: 0 }, { maxToolCalls: -1 }, { maxTokens: Number.MAX_SAFE_INTEGER + 1 },
    { timeoutMs: 2_147_483_648 }, { maxSteps: 1.5 },
  ])('rejects an invalid run policy before loading contacts: %j', async (budget) => {
    const { agent, wallet, model } = setup([answer('unused')], { budget });
    const contacts = jest.spyOn(wallet, 'getContacts');

    await expect(collect(agent.run({ prompt: 'go' }))).rejects.toThrow(RangeError);

    expect(contacts).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid output token limits: %s', async (maxOutputTokens) => {
    const { agent, model } = setup([answer('unused')]);

    await expect(collect(agent.run({ prompt: 'go', maxOutputTokens }))).rejects.toThrow(RangeError);

    expect(model.doGenerateCalls).toEqual([]);
  });

  it('rejects an unsafe derived token budget before starting a run', async () => {
    const { agent, real, model } = setup([answer('unused')], { contextTokens: Number.MAX_SAFE_INTEGER });
    const startRun = jest.spyOn(real.harness, 'startRun');

    await expect(collect(agent.run({ prompt: 'go' }))).rejects.toThrow('Default token budget exceeds safe integer range');

    expect(startRun).not.toHaveBeenCalled();
    expect(model.doGenerateCalls).toEqual([]);
  });

  it('limits harness reads without counting wallet preparations as read calls', async () => {
    const { agent, mcp, prepared } = setup([
      call('get_native_balance', {}), send, call('get_native_balance', {}), answer('Ready'),
    ], { budget: { maxToolCalls: 1 } });

    const events = await collect(agent.run({ prompt: 'go' }));

    expect(mcp.calls).toHaveLength(1);
    expect(prepared).toHaveLength(1);
    expect(results(events)).toContainEqual(expect.objectContaining({
      name: 'get_native_balance', output: { kind: 'denied', code: 'BUDGET_EXHAUSTED' },
    }));
  });

  it('lets a cooperative wallet stop preparation when the caller aborts', async () => {
    const { agent, wallet, prepared } = setup([send, answer('unused')]);
    const started = deferred<void>();
    let stopped = false;
    wallet.transfer = (_params, options) => new Promise((_resolve, reject) => {
      options!.signal.addEventListener('abort', () => {
        stopped = true;
        reject(options!.signal.reason);
      }, { once: true });
      started.resolve();
    });
    const controller = new AbortController();
    const completion = collect(agent.run({ prompt: 'go' }, { signal: controller.signal }));
    await started.promise;

    controller.abort();

    expect((await completion).at(-1)).toMatchObject({ type: GenerateEventType.Done, aborted: true });
    expect(stopped).toBe(true);
    expect(prepared).toEqual([]);
  });
});
