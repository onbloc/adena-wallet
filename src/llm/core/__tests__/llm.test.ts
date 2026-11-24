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

  it('closes the tool loop it is handed when the generation ends', async () => {
    const close = jest.fn();
    const llm = new LLMFromModel(answering('hello'));

    await collect(llm.generate({ prompt: 'hi' }, { loop: { options: {}, close } }));

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
});
