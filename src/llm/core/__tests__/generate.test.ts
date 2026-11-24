import { tool } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { generate, GenerateEventType, type GenerateEvent } from '../generate';

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

// Step markers are checked on their own; the other tests read the content events.
const collectAll = async (events: AsyncGenerator<GenerateEvent>) => {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};
const collect = async (events: AsyncGenerator<GenerateEvent>) =>
  (await collectAll(events)).filter((event) => event.type !== GenerateEventType.StepStart);

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

    expect(events[1]).toEqual({ type: GenerateEventType.Text, delta: 'partial' });
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

  // `lookup` needs a string; `fail` always throws. `ran` records what executed.
  const setup = () => {
    const ran: string[] = [];
    const tools = {
      lookup: tool({
        description: 'Looks a key up',
        inputSchema: z.object({ key: z.string() }),
        execute: async ({ key }) => {
          ran.push(key);
          return { value: key.toUpperCase() };
        },
      }),
      fail: tool({
        description: 'Always fails',
        inputSchema: z.object({}),
        execute: async (): Promise<string> => {
          throw new Error('boom');
        },
      }),
    };
    return { ran, tools };
  };
  const answer = [...text('done'), finish(3)];
  const callOf = (events: GenerateEvent[]) =>
    events.find((e) => e.type === GenerateEventType.ToolCall);

  it('runs the tool and feeds the result to a second model call', async () => {
    const { ran, tools } = setup();
    const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);

    const events = await collect(generate(model, { prompt: 'go', tools, maxSteps: 3 }));

    expect(events.filter((e) => e.type !== GenerateEventType.Done)).toEqual([
      { type: GenerateEventType.ToolCall, id: 'c1', name: 'lookup', input: { key: 'abc' }, invalid: false, error: undefined },
      { type: GenerateEventType.ToolResult, id: 'c1', name: 'lookup', output: { value: 'ABC' } },
      { type: GenerateEventType.Text, delta: 'done' },
    ]);
    expect(ran).toEqual(['abc']);
    expect(model.doStreamCalls).toHaveLength(2);
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('ABC');
  });

  it('stops after one model call by default even when a tool ran', async () => {
    const { tools } = setup();
    const model = stepsModel([toolCall('lookup', { key: 'abc' })]);

    const events = await collect(generate(model, { prompt: 'go', tools }));

    expect(events.some((e) => e.type === GenerateEventType.ToolResult)).toBe(true);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it('caps model calls at maxSteps', async () => {
    const { tools } = setup();
    const model = stepsModel([
      toolCall('lookup', { key: 'a' }, 'a'),
      toolCall('lookup', { key: 'b' }, 'b'),
      toolCall('lookup', { key: 'c' }, 'c'),
    ]);

    await collect(generate(model, { prompt: 'go', tools, maxSteps: 2 }));

    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('flags arguments that fail schema validation and does not execute them', async () => {
    const { ran, tools } = setup();
    // key must be a string
    const model = stepsModel([toolCall('lookup', { key: 5 })]);

    const events = await collect(generate(model, { prompt: 'go', tools }));

    const call = callOf(events);
    expect(call).toMatchObject({ name: 'lookup', invalid: true });
    expect(call?.type === GenerateEventType.ToolCall && call.error).toBeTruthy();
    expect(ran).toEqual([]);
  });

  it('flags calls to tools that do not exist', async () => {
    const { ran, tools } = setup();
    const model = stepsModel([toolCall('burn_everything', {})]);

    const events = await collect(generate(model, { prompt: 'go', tools }));

    expect(callOf(events)).toMatchObject({ name: 'burn_everything', invalid: true });
    expect(ran).toEqual([]);
  });

  it('flags unparsable argument JSON', async () => {
    const { tools } = setup();
    const model = stepsModel([toolCall('lookup', '{"key": "g1')]);

    const events = await collect(generate(model, { prompt: 'go', tools }));

    expect(callOf(events)).toMatchObject({ name: 'lookup', invalid: true });
  });

  it('reports a tool that throws as a tool error on a valid call', async () => {
    const { tools } = setup();
    const model = stepsModel([toolCall('fail', {})]);

    const events = await collect(generate(model, { prompt: 'go', tools }));

    expect(callOf(events)).toMatchObject({ name: 'fail', invalid: false });
    expect(events.find((e) => e.type === GenerateEventType.ToolError)).toMatchObject({
      name: 'fail',
      error: 'boom',
    });
  });

  it('returns the tool exchange as messages: call, result, then the answer', async () => {
    const { tools } = setup();
    const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);

    const events = await collect(generate(model, { prompt: 'go', tools, maxSteps: 3 }));

    const done = events[events.length - 1];
    expect(done.type === GenerateEventType.Done && done.messages.map((m) => m.role)).toEqual([
      'assistant',
      'tool',
      'assistant',
    ]);
  });

  it('marks the start of each model call', async () => {
    const { tools } = setup();
    const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);

    const events = await collectAll(generate(model, { prompt: 'go', tools, maxSteps: 3 }));

    expect(events.filter((e) => e.type === GenerateEventType.StepStart)).toHaveLength(2);
  });

  describe('with a tool loop from the layer above', () => {
    it('runs the loop tools and closes it when the generation ends', async () => {
      const close = jest.fn();
      const { ran, tools } = setup();
      const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);

      const events = await collect(
        generate(model, { prompt: 'go', loop: { options: { tools, stopWhen: () => false }, close } })
      );

      expect(events.some((e) => e.type === GenerateEventType.ToolResult)).toBe(true);
      expect(ran).toEqual(['abc']);
      expect(model.doStreamCalls).toHaveLength(2);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes the loop when the model call fails', async () => {
      const close = jest.fn();
      const model = new MockLanguageModelV4({
        doStream: async () => {
          throw new Error('boom');
        },
      });

      await expect(
        collect(generate(model, { prompt: 'go', loop: { options: {}, close } }))
      ).rejects.toThrow('boom');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("treats the loop's abort signal as a stop, not a failure", async () => {
      const controller = new AbortController();
      controller.abort();
      const close = jest.fn();
      const model = modelFrom([...text('x'), finish(1)]);

      const events = await collect(
        generate(model, { prompt: 'go', loop: { options: { abortSignal: controller.signal }, close } })
      );

      expect(events[events.length - 1]).toMatchObject({
        type: GenerateEventType.Done,
        aborted: true,
        messages: [],
      });
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
