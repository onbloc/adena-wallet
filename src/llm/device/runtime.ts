import {
  downloadModel,
  isModelDownloaded,
  llama,
  removeModel,
  type ContextParams,
  type LlamaLanguageModel,
} from '@react-native-ai/llama';

import { DEFAULT_CONTEXT_PARAMS, DEFAULT_MODEL_ID } from './config';

export type RuntimeStatus =
  | { state: 'idle' }
  | { state: 'downloading'; modelId: string; percentage: number }
  | { state: 'loading'; modelId: string }
  | { state: 'ready'; modelId: string; loadMs: number }
  | { state: 'error'; message: string };

type Listener = () => void;

/**
 * Owns one on-device model: download -> load -> unload.
 * Failures are reported via `status` (state 'error'), never thrown from `load`.
 */
export class LlamaRuntime {
  private _status: RuntimeStatus = { state: 'idle' };
  private _model: LlamaLanguageModel | null = null;
  private inflight: Promise<void> | null = null;
  private listeners = new Set<Listener>();

  constructor(private now: () => number = () => Date.now()) {}

  get status(): RuntimeStatus {
    return this._status;
  }

  get model(): LlamaLanguageModel | null {
    return this._model;
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

  /** Concurrent calls share the in-flight load; loading the same ready model is a no-op. */
  load(
    modelId: string = DEFAULT_MODEL_ID,
    contextParams: Partial<ContextParams> = DEFAULT_CONTEXT_PARAMS
  ): Promise<void> {
    if (this.inflight) return this.inflight;
    if (this._status.state === 'ready' && this._status.modelId === modelId) {
      return Promise.resolve();
    }
    this.inflight = this.doLoad(modelId, contextParams).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async doLoad(
    modelId: string,
    contextParams: Partial<ContextParams>
  ): Promise<void> {
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
      const startedAt = this.now();
      try {
        await model.prepare();
      } catch (error) {
        await model.unload().catch(() => undefined);
        throw error;
      }
      this._model = model;
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
    this._model = null;
    if (model) await model.unload();
  }

  /** Frees model memory; the GGUF file stays on disk. */
  async unload(): Promise<void> {
    await this.inflight;
    await this.release();
    this.setStatus({ state: 'idle' });
  }

  /** Unloads and deletes the GGUF file. */
  async remove(modelId: string = DEFAULT_MODEL_ID): Promise<void> {
    await this.unload();
    try {
      await removeModel(modelId);
    } catch (error) {
      this.setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
