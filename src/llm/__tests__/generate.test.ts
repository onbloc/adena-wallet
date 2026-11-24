import { MockLanguageModelV4 } from 'ai/test';

import { fakeOnblocMcp } from '../../testing/fakeOnblocMcp';
import { createWalletTools } from '../../wallet/adapter/tools';
import {
  ApprovalPolicy,
  ToolName,
  TokenSymbol,
  WalletErrorCode,
  WalletStatus,
} from '../../wallet/constants';
import { autoApproval } from '../../wallet/sdk/approval';
import { ACTIVE_ADDRESS, FIXTURE } from '../../wallet/sdk/fixture';
import { MockWalletSdk } from '../../wallet/sdk/mockWalletSdk';
import { generate, GenerateEventType, type GenerateEvent } from '../generate';
import { withCompletedToolCalls } from '../onblocRun';

type Part = Record<string, unknown>;

const usage = (outputTokens: number | undefined) => ({
  inputTokens: {
    total: 5,
    noCache: 5,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
});

const finish = (outputTokens: number | undefined): Part => ({
  type: 'finish',
  finishReason: { unified: 'stop', raw: 'stop' },
  usage: usage(outputTokens),
});

const text = (delta: string): Part[] => [
  { type: 'text-start', id: 't' },
  { type: 'text-delta', id: 't', delta },
  { type: 'text-end', id: 't' },
];

const reasoning = (delta: string): Part[] => [
  { type: 'reasoning-start', id: 'r' },
  { type: 'reasoning-delta', id: 'r', delta },
  { type: 'reasoning-end', id: 'r' },
];

const modelFrom = (parts: Part[], warnings: Part[] = []) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings });
          parts.forEach((part) => controller.enqueue(part));
          controller.close();
        },
      }) as never,
    }),
  });

const collect = async (events: AsyncGenerator<GenerateEvent>) => {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};

describe('generate', () => {
  it('separates reasoning from text and computes metrics', async () => {
    const model = modelFrom([
      ...reasoning('think'),
      ...text('answer'),
      finish(11),
    ]);
    // start, first delta, end
    const ticks = [0, 100, 1100];

    const events = await collect(
      generate(model, { prompt: 'hi' }, () => ticks.shift() as number)
    );

    expect(events).toEqual([
      { type: GenerateEventType.Reasoning, delta: 'think' },
      { type: GenerateEventType.Text, delta: 'answer' },
      {
        type: GenerateEventType.Done,
        aborted: false,
        finishReason: 'stop',
        warnings: [],
        messages: [expect.objectContaining({ role: 'assistant' })],
        metrics: {
          ttftMs: 100,
          totalMs: 1100,
          outputTokens: 11,
          tokensPerSec: 10, // (11 - 1) tokens over 1000 ms
        },
      },
    ]);
  });

  it('returns what the model said as messages to append to a conversation', async () => {
    const events = await collect(generate(modelFrom([...text('hello'), finish(2)]), { prompt: 'hi' }));

    expect(events[events.length - 1]).toMatchObject({
      messages: [
        { role: 'assistant', content: [expect.objectContaining({ type: 'text', text: 'hello' })] },
      ],
    });
  });

  it('answers from earlier messages when a conversation is given', async () => {
    const model = modelFrom([...text('x'), finish(1)]);

    await collect(
      generate(model, {
        messages: [
          { role: 'user', content: 'my name is Mina' },
          { role: 'assistant', content: 'hello Mina' },
          { role: 'user', content: 'what is my name?' },
        ],
      })
    );

    const sent = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(sent).toContain('my name is Mina');
    expect(sent).toContain('hello Mina');
    expect(sent).toContain('what is my name?');
  });

  it('leaves tokensPerSec undefined when usage is not reported', async () => {
    const model = modelFrom([...text('x'), finish(undefined)]);
    const ticks = [0, 10, 20];

    const [, done] = await collect(
      generate(model, { prompt: 'hi' }, () => ticks.shift() as number)
    );

    expect(done).toMatchObject({
      metrics: { outputTokens: undefined, tokensPerSec: undefined },
    });
  });

  it('avoids dividing by zero when a single token or zero-length decode', async () => {
    const single = modelFrom([...text('x'), finish(1)]);
    const instant = modelFrom([...text('x'), finish(50)]);

    const [, a] = await collect(generate(single, { prompt: 'hi' }));
    const ticks = [0, 5, 5]; // first delta and end at the same instant
    const [, b] = await collect(
      generate(instant, { prompt: 'hi' }, () => ticks.shift() as number)
    );

    expect(a).toMatchObject({ metrics: { tokensPerSec: undefined } });
    expect(b).toMatchObject({ metrics: { tokensPerSec: undefined } });
  });

  it('reports null ttft when nothing was generated', async () => {
    const events = await collect(
      generate(modelFrom([finish(0)]), { prompt: 'hi' })
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: GenerateEventType.Done,
      metrics: { ttftMs: null },
    });
  });

  it('forwards sampling options and reasoning mode to the model', async () => {
    const model = modelFrom([...text('x'), finish(1)]);

    await collect(
      generate(model, {
        prompt: 'hi',
        temperature: 0.3,
        maxOutputTokens: 64,
        reasoning: 'none',
      })
    );

    expect(model.doStreamCalls[0]).toMatchObject({
      temperature: 0.3,
      maxOutputTokens: 64,
      reasoning: 'none',
    });
  });

  it('throws stream errors', async () => {
    const model = modelFrom([{ type: 'error', error: new Error('boom') }]);

    await expect(collect(generate(model, { prompt: 'hi' }))).rejects.toThrow(
      'boom'
    );
  });

  it('ends with an aborted done event when the signal fires mid-stream', async () => {
    const model = new MockLanguageModelV4({
      doStream: async ({ abortSignal }) => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            text('partial').forEach((part) => controller.enqueue(part));
            abortSignal?.addEventListener('abort', () =>
              controller.error(new Error('aborted'))
            );
          },
        }) as never,
      }),
    });
    const abort = new AbortController();
    const events: GenerateEvent[] = [];

    for await (const event of generate(model, {
      prompt: 'hi',
      signal: abort.signal,
    })) {
      events.push(event);
      if (event.type === GenerateEventType.Text) abort.abort();
    }

    expect(events[0]).toEqual({ type: GenerateEventType.Text, delta: 'partial' });
    expect(events[events.length - 1]).toMatchObject({
      type: GenerateEventType.Done,
      aborted: true,
      messages: [],
    });
  });

  it('surfaces provider warnings in the done event', async () => {
    const model = modelFrom(
      [...text('x'), finish(1)],
      [{ type: 'unsupported', feature: 'reasoning', details: 'too big' }]
    );

    const events = await collect(generate(model, { prompt: 'hi' }));

    expect(events[events.length - 1]).toMatchObject({
      warnings: ['unsupported: reasoning: too big'],
    });
  });
});

describe('generate with tools', () => {
  const toolCall = (toolName: string, input: unknown, id = 'c1'): Part[] => [
    {
      type: 'tool-call',
      toolCallId: id,
      toolName,
      input: typeof input === 'string' ? input : JSON.stringify(input),
    },
    {
      type: 'finish',
      finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
      usage: usage(5),
    },
  ];

  // One entry per model call (step).
  const stepsModel = (steps: Part[][]) =>
    new MockLanguageModelV4({
      doStream: steps.map((parts) => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            parts.forEach((part) => controller.enqueue(part));
            controller.close();
          },
        }) as never,
      })),
    });

  it('discovers Onbloc tools and injects the configured address before executing', async () => {
    const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
    const name = 'get_native_balance';
    const calls: unknown[] = [];
    const fetcher: typeof fetch = async (_url, init) => {
      if (init?.method !== 'POST') return new Response(null, { status: 405 });
      const request = JSON.parse(String(init.body));
      if (request.id === undefined) return new Response(null, { status: 202 });
      let result;
      switch (request.method) {
        case 'initialize':
          result = { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'onbloc', version: '1' } };
          break;
        case 'tools/list':
          result = { tools: [{ name, description: 'Get GNOT', inputSchema: { type: 'object', properties: { address: { type: 'string' } },
            required: ['address'], additionalProperties: false }, annotations: { readOnlyHint: true } }] };
          break;
        case 'tools/call':
          calls.push(request.params);
          result = { content: [], structuredContent: { address: account, denom: 'ugnot', balance: '42000000' } };
          break;
        default:
          throw new Error(`Unexpected method ${request.method}`);
      }
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), {
        headers: { 'content-type': 'application/json' },
      });
    };
    const model = new MockLanguageModelV4({
      doStream: async () => { throw new Error('Native stream would emit a partial { argument'); },
      doGenerate: [
        { content: [{ type: 'tool-call', toolCallId: 'native', toolName: name, input: '{}' }],
          finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage: usage(5), warnings: [] },
        { content: [{ type: 'text', text: '42 GNOT' }],
          finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(3), warnings: [] },
      ],
    });
    const events = await collect(generate(withCompletedToolCalls(model), { prompt: 'My balance', onbloc: {
      endpoint: 'https://example.test/mcp', account, fetcher,
    } }));
    expect(calls).toEqual([{ name, arguments: { address: account } }]);
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: '42 GNOT' });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('42000000');
    expect(events.filter(event => event.type === GenerateEventType.ToolCall)).toEqual([
      expect.objectContaining({ name, input: {}, invalid: false }),
    ]);
  });

  describe('Onbloc reads with mock wallet actions', () => {
    const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
    const step = (content: unknown[], unified: 'tool-calls' | 'stop') => ({
      content: content as never,
      finishReason: { unified, raw: unified },
      usage: usage(5),
      warnings: [],
    });
    const call = (toolName: string, input: unknown) =>
      step([{ type: 'tool-call', toolCallId: toolName, toolName, input: JSON.stringify(input) }], 'tool-calls');
    const answer = (value: string) => step([{ type: 'text', text: value }], 'stop');
    const send = call(ToolName.Transfer, { to: FIXTURE.recipient, amount: '1', token: TokenSymbol.Gnot });

    const setup = (steps: ReturnType<typeof step>[], policy: ApprovalPolicy = ApprovalPolicy.Approve) => {
      const { fetcher } = fakeOnblocMcp([
        { name: 'get_native_balance', output: { address: account, denom: 'ugnot', balance: '10000000' } },
      ]);
      const sdk = new MockWalletSdk({
        requestApproval: autoApproval(policy),
        accounts: [{ name: 'me', address: account, balances: { GNOT: '10', GNS: '0' } }],
      });
      const model = new MockLanguageModelV4({
        doStream: async () => { throw new Error('Native stream would emit a partial { argument'); },
        doGenerate: steps,
      });
      const events = collect(generate(withCompletedToolCalls(model), {
        prompt: 'go',
        onbloc: { endpoint: 'https://example.test/mcp', account, fetcher },
        tools: createWalletTools({ sdk, activeAddress: account, contacts: FIXTURE.contacts }),
      }));
      return { sdk, events };
    };
    const results = (events: GenerateEvent[]) =>
      events.filter((event) => event.type === GenerateEventType.ToolResult);

    it('reads through Onbloc and transfers on the mock wallet in one run', async () => {
      const { sdk, events: pending } = setup([call('get_native_balance', {}), send, answer('Sent 1 GNOT')]);

      const events = await pending;

      expect(results(events)).toEqual([
        expect.objectContaining({ name: 'get_native_balance', output: expect.objectContaining({ kind: 'result' }) }),
        expect.objectContaining({ name: ToolName.Transfer, output: expect.objectContaining({ status: WalletStatus.Signed }) }),
      ]);
      expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Sent 1 GNOT' });
      expect(await sdk.getBalance(account)).toMatchObject({ GNOT: '9' });
      const done = events[events.length - 1];
      expect(done.type === GenerateEventType.Done && done.messages.length).toBeGreaterThan(0);
    });

    it('keeps the model answer when only a wallet action ran', async () => {
      const { events } = setup([send, answer('Done')]);

      expect(await events).toContainEqual({ type: GenerateEventType.Text, delta: 'Done' });
    });

    it('does not treat a rejected transfer as a failed lookup', async () => {
      const { sdk, events: pending } = setup([send, answer('Cancelled')], ApprovalPolicy.Reject);

      const events = await pending;

      expect(results(events)).toEqual([
        expect.objectContaining({ output: expect.objectContaining({ status: WalletStatus.Rejected }) }),
      ]);
      expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'Cancelled' });
      expect(await sdk.getBalance(account)).toMatchObject({ GNOT: '10' });
    });

    it('still replaces an answer that rests on no lookup and no action', async () => {
      const { events } = setup([answer('You have 5 GNOT')]);

      expect(await events).toContainEqual({
        type: GenerateEventType.Text,
        delta: 'No Onbloc lookup returned verified data.',
      });
    });

    it('reports a failed lookup even when a wallet action ran', async () => {
      const { events } = setup([send, call('no_such_tool', {}), answer('All good')]);

      expect(await events).toContainEqual({
        type: GenerateEventType.Text,
        delta: 'Some Onbloc lookups failed. Review the individual tool results.',
      });
    });
  });

  const newSdk = (policy: ApprovalPolicy = ApprovalPolicy.Approve) =>
    new MockWalletSdk({ requestApproval: autoApproval(policy) });

  const run = async (model: MockLanguageModelV4, sdk: MockWalletSdk, maxSteps?: number) =>
    collect(
      generate(model, {
        prompt: 'go',
        tools: createWalletTools({ sdk, activeAddress: ACTIVE_ADDRESS, contacts: FIXTURE.contacts }),
        maxSteps,
      })
    );

  const gnot = TokenSymbol.Gnot;
  const recipient = FIXTURE.recipient;
  const callOf = (events: GenerateEvent[]) =>
    events.find((e) => e.type === GenerateEventType.ToolCall);

  it('runs the tool against the wallet and feeds the result to a second model call', async () => {
    const sdk = newSdk();
    const model = stepsModel([
      toolCall(ToolName.GetApprovals, {}),
      [...text('You have no approvals'), finish(8)],
    ]);

    const events = await run(model, sdk, 3);

    expect(events.filter((e) => e.type !== GenerateEventType.Done)).toEqual([
      {
        type: GenerateEventType.ToolCall,
        id: 'c1',
        name: ToolName.GetApprovals,
        input: {},
        invalid: false,
        error: undefined,
      },
      {
        type: GenerateEventType.ToolResult,
        id: 'c1',
        name: ToolName.GetApprovals,
        output: { status: WalletStatus.Ok, address: ACTIVE_ADDRESS, approvals: [] },
      },
      { type: GenerateEventType.Text, delta: 'You have no approvals' },
    ]);
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('chains get_approvals and transfer: the transfer is signed in the popup and moves the funds', async () => {
    const sdk = newSdk();
    const model = stepsModel([
      toolCall(ToolName.GetApprovals, {}, 'a'),
      toolCall(ToolName.Transfer, { to: recipient, amount: '5', token: gnot }, 'b'),
      [...text('Sent'), finish(4)],
    ]);

    const events = await run(model, sdk, 5);

    expect(
      events.find((e) => e.type === GenerateEventType.ToolResult && e.id === 'b')
    ).toMatchObject({
      output: expect.objectContaining({ status: WalletStatus.Signed }),
    });
    expect(sdk.approvals).toHaveLength(1);
    expect(await sdk.getBalance(ACTIVE_ADDRESS)).toMatchObject({ GNOT: '5' });
    expect(await sdk.getBalance(recipient)).toMatchObject({ GNOT: '5' });
  });

  it('stops after one model call by default even when a tool ran', async () => {
    const model = stepsModel([toolCall(ToolName.GetApprovals, {})]);

    const events = await run(model, newSdk());

    expect(events.some((e) => e.type === GenerateEventType.ToolResult)).toBe(true);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it('caps model calls at maxSteps', async () => {
    const model = stepsModel([
      toolCall(ToolName.GetApprovals, {}, 'a'),
      toolCall(ToolName.GetApprovals, {}, 'b'),
      toolCall(ToolName.GetApprovals, {}, 'c'),
    ]);

    await run(model, newSdk(), 2);

    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('flags arguments that fail schema validation and does not execute them', async () => {
    const sdk = newSdk();
    // amount must be a string
    const model = stepsModel([
      toolCall(ToolName.Transfer, { to: recipient, amount: 0.5, token: gnot }),
    ]);

    const events = await run(model, sdk);

    const call = callOf(events);
    expect(call).toMatchObject({ name: ToolName.Transfer, invalid: true });
    expect(call?.type === GenerateEventType.ToolCall && call.error).toBeTruthy();
    expect(sdk.approvals).toEqual([]);
    expect(await sdk.getBalance(ACTIVE_ADDRESS)).toMatchObject({ GNOT: '10' });
  });

  it('flags calls to tools that do not exist', async () => {
    const sdk = newSdk();
    const model = stepsModel([toolCall('burn_everything', {})]);

    const events = await run(model, sdk);

    expect(callOf(events)).toMatchObject({ name: 'burn_everything', invalid: true });
    expect(sdk.approvals).toEqual([]);
  });

  it('flags unparsable argument JSON', async () => {
    const model = stepsModel([toolCall(ToolName.GetApprovals, '{"x": "g1')]);

    const events = await run(model, newSdk());

    expect(callOf(events)).toMatchObject({ name: ToolName.GetApprovals, invalid: true });
  });

  it('passes well-formed but wrong values through so the wallet can refuse them', async () => {
    const sdk = newSdk();
    const model = stepsModel([
      toolCall(ToolName.Transfer, { to: 'bob', amount: '1', token: gnot }),
    ]);

    const events = await run(model, sdk);

    expect(callOf(events)).toMatchObject({ invalid: false });
    expect(events.find((e) => e.type === GenerateEventType.ToolResult)).toMatchObject({
      output: expect.objectContaining({
        status: WalletStatus.Error,
        code: WalletErrorCode.InvalidAddress,
      }),
    });
    expect(sdk.approvals).toEqual([]);
  });

  it('returns the tool exchange as messages: call, result, then the answer', async () => {
    const model = stepsModel([
      toolCall(ToolName.GetApprovals, {}),
      [...text('You have no approvals'), finish(8)],
    ]);

    const events = await run(model, newSdk(), 3);

    const done = events[events.length - 1];
    expect(done.type === GenerateEventType.Done && done.messages.map((m) => m.role)).toEqual([
      'assistant',
      'tool',
      'assistant',
    ]);
  });
});
