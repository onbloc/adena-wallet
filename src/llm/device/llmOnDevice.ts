import type { ContextParams } from '@react-native-ai/llama';
import { wrapLanguageModel } from 'ai';
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

/** What the loaded model runs on, as the native runtime reports it. */
export type RuntimeInfo = {
  /** Whether a GPU does the work. */
  gpu: boolean;
  /** Why it does not, when `gpu` is false. */
  reasonNoGPU: string;
  /** The devices of the backend, e.g. the Metal GPU. */
  devices: string[];
  /** The native library or CPU features in use, as llama.cpp prints them. */
  systemInfo: string;
  /** The native library name on Android. */
  androidLib?: string;
  model: { description: string; parameters: number; sizeBytes: number };
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
    const nCtx = contextParams.n_ctx ?? DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048;
    this.contextParams = { ...contextParams, n_ctx: nCtx };
    this.runtime = runtime;
    this.contextTokens = resolveContextTokens(nCtx, nCtx);
  }

  /** Where the model is: idle, downloading, loading, unloading, ready or error. */
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

  /** What the loaded model runs on (GPU, devices, CPU features); null while no model is loaded. */
  runtimeInfo(): RuntimeInfo | null {
    const context = this.runtime.model?.getContext();
    if (!context) return null;
    return {
      gpu: context.gpu,
      reasonNoGPU: context.reasonNoGPU,
      devices: context.devices ?? [],
      systemInfo: context.systemInfo,
      ...(context.androidLib !== undefined && { androidLib: context.androidLib }),
      model: { description: context.model.desc, parameters: context.model.nParams, sizeBytes: context.model.size },
    };
  }

  async *generate(
    settings: GenerateSettings,
    options: LLMGenerateOptions = {}
  ): AsyncGenerator<GenerateEvent> {
    const model = this.runtime.model;
    const lifecycleSignal = this.runtime.generationSignal;
    if (!model || !lifecycleSignal) {
      options.loop?.close();
      throw new Error('Model is not loaded');
    }
    const controller = new AbortController();
    const signals = [lifecycleSignal, options.signal, options.loop?.options.abortSignal]
      .filter((signal): signal is AbortSignal => signal !== undefined);
    const abort = () => controller.abort();
    signals.forEach(signal => signal.addEventListener('abort', abort, { once: true }));
    if (signals.some(signal => signal.aborted)) abort();
    const sourceLoop = options.loop;
    const loop = sourceLoop && {
      ...sourceLoop,
      options: { ...sourceLoop.options, abortSignal: controller.signal },
      close: () => sourceLoop.close(),
    };
    const guardedModel = wrapLanguageModel({
      model,
      middleware: {
        specificationVersion: 'v4',
        wrapGenerate: async ({ doGenerate }) => {
          controller.signal.throwIfAborted();
          return doGenerate();
        },
        wrapStream: async ({ doStream }) => {
          controller.signal.throwIfAborted();
          return doStream();
        },
      },
    });
    const jsonModel = withPlainJsonGrammar(guardedModel);
    // With tools on, native llama may publish a tool call before its arguments are complete.
    const toolsOn = loop !== undefined || settings.tools !== undefined;
    try {
      yield* generate(toolsOn ? withCompletedToolCalls(jsonModel) : jsonModel, {
        ...settings, ...options, signal: controller.signal, loop,
        contextTokens: resolveContextTokens(options.contextTokens, this.contextTokens),
      });
    } finally {
      signals.forEach(signal => signal.removeEventListener('abort', abort));
    }
  }
}
