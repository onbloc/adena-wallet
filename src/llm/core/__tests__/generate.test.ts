import { tool } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { generate, GenerateEventType, type GenerateEvent } from '../generate';
import { createChatSession } from '../session';

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

  it('does not notify when the complete input fits without compaction', async () => {
    const onContextCompacted = jest.fn();
    const model = modelFrom([...text('answer'), finish(1)]);
    await collect(generate(model, {
      messages: [
        { role: 'user', content: 'earlier question' },
        { role: 'assistant', content: 'earlier answer' },
        { role: 'user', content: 'current question' },
      ],
      contextTokens: 2000,
      onContextCompacted,
    }));
    expect(onContextCompacted).not.toHaveBeenCalled();
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain('earlier question');
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid context budgets and closes the loop: %s',
    async contextTokens => {
      const model = modelFrom([...text('answer'), finish(1)]);
      const close = jest.fn();
      const onContextCompacted = jest.fn();
      await expect(collect(generate(model, {
        prompt: 'question', contextTokens, onContextCompacted, loop: { options: {}, close },
      }))).rejects.toThrow(RangeError);
      expect(close).toHaveBeenCalledTimes(1);
      expect(onContextCompacted).not.toHaveBeenCalled();
      expect(model.doStreamCalls).toHaveLength(0);
    }
  );

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

  it('reserves structured-output schema space before calling the model', async () => {
    const model = modelFrom([...text('{"route":"explanation"}'), finish(5)]);
    const outputSchema = z.object({ route: z.string().describe('x'.repeat(6000)) });

    await expect(collect(generate(model, {
      prompt: 'Classify the request.', contextTokens: 2048, maxOutputTokens: 128, outputSchema,
    }))).rejects.toThrow(Error);
    expect(model.doStreamCalls).toEqual([]);
  });

  it.each(['caller', 'loop'] as const)('cancels a running provider from the %s signal when both are supplied', async source => {
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
    const caller = new AbortController();
    const loop = new AbortController();
    const close = jest.fn();
    const events: GenerateEvent[] = [];

    for await (const event of generate(model, {
      prompt: 'hi',
      signal: caller.signal,
      loop: { options: { abortSignal: loop.signal }, close },
    })) {
      events.push(event);
      if (event.type === GenerateEventType.Text) (source === 'caller' ? caller : loop).abort();
    }

    expect(events[1]).toEqual({ type: GenerateEventType.Text, delta: 'partial' });
    expect(events[events.length - 1]).toMatchObject({
      type: GenerateEventType.Done,
      aborted: true,
      messages: [],
    });
    expect(model.doStreamCalls).toHaveLength(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each(['caller', 'loop', 'both'] as const)('does not call the provider when %s is already aborted', async source => {
    const caller = new AbortController();
    const loop = new AbortController();
    if (source !== 'loop') caller.abort();
    if (source !== 'caller') loop.abort();
    const close = jest.fn();
    const model = modelFrom([...text('must not run'), finish(1)]);

    const events = await collect(generate(model, {
      prompt: 'hi',
      signal: caller.signal,
      loop: { options: { abortSignal: loop.signal }, close },
    }));

    expect(events).toEqual([expect.objectContaining({
      type: GenerateEventType.Done,
      aborted: true,
      messages: [],
    })]);
    expect(model.doStreamCalls).toHaveLength(0);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not turn a completed response into an abort when closing the loop aborts its signal', async () => {
    const caller = new AbortController();
    const loop = new AbortController();
    const close = jest.fn(() => loop.abort());
    const model = modelFrom([...text('complete'), finish(1)]);

    const events = await collect(generate(model, {
      prompt: 'hi',
      signal: caller.signal,
      loop: { options: { abortSignal: loop.signal }, close },
    }));

    expect(events[events.length - 1]).toMatchObject({
      type: GenerateEventType.Done,
      aborted: false,
      messages: [expect.objectContaining({ role: 'assistant' })],
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(loop.signal.aborted).toBe(true);
    expect(caller.signal.aborted).toBe(false);
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

  it('compacts earlier text turns on each step without losing the current tool exchange', async () => {
    const { ran, tools } = setup();
    const session = createChatSession();
    session.complete('old-prompt', 'x'.repeat(5000));
    session.complete('recent-prompt', 'recent-answer');
    const onContextCompacted = (count: number) => session.trimOldest(count);
    const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);
    await collect(generate(model, {
      messages: session.messages('current-request'),
      tools, maxSteps: 3, contextTokens: 1800, maxOutputTokens: 128, onContextCompacted,
    }));
    expect(ran).toEqual(['abc']);
    expect(model.doStreamCalls).toHaveLength(2);
    for (const call of model.doStreamCalls) {
      const prompt = JSON.stringify(call.prompt);
      expect(prompt).not.toContain('old-prompt');
      expect(prompt).toContain('recent-prompt');
      expect(prompt).toContain('current-request');
    }
    const continuation = JSON.stringify(model.doStreamCalls[1].prompt);
    expect(continuation).toContain('tool-call');
    expect(continuation).toContain('tool-result');
    expect(continuation).toContain('c1');
    expect(continuation).toContain('ABC');
    expect(session.turns).toEqual([{ prompt: 'recent-prompt', answer: 'recent-answer' }]);
  });

  it('rejects an oversized current request without truncating it or executing a tool', async () => {
    const { ran, tools } = setup();
    const model = stepsModel([toolCall('lookup', { key: 'abc' }), answer]);
    const onContextCompacted = jest.fn();
    const messages = [
      { role: 'user' as const, content: 'old question' },
      { role: 'assistant' as const, content: 'old answer' },
      { role: 'user' as const, content: 'current request '.repeat(1000) },
    ];
    const original = JSON.stringify(messages);
    await expect(collect(generate(model, {
      messages, tools, maxSteps: 3, contextTokens: 1800, maxOutputTokens: 128, onContextCompacted,
    }))).rejects.toThrow(Error);
    expect(JSON.stringify(messages)).toBe(original);
    expect(onContextCompacted).not.toHaveBeenCalled();
    expect(model.doStreamCalls).toHaveLength(0);
    expect(ran).toEqual([]);
  });

  it.each(['system', 'schema', 'output'] as const)(
    'reserves the context budget for %s before any tool executes',
    async reservation => {
      const execute = jest.fn(async () => 'result');
      const tools = {
        lookup: tool({
          description: reservation === 'schema' ? 'x'.repeat(5000) : 'Lookup',
          inputSchema: z.object({}),
          execute,
        }),
      };
      const model = stepsModel([toolCall('lookup', {}), answer]);
      const onContextCompacted = jest.fn();
      await expect(collect(generate(model, {
        prompt: 'current request',
        system: reservation === 'system' ? 'x'.repeat(5000) : undefined,
        tools,
        contextTokens: 1000,
        maxOutputTokens: reservation === 'output' ? 1000 : 128,
        onContextCompacted,
      }))).rejects.toThrow(Error);
      expect(execute).not.toHaveBeenCalled();
      expect(model.doStreamCalls).toHaveLength(0);
      expect(onContextCompacted).not.toHaveBeenCalled();
    }
  );

  it('rejects an oversized live tool result instead of cutting the active exchange', async () => {
    const execute = jest.fn(async () => 'x'.repeat(5000));
    const tools = {
      lookup: tool({ description: 'Lookup', inputSchema: z.object({}), execute }),
    };
    const model = stepsModel([toolCall('lookup', {}), answer]);
    const onContextCompacted = jest.fn();
    await expect(collect(generate(model, {
      messages: [
        { role: 'user', content: 'old question' },
        { role: 'assistant', content: 'old answer' },
        { role: 'user', content: 'current request' },
      ],
      tools, maxSteps: 3, contextTokens: 1800, maxOutputTokens: 128, onContextCompacted,
    }))).rejects.toThrow(Error);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(model.doStreamCalls).toHaveLength(1);
    expect(onContextCompacted).not.toHaveBeenCalled();
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

    it('leaves managed compaction and its notifications to the loop prepareStep', async () => {
      const close = jest.fn();
      const prepared = jest.fn();
      const onContextCompacted = jest.fn();
      const model = modelFrom([...text('answer'), finish(1)]);
      await collect(generate(model, {
        messages: [
          { role: 'user', content: 'old question' },
          { role: 'assistant', content: 'x'.repeat(5000) },
          { role: 'user', content: 'current request' },
        ],
        contextTokens: 1800,
        onContextCompacted,
        loop: {
          options: {
            prepareStep: ({ messages }) => {
              prepared();
              return { messages: messages.slice(2) };
            },
          },
          close,
        },
      }));
      expect(prepared).toHaveBeenCalledTimes(1);
      expect(onContextCompacted).not.toHaveBeenCalled();
      expect(JSON.stringify(model.doStreamCalls[0].prompt)).not.toContain('old question');
      expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain('current request');
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
      expect(model.doStreamCalls).toHaveLength(0);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
