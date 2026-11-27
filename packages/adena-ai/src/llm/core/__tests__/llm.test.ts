import { MockLanguageModelV4 } from 'ai/test';

import { GenerateEventType, type GenerateEvent } from '../generate';
import { LLMFromModel } from '../llm';

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 3, text: 3, reasoning: undefined },
};

const answering = (reply: string) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          controller.enqueue({ type: 'text-start', id: 't' });
          controller.enqueue({ type: 'text-delta', id: 't', delta: reply });
          controller.enqueue({ type: 'text-end', id: 't' });
          controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage });
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

describe('LLMFromModel', () => {
  it('generates with the model it was given', async () => {
    const llm = new LLMFromModel(answering('hello'));

    const events = await collect(llm.generate({ prompt: 'hi' }));

    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'hello' });
    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, aborted: false });
  });

  it('applies its configured context window to conversation history', async () => {
    const model = answering('hello');
    const llm = new LLMFromModel(model, { contextTokens: 1600 });
    await collect(llm.generate({
      messages: [
        { role: 'user', content: 'old question' },
        { role: 'assistant', content: 'x'.repeat(5000) },
        { role: 'user', content: 'recent question' },
        { role: 'assistant', content: 'recent answer' },
        { role: 'user', content: 'current question' },
      ],
      maxOutputTokens: 128,
    }));
    const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(prompt).not.toContain('old question');
    expect(prompt).toContain('recent question');
    expect(prompt).toContain('current question');
  });

  it('honors a smaller per-generation budget and forwards compaction notifications', async () => {
    const model = answering('hello');
    const llm = new LLMFromModel(model, { contextTokens: 8192 });
    const onContextCompacted = jest.fn();
    await collect(llm.generate({
      messages: [
        { role: 'user', content: 'old question' },
        { role: 'assistant', content: 'x'.repeat(5000) },
        { role: 'user', content: 'current question' },
      ],
      maxOutputTokens: 128,
    }, { contextTokens: 1200, onContextCompacted }));
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).not.toContain('old question');
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain('current question');
    expect(onContextCompacted).toHaveBeenCalledWith(1);
    expect(llm.contextTokens).toBe(8192);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 8193])(
    'rejects invalid or increased generation budgets before calling the model: %s',
    async contextTokens => {
      const model = answering('hello');
      const llm = new LLMFromModel(model);
      await expect(async () => collect(llm.generate({ prompt: 'hi' }, { contextTokens }))).rejects.toThrow(RangeError);
      expect(model.doStreamCalls).toHaveLength(0);
    }
  );

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid configured model windows: %s',
    contextTokens => {
      expect(() => new LLMFromModel(answering('hello'), { contextTokens })).toThrow(RangeError);
    }
  );

  it('closes the tool loop it is handed when the generation ends', async () => {
    const close = jest.fn();
    const llm = new LLMFromModel(answering('hello'));

    await collect(llm.generate({ prompt: 'hi' }, { loop: { options: {}, close } }));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the tool loop once when the context budget is invalid', async () => {
    const close = jest.fn();
    const llm = new LLMFromModel(answering('hello'));

    await expect(async () => collect(llm.generate({ prompt: 'hi' }, { contextTokens: 8193, loop: { options: {}, close } })))
      .rejects.toThrow(RangeError);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ends with an aborted done event when the signal is already aborted', async () => {
    const llm = new LLMFromModel(answering('hello'));
    const controller = new AbortController();
    controller.abort();

    const events = await collect(llm.generate({ prompt: 'hi' }, { signal: controller.signal }));

    expect(events[events.length - 1]).toMatchObject({ type: GenerateEventType.Done, aborted: true });
  });

  it('reports the context size it was given, else 8192', () => {
    expect(new LLMFromModel(answering('x')).contextTokens).toBe(8192);
    expect(new LLMFromModel(answering('x'), { contextTokens: 4096 }).contextTokens).toBe(4096);
  });

  it('assumes prompts leave the device unless told the model is local', () => {
    expect(new LLMFromModel(answering('x')).kind).toBe('remote');
    expect(new LLMFromModel(answering('x'), { kind: 'local' }).kind).toBe('local');
  });
});
