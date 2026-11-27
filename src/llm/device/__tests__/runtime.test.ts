import * as llamaModule from '@react-native-ai/llama';
import * as modelStorage from '../modelStorage';

import { DEFAULT_CONTEXT_PARAMS, DEFAULT_MODEL_ID } from '../config';
import { LlamaRuntime, type RuntimeStatus } from '../runtime';

jest.mock('@react-native-ai/llama', () => ({
  llama: { languageModel: jest.fn() },
}));

jest.mock('../modelStorage', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
}));

const mocked = { ...jest.mocked(llamaModule), ...jest.mocked(modelStorage) };

const makeModel = () => ({
  prepare: jest.fn().mockResolvedValue(undefined),
  unload: jest.fn().mockResolvedValue(undefined),
});

const deferred = () => Promise.withResolvers<void>();

const track = (runtime: LlamaRuntime) => {
  const states: RuntimeStatus[] = [];
  runtime.subscribe(() => states.push(runtime.status));
  return states;
};

beforeEach(() => {
  jest.resetAllMocks();
  mocked.downloadModel.mockResolvedValue('/models/a.gguf');
});

describe('LlamaRuntime operation ordering', () => {
  it('snapshots requested context options before queued work starts', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();
    const contextParams = { n_ctx: 4096, lora_list: [{ path: '/original' }] };

    const loading = runtime.load('o/r/a.gguf', contextParams);
    contextParams.n_ctx = 8192;
    contextParams.lora_list[0].path = '/changed';
    await loading;

    expect(mocked.llama.languageModel).toHaveBeenCalledWith('/models/a.gguf', {
      contextParams: { n_ctx: 4096, lora_list: [{ path: '/original' }] },
    });
  });

  it('reloads a ready model when its context window changes', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const first = makeModel();
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();

    await runtime.load('o/r/a.gguf', { n_ctx: 4096 });
    await runtime.load('o/r/a.gguf', { n_ctx: 8192 });

    expect(first.unload).toHaveBeenCalledTimes(1);
    expect(runtime.model).toBe(second);
    expect(mocked.llama.languageModel.mock.calls.map(([, options]) => options?.contextParams?.n_ctx))
      .toEqual([4096, 8192]);
  });

  it('does not delete an owned model after native release fails and can retry removal', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const model = makeModel();
    model.unload.mockRejectedValueOnce(new Error('native release failed'));
    mocked.llama.languageModel.mockReturnValue(model as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');

    await expect(runtime.remove('o/r/a.gguf')).rejects.toThrow('native release failed');

    expect(mocked.removeModel).not.toHaveBeenCalled();
    expect(runtime.model).toBeNull();
    expect(runtime.status).toEqual({ state: 'error', message: 'native release failed' });
    await runtime.remove('o/r/a.gguf');
    expect(model.unload).toHaveBeenCalledTimes(2);
    expect(mocked.removeModel).toHaveBeenCalledWith('o/r/a.gguf');
    expect(runtime.status).toEqual({ state: 'idle' });
  });

  it('loads the configured defaults and treats equivalent defaulted options as identical', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();

    await runtime.load();
    await runtime.load(DEFAULT_MODEL_ID, {});
    await runtime.load(DEFAULT_MODEL_ID, { n_ctx: undefined });

    expect(mocked.downloadModel).toHaveBeenCalledWith(DEFAULT_MODEL_ID, expect.any(Function));
    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
    expect(mocked.llama.languageModel).toHaveBeenCalledWith('/models/a.gguf', {
      contextParams: DEFAULT_CONTEXT_PARAMS,
    });
  });

  it('compares nested context options independently of property insertion order', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();

    await runtime.load('o/r/a.gguf', { n_ctx: 4096, lora_list: [{ path: '/lora', scaled: 0.5 }] });
    await runtime.load('o/r/a.gguf', { lora_list: [{ scaled: 0.5, path: '/lora' }], n_ctx: 4096 });

    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
  });

  it('serializes distinct in-flight model loads without sharing the wrong result', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const preparing = deferred();
    const prepared = deferred();
    const first = makeModel();
    first.prepare.mockImplementation(async () => {
      preparing.resolve();
      await prepared.promise;
    });
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    const firstLoad = runtime.load('o/r/a.gguf');
    await preparing.promise;

    const secondLoad = runtime.load('o/r/b.gguf');

    expect(secondLoad).not.toBe(firstLoad);
    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
    prepared.resolve();
    await Promise.all([firstLoad, secondLoad]);
    expect(first.unload).toHaveBeenCalledTimes(1);
    expect(mocked.downloadModel.mock.calls.map(([id]) => id)).toEqual(['o/r/a.gguf', 'o/r/b.gguf']);
    expect(runtime.model).toBe(second);
    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/b.gguf' });
  });

  it('reloads the same model with a different in-flight context window', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const preparing = deferred();
    const prepared = deferred();
    const first = makeModel();
    first.prepare.mockImplementation(async () => {
      preparing.resolve();
      await prepared.promise;
    });
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    const firstLoad = runtime.load('o/r/a.gguf', { n_ctx: 4096 });
    await preparing.promise;
    const secondLoad = runtime.load('o/r/a.gguf', { n_ctx: 8192 });

    prepared.resolve();
    await Promise.all([firstLoad, secondLoad]);

    expect(first.unload).toHaveBeenCalledTimes(1);
    expect(mocked.llama.languageModel.mock.calls.map(([, options]) => options?.contextParams?.n_ctx))
      .toEqual([4096, 8192]);
    expect(runtime.model).toBe(second);
  });

  it('does not let a stale unload hide a subsequent ready model', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const releasing = deferred();
    const released = deferred();
    const first = makeModel();
    first.unload.mockImplementation(async () => {
      releasing.resolve();
      await released.promise;
    });
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');
    const unload = runtime.unload();
    const reload = runtime.load('o/r/a.gguf');
    await releasing.promise;

    expect(runtime.status).toEqual({ state: 'unloading', modelId: 'o/r/a.gguf' });
    expect(runtime.model).toBeNull();
    expect(mocked.llama.languageModel).toHaveBeenCalledTimes(1);
    released.resolve();
    await Promise.all([unload, reload]);

    expect(runtime.model).toBe(second);
    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/a.gguf' });
  });

  it('waits for a requested unload between two queued loads', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const first = makeModel();
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();

    await Promise.all([
      runtime.load('o/r/a.gguf'),
      runtime.unload(),
      runtime.load('o/r/b.gguf'),
    ]);

    expect(first.unload).toHaveBeenCalledTimes(1);
    expect(runtime.model).toBe(second);
    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/b.gguf' });
  });

  it('finishes deleting the file before a queued load downloads it again', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const removing = deferred();
    const removed = deferred();
    mocked.removeModel.mockImplementation(async () => {
      removing.resolve();
      await removed.promise;
    });
    const first = makeModel();
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');

    const remove = runtime.remove('o/r/a.gguf');
    const reload = runtime.load('o/r/a.gguf');
    await removing.promise;
    expect(runtime.model).toBeNull();
    expect(mocked.downloadModel).toHaveBeenCalledTimes(1);
    removed.resolve();
    await Promise.all([remove, reload]);

    expect(mocked.downloadModel).toHaveBeenCalledTimes(2);
    expect(runtime.model).toBe(second);
    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/a.gguf' });
  });

  it('retains failed native release ownership and retries it before loading again', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const first = makeModel();
    first.unload.mockRejectedValueOnce(new Error('native release failed'));
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();
    await runtime.load('o/r/a.gguf');
    const unload = runtime.unload();
    const reload = runtime.load('o/r/b.gguf');

    await expect(unload).rejects.toThrow('native release failed');
    await reload;

    expect(first.unload).toHaveBeenCalledTimes(2);
    expect(runtime.model).toBe(second);
    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/b.gguf' });
  });

  it('keeps a half-prepared model owned when cleanup fails and retries its release', async () => {
    mocked.isModelDownloaded.mockResolvedValue(true);
    const first = makeModel();
    first.prepare.mockRejectedValue(new Error('prepare failed'));
    first.unload.mockRejectedValueOnce(new Error('cleanup failed'));
    const second = makeModel();
    mocked.llama.languageModel
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never);
    const runtime = new LlamaRuntime();

    await expect(runtime.load('o/r/a.gguf')).resolves.toBeUndefined();
    expect(runtime.status).toEqual({ state: 'error', message: 'prepare failed' });
    expect(runtime.model).toBeNull();
    await runtime.load('o/r/b.gguf');

    expect(first.unload).toHaveBeenCalledTimes(2);
    expect(runtime.model).toBe(second);
  });

  it('recovers a queued load after a download failure', async () => {
    mocked.downloadModel.mockRejectedValueOnce(new Error('offline'));
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();

    await Promise.all([runtime.load('o/r/a.gguf'), runtime.load('o/r/b.gguf')]);

    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/b.gguf' });
  });

  it('recovers a queued load after a deletion failure', async () => {
    mocked.removeModel.mockRejectedValueOnce(new Error('EACCES'));
    mocked.llama.languageModel.mockReturnValue(makeModel() as never);
    const runtime = new LlamaRuntime();

    await Promise.all([runtime.remove('o/r/a.gguf'), runtime.load('o/r/a.gguf')]);

    expect(runtime.status).toMatchObject({ state: 'ready', modelId: 'o/r/a.gguf' });
    expect(runtime.model).not.toBeNull();
  });
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
