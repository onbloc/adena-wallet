import type { GenerateEvent, GenerateSettings, LLM } from '../../../llm/core';
import { TimingLLM } from '../timing';

const done = (outputTokens?: number): GenerateEvent => ({
  type: 'done', aborted: false, finishReason: 'stop', warnings: [], messages: [], metrics: { totalMs: 1, ttftMs: 1, outputTokens },
});

/** A model whose every call takes `ms` on the shared clock and ends with `tokens` output tokens. */
function model(clock: { t: number }, ms: number, tokens?: number, failWith?: Error): LLM {
  return {
    kind: 'local',
    contextTokens: 8192,
    async *generate() {
      yield { type: 'text', delta: 'x' } as GenerateEvent;
      clock.t += ms;
      if (failWith) throw failWith;
      yield done(tokens);
    },
  };
}

async function drain(events: AsyncIterable<GenerateEvent>) {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

const structured = { prompt: 'x', outputSchema: {} as never } satisfies GenerateSettings;
const plain = { prompt: 'x' } satisfies GenerateSettings;

describe('TimingLLM', () => {
  it('passes events through unchanged and times each call', async () => {
    const clock = { t: 0 };
    const llm = new TimingLLM(model(clock, 250, 6), () => clock.t);

    const events = await drain(llm.generate(structured));

    expect(events.map((event) => event.type)).toEqual(['text', 'done']);
    expect(llm.take()).toEqual([{ label: 'classify', ms: 250, outputTokens: 6 }]);
  });

  it('labels the first structured call classify, the next extract, and an unstructured one answer', async () => {
    const clock = { t: 0 };
    const llm = new TimingLLM(model(clock, 100), () => clock.t);

    await drain(llm.generate(structured));
    await drain(llm.generate(structured));
    await drain(llm.generate(plain));

    expect(llm.take().map(({ label }) => label)).toEqual(['classify', 'extract', 'answer']);
  });

  it('starts over after take, and a second take is empty', async () => {
    const clock = { t: 0 };
    const llm = new TimingLLM(model(clock, 100), () => clock.t);
    await drain(llm.generate(structured));
    await drain(llm.generate(structured));
    llm.take();

    await drain(llm.generate(structured));

    expect(llm.take().map(({ label }) => label)).toEqual(['classify']);
    expect(llm.take()).toEqual([]);
  });

  it('still records a call that fails, with the time it took', async () => {
    const clock = { t: 0 };
    const llm = new TimingLLM(model(clock, 700, undefined, new Error('boom')), () => clock.t);

    await expect(drain(llm.generate(structured))).rejects.toThrow('boom');

    expect(llm.take()).toEqual([{ label: 'classify', ms: 700 }]);
  });

  it('has the context window of the model it wraps', () => {
    expect(new TimingLLM(model({ t: 0 }, 0)).contextTokens).toBe(8192);
  });
});
