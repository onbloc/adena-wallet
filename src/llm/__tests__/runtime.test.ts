import * as llamaModule from '@react-native-ai/llama';

import { LlamaRuntime, type RuntimeStatus } from '../runtime';

jest.mock('@react-native-ai/llama', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
  llama: { languageModel: jest.fn() },
}));

const mocked = jest.mocked(llamaModule);

const makeModel = () => ({
  prepare: jest.fn().mockResolvedValue(undefined),
  unload: jest.fn().mockResolvedValue(undefined),
});

const track = (runtime: LlamaRuntime) => {
  const states: RuntimeStatus[] = [];
  runtime.subscribe(() => states.push(runtime.status));
  return states;
};

beforeEach(() => {
  jest.resetAllMocks();
  mocked.downloadModel.mockResolvedValue('/models/a.gguf');
});

describe('LlamaRuntime.load', () => {
  it('goes downloading -> loading -> ready and reports load time', async () => {
    mocked.isModelDownloaded.mockResolvedValue(false);
    mocked.downloadModel.mockImplementation(async (_id, onProgress) => {
      onProgress?.({ percentage: 50 });
      return '/models/a.gguf';
    });
    const model = makeModel();
    mocked.llama.languageModel.mockReturnValue(model as never);
    const ticks = [1000, 1750];
    const runtime = new LlamaRuntime(() => ticks.shift() as number);
    const states = track(runtime);

    await runtime.load('o/r/a.gguf');

    expect(states.map((s) => s.state)).toEqual([
      'downloading',
      'downloading',
      'loading',
      'ready',
    ]);
    expect(states[1]).toMatchObject({ percentage: 50 });
    expect(runtime.status).toEqual({
      state: 'ready',
      modelId: 'o/r/a.gguf',
      loadMs: 750,
    });
    expect(runtime.model).toBe(model);
  });

  it('skips the downloading state when the file is cached', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();
    const states = track(runtime);

    await runtime.load('o/r/a.gguf');

    expect(states.map((s) => s.state)).toEqual(['loading', 'ready']);
  });

  it('clamps invalid download percentages into 0..100', async () => {
    mocked.isModelDownloaded.mockResolvedValue(false);
    mocked.downloadModel.mockImplementation(async (_id, onProgress) => {
      onProgress?.({ percentage: Number.NaN });
      onProgress?.({ percentage: 250 });
      onProgress?.({ percentage: -5 });
      return '/models/a.gguf';
    });
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();
    const states = track(runtime);

    await runtime.load('o/r/a.gguf');

    const percentages = states.flatMap((s) =>
      s.state === 'downloading' ? [s.percentage] : []
    );
    expect(percentages).toEqual([0, 0, 100, 0]);
  });

  it('shares one in-flight load across concurrent calls', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();

    await Promise.all([runtime.load('o/r/a.gguf'), runtime.load('o/r/a.gguf')]);

    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the same model is already ready', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');

    await runtime.load('o/r/a.gguf');

    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
  });

  it('unloads the previous model before loading a different one', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const first = makeModel();
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');

    await runtime.load('o/r/b.gguf');

    expect(first.unload).toHaveBeenCalledTimes(1);
    expect(runtime.model).toBe(second);
  });

  it('reports download errors via status instead of throwing', async () => {
    mocked.isModelDownloaded.mockResolvedValue(false);
    mocked.downloadModel.mockRejectedValue(new Error('network down'));
    const runtime = new LlamaRuntime();

    await expect(runtime.load('o/r/a.gguf')).resolves.toBeUndefined();

    expect(runtime.status).toEqual({ state: 'error', message: 'network down' });
    expect(runtime.model).toBeNull();
  });

  it('frees a half-loaded model when prepare fails', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const model = makeModel();
    model.prepare.mockRejectedValue(new Error('out of memory'));
    mocked.llama.languageModel.mockReturnValue(model as never);
    const runtime = new LlamaRuntime();

    await runtime.load('o/r/a.gguf');

    expect(model.unload).toHaveBeenCalledTimes(1);
    expect(runtime.status).toEqual({ state: 'error', message: 'out of memory' });
    expect(runtime.model).toBeNull();
  });
});

describe('LlamaRuntime.unload / remove', () => {
  const loaded = async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const model = makeModel();
    mocked.llama.languageModel.mockReturnValue(model as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');
    return { runtime, model };
  };

  it('unload frees the model and returns to idle', async () => {
    const { runtime, model } = await loaded();

    await runtime.unload();

    expect(model.unload).toHaveBeenCalledTimes(1);
    expect(runtime.model).toBeNull();
    expect(runtime.status).toEqual({ state: 'idle' });
  });

  it('unload without a model is a no-op that stays idle', async () => {
    const runtime = new LlamaRuntime();

    await runtime.unload();

    expect(runtime.status).toEqual({ state: 'idle' });
  });

  it('remove unloads then deletes the file', async () => {
    const { runtime, model } = await loaded();

    await runtime.remove('o/r/a.gguf');

    expect(model.unload).toHaveBeenCalledTimes(1);
    expect(mocked.removeModel).toHaveBeenCalledWith('o/r/a.gguf');
    expect(runtime.status).toEqual({ state: 'idle' });
  });

  it('remove surfaces deletion failures via status', async () => {
    const { runtime } = await loaded();
    mocked.removeModel.mockRejectedValue(new Error('EACCES'));

    await runtime.remove('o/r/a.gguf');

    expect(runtime.status).toEqual({ state: 'error', message: 'EACCES' });
  });
});
