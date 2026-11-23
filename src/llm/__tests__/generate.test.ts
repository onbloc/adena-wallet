import { MockLanguageModelV4 } from 'ai/test';

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

const modelFrom = (parts: Part[]) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
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
});
