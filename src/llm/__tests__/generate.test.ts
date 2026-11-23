import { MockLanguageModelV4 } from 'ai/test';

import { MockWallet } from '../../wallet/mockWallet';
import { createWalletTools } from '../../wallet/tools';
import { generate, type GenerateEvent } from '../generate';

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
      { type: 'reasoning', delta: 'think' },
      { type: 'text', delta: 'answer' },
      {
        type: 'done',
        aborted: false,
        finishReason: 'stop',
        warnings: [],
        metrics: {
          ttftMs: 100,
          totalMs: 1100,
          outputTokens: 11,
          tokensPerSec: 10, // (11 - 1) tokens over 1000 ms
        },
      },
    ]);
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
      type: 'done',
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
      if (event.type === 'text') abort.abort();
    }

    expect(events[0]).toEqual({ type: 'text', delta: 'partial' });
    expect(events[events.length - 1]).toMatchObject({
      type: 'done',
      aborted: true,
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

  const run = async (
    model: MockLanguageModelV4,
    wallet: MockWallet,
    maxSteps?: number
  ) =>
    collect(
      generate(model, {
        prompt: 'go',
        tools: createWalletTools(wallet),
        maxSteps,
      })
    );

  it('runs the tool against the wallet and feeds the result to a second model call', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([
      toolCall('get_balance', { token: 'GNOT' }),
      [...text('잔액은 10 GNOT입니다'), finish(8)],
    ]);

    const events = await run(model, wallet, 3);

    expect(events.filter((e) => e.type !== 'done')).toEqual([
      {
        type: 'tool-call',
        id: 'c1',
        name: 'get_balance',
        input: { token: 'GNOT' },
        invalid: false,
        error: undefined,
      },
      {
        type: 'tool-result',
        id: 'c1',
        name: 'get_balance',
        output: expect.objectContaining({ status: 'ok', balance: '10' }),
      },
      { type: 'text', delta: '잔액은 10 GNOT입니다' },
    ]);
    expect(wallet.calls.map((c) => c.tool)).toEqual(['get_balance']);
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('stops after one model call by default even when a tool ran', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([toolCall('get_balance', { token: 'GNOT' })]);

    await run(model, wallet);

    expect(wallet.calls).toHaveLength(1);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it('caps model calls at maxSteps', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([
      toolCall('get_balance', { token: 'GNOT' }, 'a'),
      toolCall('get_balance', { token: 'GNOT' }, 'b'),
      toolCall('get_balance', { token: 'GNOT' }, 'c'),
    ]);

    await run(model, wallet, 2);

    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('flags arguments that fail schema validation and does not execute them', async () => {
    const wallet = new MockWallet();
    // amount must be a string
    const model = stepsModel([
      toolCall('transfer', {
        to: 'g1qpzry9x8gf2tvdw0s3jn54khce6mua7lqpzry9',
        amount: 0.5,
        token: 'GNOT',
      }),
    ]);

    const events = await run(model, wallet);

    const call = events.find((e) => e.type === 'tool-call');
    expect(call).toMatchObject({ name: 'transfer', invalid: true });
    expect(call?.type === 'tool-call' && call.error).toBeTruthy();
    expect(wallet.calls).toEqual([]);
  });

  it('flags calls to tools that do not exist', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([toolCall('burn_everything', {})]);

    const events = await run(model, wallet);

    expect(events.find((e) => e.type === 'tool-call')).toMatchObject({
      name: 'burn_everything',
      invalid: true,
    });
    expect(wallet.calls).toEqual([]);
  });

  it('flags unparsable argument JSON', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([toolCall('get_balance', '{"token": "GN')]);

    const events = await run(model, wallet);

    expect(events.find((e) => e.type === 'tool-call')).toMatchObject({
      name: 'get_balance',
      invalid: true,
    });
    expect(wallet.calls).toEqual([]);
  });

  it('passes well-formed but wrong values through so the wallet can reject them', async () => {
    const wallet = new MockWallet();
    const model = stepsModel([
      toolCall('transfer', { to: 'alice', amount: '1', token: 'GNOT' }),
    ]);

    const events = await run(model, wallet);

    expect(events.find((e) => e.type === 'tool-call')).toMatchObject({ invalid: false });
    expect(events.find((e) => e.type === 'tool-result')).toMatchObject({
      output: expect.objectContaining({ code: 'invalid_address' }),
    });
  });
});
