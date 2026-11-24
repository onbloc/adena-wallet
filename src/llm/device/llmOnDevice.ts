import type { ContextParams } from '@react-native-ai/llama';
import {
  generate,
  resolveContextTokens,
  type GenerateEvent,
  type GenerateSettings,
  type LLM,
  type LLMGenerateOptions,
} from '../core';
import { DEFAULT_CONTEXT_PARAMS, DEFAULT_MODEL_ID } from './config';
import { withPlainJsonGrammar } from './jsonGrammar';
import { LlamaRuntime, type RuntimeStatus } from './runtime';
import { withCompletedToolCalls } from './toolCalls';

export type LLMOnDeviceOptions = {
  /** Format: owner/repo/filename.gguf (Hugging Face). */
  modelId?: string;
  contextParams?: Partial<ContextParams>;
  runtime?: LlamaRuntime;
};

/**
 * A model that runs on this device (llama.rn): download, load, unload and generate behind one
 * object. Make one per app: each loaded model holds its memory. Needs React Native.
 */
export class LLMOnDevice implements LLM {
  readonly contextTokens: number;
  private readonly modelId: string;
  private readonly contextParams: Partial<ContextParams>;
  private readonly runtime: LlamaRuntime;

  constructor({
    modelId = DEFAULT_MODEL_ID,
    contextParams = DEFAULT_CONTEXT_PARAMS,
    runtime = new LlamaRuntime(),
  }: LLMOnDeviceOptions = {}) {
    this.modelId = modelId;
    this.contextParams = contextParams;
    this.runtime = runtime;
    this.contextTokens = resolveContextTokens(contextParams.n_ctx ?? 2048, contextParams.n_ctx ?? 2048);
  }

  /** Where the model is: idle, downloading, loading, ready (with its load time) or error. */
  get status(): RuntimeStatus {
    return this.runtime.status;
  }

  /** Calls `listener` when `status` changes; returns the way to stop. Fits `useSyncExternalStore`. */
  readonly subscribe = (listener: () => void): (() => void) => this.runtime.subscribe(listener);

  /** Downloads the model once, then loads it. Failures show up in `status`, they are not thrown. */
  load(): Promise<void> {
    return this.runtime.load(this.modelId, this.contextParams);
  }

  /** Frees model memory; the GGUF file stays on disk. */
  unload(): Promise<void> {
    return this.runtime.unload();
  }

  /** Unloads and deletes the GGUF file. */
  remove(): Promise<void> {
    return this.runtime.remove(this.modelId);
  }

  async *generate(
    settings: GenerateSettings,
    options: LLMGenerateOptions = {}
  ): AsyncGenerator<GenerateEvent> {
    const model = this.runtime.model;
    if (!model) throw new Error('Model is not loaded');
    const jsonModel = withPlainJsonGrammar(model);
    // With tools on, native llama may publish a tool call before its arguments are complete.
    const toolsOn = options.loop !== undefined || settings.tools !== undefined;
    yield* generate(toolsOn ? withCompletedToolCalls(jsonModel) : jsonModel, {
      ...settings, ...options, contextTokens: resolveContextTokens(options.contextTokens, this.contextTokens),
    });
  }
}
