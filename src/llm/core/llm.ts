import type { LanguageModel } from 'ai';
import { generate, type GenerateEvent, type GenerateSettings } from './generate';
import type { ToolLoop } from './loop';

export type LLMGenerateOptions = {
  signal?: AbortSignal;
  /** Tools and per-step hooks from the layer above (an agent). */
  loop?: ToolLoop;
  /** A positive token budget no larger than the model context window. */
  contextTokens?: number;
  /** History user/assistant pairs removed from a successful step's input. */
  onContextCompacted?: (droppedTurns: number) => void;
};

/** Where the model runs: on this device, or on a server that receives the prompts. */
export type LLMKind = 'local' | 'remote';

/** What the layers above need from a language model. */
export interface LLM {
  /** Where the model runs; `remote` means prompts, including wallet data, leave the device. */
  readonly kind: LLMKind;
  /** Size of the context window, in tokens. Budgets above the model are derived from it. */
  readonly contextTokens: number;
  /** Streams one generation. Always ends with a 'done' event; any other failure is thrown. */
  generate(settings: GenerateSettings, options?: LLMGenerateOptions): AsyncGenerator<GenerateEvent>;
}

export function resolveContextTokens(contextTokens: number | undefined, modelContextTokens: number): number {
  const effective = contextTokens === undefined ? modelContextTokens : contextTokens;
  if (!Number.isSafeInteger(modelContextTokens) || modelContextTokens <= 0 ||
      !Number.isSafeInteger(effective) || effective <= 0 || effective > modelContextTokens) {
    throw new RangeError('Context tokens must be a positive safe integer no larger than the model context window.');
  }
  return effective;
}

/**
 * An LLM over any AI SDK model, e.g. an OpenAI-compatible server on a desktop. `kind` defaults to
 * `remote`: assume prompts leave the device unless the model is known to run on it.
 */
export class LLMFromModel implements LLM {
  readonly kind: LLMKind;
  readonly contextTokens: number;

  constructor(
    private readonly model: LanguageModel,
    { contextTokens = 8192, kind = 'remote' }: { contextTokens?: number; kind?: LLMKind } = {}
  ) {
    this.kind = kind;
    this.contextTokens = resolveContextTokens(contextTokens, contextTokens);
  }

  generate(settings: GenerateSettings, options: LLMGenerateOptions = {}) {
    return generate(this.model, {
      ...settings, ...options, contextTokens: resolveContextTokens(options.contextTokens, this.contextTokens),
    });
  }
}
