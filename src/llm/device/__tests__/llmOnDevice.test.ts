import * as llamaModule from '@react-native-ai/llama';
import { jsonSchema, tool } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { GenerateEventType, type GenerateEvent } from '../../core';
import { LLMOnDevice } from '../llmOnDevice';
import * as modelStorage from '../modelStorage';

jest.mock('@react-native-ai/llama', () => ({
  llama: { languageModel: jest.fn() },
}));

jest.mock('../modelStorage', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
}));

const mocked = { ...jest.mocked(llamaModule), ...jest.mocked(modelStorage) };

const usage = (outputTokens: number) => ({
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
});

/** What llama.rn hands out: a language model that also loads and unloads. */
const llamaModel = (model: MockLanguageModelV4) =>
  Object.assign(model, {
    prepare: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
  });

/** Streams its text in pieces. */
const streaming = (...pieces: string[]) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          controller.enqueue({ type: 'text-start', id: 't' });
          for (const delta of pieces.length > 0 ? pieces : ['Hel', 'lo']) {
            controller.enqueue({ type: 'text-delta', id: 't', delta });
          }
          controller.enqueue({ type: 'text-end', id: 't' });
          controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(2) });
          controller.close();
        },
      }) as never,
    }),
  });

/** Like native llama: its stream would emit a tool call before the arguments are complete. */
const toolCalling = () =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw new Error('Native stream would emit a partial { argument');
    },
    doGenerate: [
      {
        content: [{ type: 'tool-call', toolCallId: 'c', toolName: 'ping', input: '{}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: usage(5),
        warnings: [],
      },
      {
        content: [{ type: 'text', text: 'pong' }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: usage(2),
        warnings: [],
      },
    ],
  });

const collect = async (events: AsyncGenerator<GenerateEvent>) => {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
};

const loaded = async (model: MockLanguageModelV4) => {
  mocked.isModelDownloaded.mockResolvedValue(true);
  mocked.llama.languageModel.mockReturnValue(llamaModel(model) as never);
  const llm = new LLMOnDevice();
  await llm.load();
  return llm;
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('LLMOnDevice', () => {
  it('fails clearly when asked to generate before the model is loaded', async () => {
    const llm = new LLMOnDevice();

    await expect(collect(llm.generate({ prompt: 'hi' }))).rejects.toThrow('Model is not loaded');
  });

  it('closes the acquired loop when generation fails before the model is loaded', async () => {
    const llm = new LLMOnDevice();
    const close = jest.fn();

    await expect(
      collect(llm.generate({ prompt: 'hi' }, { loop: { options: {}, close } }))
    ).rejects.toThrow('Model is not loaded');

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('reports its load through status and subscribe', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(llamaModel(streaming()) as never);
    const llm = new LLMOnDevice();
    const seen: string[] = [];
    llm.subscribe(() => seen.push(llm.status.state));

    await llm.load();

    expect(seen).toEqual(['loading', 'ready']);
    expect(llm.status.state).toBe('ready');
  });

  it('streams text as it arrives when no tools are in play', async () => {
    const llm = await loaded(streaming());

    const events = await collect(llm.generate({ prompt: 'hi' }));

    expect(events.filter((e) => e.type === GenerateEventType.Text)).toEqual([
      { type: GenerateEventType.Text, delta: 'Hel' },
      { type: GenerateEventType.Text, delta: 'lo' },
    ]);
  });

  it('uses a plain JSON-schema grammar for structured output and leaves plain text alone', async () => {
    const model = streaming('{"route":', '"prepare"}');
    const llm = await loaded(model);

    await collect(llm.generate({ prompt: 'classify', outputSchema: z.object({ route: z.string() }) }));
    await collect(llm.generate({ prompt: 'hi' }));

    expect(model.doStreamCalls[0].responseFormat?.type).toBe('json');
    expect(model.doStreamCalls[0].providerOptions).toEqual({ llama: { jinja: false } });
    expect(model.doStreamCalls[1].providerOptions).toBeUndefined();
  });

  it('bounds an on-device conversation by the loaded context window', async () => {
    const model = streaming();
    const llm = await loaded(model);
    await collect(llm.generate({
      messages: [
        { role: 'user', content: 'old question' },
        { role: 'assistant', content: 'x'.repeat(20_000) },
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

  it('honors a smaller generation budget and forwards compaction notifications', async () => {
    const model = streaming();
    const llm = await loaded(model);
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
    'rejects invalid or increased generation budgets before native generation: %s',
    async contextTokens => {
      const model = streaming();
      const llm = await loaded(model);
      await expect(collect(llm.generate({ prompt: 'hi' }, { contextTokens }))).rejects.toThrow(RangeError);
      expect(model.doStreamCalls).toHaveLength(0);
      expect(model.doGenerateCalls).toHaveLength(0);
    }
  );

  it('closes the tool loop once when the context budget is invalid', async () => {
    const llm = await loaded(streaming());
    const close = jest.fn();
    await expect(collect(llm.generate({ prompt: 'hi' }, { contextTokens: 8193, loop: { options: {}, close } })))
      .rejects.toThrow(RangeError);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid native model windows: %s',
    n_ctx => {
      expect(() => new LLMOnDevice({ contextParams: { n_ctx } })).toThrow(RangeError);
    }
  );

  it('completes each step before its tool calls are streamed when tools are on', async () => {
    const llm = await loaded(toolCalling());
    const tools = {
      ping: tool({ description: 'Ping', inputSchema: z.object({}), execute: async () => 'pong' }),
    };

    const events = await collect(llm.generate({ prompt: 'ping it', tools, maxSteps: 3 }));

    expect(events.find((e) => e.type === GenerateEventType.ToolResult)).toMatchObject({
      name: 'ping',
      output: 'pong',
    });
    expect(events).toContainEqual({ type: GenerateEventType.Text, delta: 'pong' });
  });

  it('reports the context size of its context params', () => {
    expect(new LLMOnDevice().contextTokens).toBe(8192);
    expect(new LLMOnDevice({ contextParams: { n_ctx: 4096 } }).contextTokens).toBe(4096);
    expect(new LLMOnDevice({ contextParams: { n_gpu_layers: 0 } }).contextTokens).toBe(8192);
  });

  it('aborts an active stream and waits for the native provider to drain before reloading', async () => {
    const started = Promise.withResolvers<void>();
    const releasing = Promise.withResolvers<void>();
    const drained = Promise.withResolvers<void>();
    let providerSignal: AbortSignal | undefined;
    const model = llamaModel(new MockLanguageModelV4({
      doStream: async ({ abortSignal }) => {
        providerSignal = abortSignal;
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'stream-start', warnings: [] });
              controller.enqueue({ type: 'text-start', id: 't' });
              controller.enqueue({ type: 'text-delta', id: 't', delta: 'partial' });
              abortSignal?.addEventListener('abort', () => controller.error(new Error('stopped')), { once: true });
              started.resolve();
            },
          }) as never,
        };
      },
    }));
    model.unload.mockImplementation(async () => {
      expect(providerSignal?.aborted).toBe(true);
      releasing.resolve();
      await drained.promise;
    });
    const replacement = llamaModel(streaming('fresh'));
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel
      .mockReturnValueOnce(model as never)
      .mockReturnValueOnce(replacement as never);
    const llm = new LLMOnDevice();
    await llm.load();
    const generating = collect(llm.generate({ prompt: 'hi' }));
    await started.promise;

    const unloading = llm.unload();
    const reloading = llm.load();
    await releasing.promise;

    expect(llm.status.state).toBe('unloading');
    expect(llm.runtimeInfo()).toBeNull();
    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
    await expect(collect(llm.generate({ prompt: 'too soon' }))).rejects.toThrow('Model is not loaded');
    drained.resolve();
    await Promise.all([unloading, reloading]);
    expect((await generating).find(event => event.type === GenerateEventType.Done))
      .toMatchObject({ aborted: true });
    expect(llm.status.state).toBe('ready');
    expect(await collect(llm.generate({ prompt: 'again' })))
      .toContainEqual({ type: GenerateEventType.Text, delta: 'fresh' });
  });

  it('keeps lifecycle cancellation active when a tool loop provides its own signal', async () => {
    const started = Promise.withResolvers<void>();
    const stopped = Promise.withResolvers<void>();
    const completed = Promise.withResolvers<void>();
    let providerSignal: AbortSignal | undefined;
    const model = llamaModel(new MockLanguageModelV4({
      doGenerate: async ({ abortSignal }) => {
        providerSignal = abortSignal;
        started.resolve();
        try {
          await stopped.promise;
          abortSignal?.throwIfAborted();
          return {
            content: [{ type: 'text', text: 'complete' }],
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: usage(1),
            warnings: [],
          };
        } finally {
          completed.resolve();
        }
      },
    }));
    model.unload.mockImplementation(async () => {
      expect(providerSignal?.aborted).toBe(true);
      stopped.resolve();
      await completed.promise;
    });
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(model as never);
    const llm = new LLMOnDevice();
    const loopController = new AbortController();
    const close = jest.fn();
    await llm.load();
    const generating = collect(llm.generate({ prompt: 'hi' }, {
      loop: { options: { abortSignal: loopController.signal }, close },
    }));
    await started.promise;

    await llm.unload();

    expect((await generating).find(event => event.type === GenerateEventType.Done))
      .toMatchObject({ aborted: true });
    expect(loopController.signal.aborted).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(llm.status.state).toBe('idle');
  });

  it('does not enter the native provider if unloading happens during prompt preparation', async () => {
    const preparing = Promise.withResolvers<void>();
    const prepared = Promise.withResolvers<void>();
    const model = streaming();
    const llm = await loaded(model);
    const generating = collect(llm.generate({
      prompt: 'ping',
      tools: {
        ping: tool({
          inputSchema: jsonSchema(async () => {
            preparing.resolve();
            await prepared.promise;
            return { type: 'object', properties: {} };
          }),
          execute: async () => 'pong',
        }),
      },
    }));
    await preparing.promise;

    await llm.unload();
    prepared.resolve();

    expect((await generating).find(event => event.type === GenerateEventType.Done))
      .toMatchObject({ aborted: true });
    expect(model.doStreamCalls).toHaveLength(0);
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(llm.status.state).toBe('idle');
  });

  it('preserves caller cancellation without releasing the loaded model', async () => {
    const model = streaming();
    const llm = await loaded(model);
    const controller = new AbortController();
    controller.abort();

    const events = await collect(llm.generate({ prompt: 'hi' }, { signal: controller.signal }));

    expect(events.find(event => event.type === GenerateEventType.Done)).toMatchObject({ aborted: true });
    expect(model.doStreamCalls).toHaveLength(0);
    expect(llm.status.state).toBe('ready');
  });
});

describe('LLMOnDevice.runtimeInfo', () => {
  const context = {
    gpu: false,
    reasonNoGPU: 'No GPU backend',
    devices: undefined,
    systemInfo: 'CPU : NEON = 1',
    androidLib: 'rnllama_v8',
    model: { desc: 'qwen3.5 2B Q4_K - Medium', nParams: 2_000_000_000, size: 1_500_000_000 },
  };

  it('is null until a model is loaded', () => {
    expect(new LLMOnDevice().runtimeInfo()).toBeNull();
  });

  it('reports what the native runtime says about the loaded model', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(
      Object.assign(llamaModel(streaming()), { getContext: () => context }) as never
    );
    const llm = new LLMOnDevice();
    await llm.load();

    expect(llm.runtimeInfo()).toEqual({
      gpu: false,
      reasonNoGPU: 'No GPU backend',
      devices: [],
      systemInfo: 'CPU : NEON = 1',
      androidLib: 'rnllama_v8',
      model: { description: 'qwen3.5 2B Q4_K - Medium', parameters: 2_000_000_000, sizeBytes: 1_500_000_000 },
    });
  });

  it('is null when the model has no native context yet', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(
      Object.assign(llamaModel(streaming()), { getContext: () => null }) as never
    );
    const llm = new LLMOnDevice();
    await llm.load();

    expect(llm.runtimeInfo()).toBeNull();
  });
});
