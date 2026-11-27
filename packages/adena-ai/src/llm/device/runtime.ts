import {
  llama,
  type ContextParams,
  type LlamaLanguageModel,
} from '@react-native-ai/llama';

import { DEFAULT_CONTEXT_PARAMS, DEFAULT_MODEL_ID } from './config';
import { downloadModel, isModelDownloaded, removeModel } from './modelStorage';

export type RuntimeStatus =
  | { state: 'idle' }
  | { state: 'downloading'; modelId: string; percentage: number }
  | { state: 'loading'; modelId: string }
  | { state: 'unloading'; modelId: string }
  | { state: 'ready'; modelId: string; loadMs: number }
  | { state: 'error'; message: string };

type Listener = () => void;

type ModelConfig = {
  modelId: string;
  contextParams: Partial<ContextParams>;
  key: string;
};

// Sort nested options so property insertion order does not change model identity.
function snapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snapshot);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, snapshot(entry)]));
  }
  return value;
}

/**
 * Owns one on-device model: download -> load -> unload.
 * Failures are reported via `status` (state 'error'), never thrown from `load`.
 */
export class LlamaRuntime {
  private _status: RuntimeStatus = { state: 'idle' };
  private _model: LlamaLanguageModel | null = null;
  private operations: Promise<void> = Promise.resolve();
  private config: ModelConfig | null = null;
  private generationController: AbortController | null = null;
  private listeners = new Set<Listener>();

  constructor(private now: () => number = () => Date.now()) {}

  get status(): RuntimeStatus {
    return this._status;
  }

  get model(): LlamaLanguageModel | null {
    return this._status.state === 'ready' ? this._model : null;
  }

  /** Aborted before native release, so active generations cannot start another step. */
  get generationSignal(): AbortSignal | null {
    return this._status.state === 'ready' ? this.generationController?.signal ?? null : null;
  }

  // Stable-identity snapshots: compatible with useSyncExternalStore.
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setStatus(status: RuntimeStatus) {
    this._status = status;
    this.listeners.forEach((listener) => listener());
  }

  /** Operations run in call order; an already-ready equivalent configuration is a no-op. */
  load(
    modelId: string = DEFAULT_MODEL_ID,
    contextParams: Partial<ContextParams> = DEFAULT_CONTEXT_PARAMS
  ): Promise<void> {
    const params = snapshot({
      ...DEFAULT_CONTEXT_PARAMS,
      ...Object.fromEntries(Object.entries(contextParams).filter(([, value]) => value !== undefined)),
    }) as Partial<ContextParams>;
    const config = { modelId, contextParams: params, key: JSON.stringify([modelId, params]) };
    return this.enqueue(() => this.doLoad(config));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.operations.then(operation);
    this.operations = result.catch(() => undefined);
    return result;
  }

  private async doLoad(config: ModelConfig): Promise<void> {
    if (this._status.state === 'ready' && this.config?.key === config.key) return;
    const { modelId, contextParams } = config;
    try {
      await this.release();

      // downloadModel is a no-op returning the path when the file already exists.
      const cached = await isModelDownloaded(modelId);
      if (!cached) {
        this.setStatus({ state: 'downloading', modelId, percentage: 0 });
      }
      const modelPath = await downloadModel(modelId, ({ percentage }) => {
        if (cached) return;
        const safe = Number.isFinite(percentage)
          ? Math.min(100, Math.max(0, percentage))
          : 0;
        this.setStatus({ state: 'downloading', modelId, percentage: safe });
      });

      this.setStatus({ state: 'loading', modelId });
      const model = llama.languageModel(modelPath, { contextParams });
      this._model = model;
      this.config = config;
      const startedAt = this.now();
      try {
        await model.prepare();
      } catch (error) {
        await this.release().catch(() => undefined);
        throw error;
      }
      this.generationController = new AbortController();
      this.setStatus({
        state: 'ready',
        modelId,
        loadMs: this.now() - startedAt,
      });
    } catch (error) {
      this.setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async release() {
    const model = this._model;
    if (!model || !this.config) return;
    this.setStatus({ state: 'unloading', modelId: this.config.modelId });
    this.generationController?.abort();
    // The native provider stops and drains its pending completions before releasing.
    await model.unload();
    this._model = null;
    this.config = null;
    this.generationController = null;
  }

  private async doUnload(): Promise<void> {
    try {
      await this.release();
      this.setStatus({ state: 'idle' });
    } catch (error) {
      this.setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** Frees model memory; the GGUF file stays on disk. */
  unload(): Promise<void> {
    return this.enqueue(() => this.doUnload());
  }

  /** Unloads and deletes the GGUF file before any later load can start. */
  remove(modelId: string = DEFAULT_MODEL_ID): Promise<void> {
    return this.enqueue(async () => {
      try {
        await this.release();
      } catch (error) {
        this.setStatus({
          state: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      this.setStatus({ state: 'unloading', modelId });
      try {
        await removeModel(modelId);
        this.setStatus({ state: 'idle' });
      } catch (error) {
        this.setStatus({
          state: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
