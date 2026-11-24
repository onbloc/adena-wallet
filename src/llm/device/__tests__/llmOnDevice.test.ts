import * as llamaModule from '@react-native-ai/llama';
import { tool } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { GenerateEventType, type GenerateEvent } from '../../core';
import { LLMOnDevice } from '../llmOnDevice';

jest.mock('@react-native-ai/llama', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
  llama: { languageModel: jest.fn() },
}));

const mocked = jest.mocked(llamaModule);

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

/** Streams its text in two pieces. */
const streaming = () =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          controller.enqueue({ type: 'text-start', id: 't' });
          controller.enqueue({ type: 'text-delta', id: 't', delta: 'Hel' });
          controller.enqueue({ type: 'text-delta', id: 't', delta: 'lo' });
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
  });
});
