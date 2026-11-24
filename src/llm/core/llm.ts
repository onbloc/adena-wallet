import type { LanguageModel } from 'ai';
import { generate, type GenerateEvent, type GenerateSettings } from './generate';
import type { ToolLoop } from './loop';

export type LLMGenerateOptions = {
  signal?: AbortSignal;
  /** Tools and per-step hooks from the layer above (an agent). */
  loop?: ToolLoop;
};

/** What the layers above need from a language model. */
export interface LLM {
  /** Size of the context window, in tokens. Budgets above the model are derived from it. */
  readonly contextTokens: number;
  /** Streams one generation. Always ends with a 'done' event; any other failure is thrown. */
  generate(settings: GenerateSettings, options?: LLMGenerateOptions): AsyncGenerator<GenerateEvent>;
}

/** An LLM over any AI SDK model, e.g. an OpenAI-compatible server on a desktop. */
export class LLMFromModel implements LLM {
  readonly contextTokens: number;

  constructor(
    private readonly model: LanguageModel,
    { contextTokens = 8192 }: { contextTokens?: number } = {}
  ) {
    this.contextTokens = contextTokens;
  }

  generate(settings: GenerateSettings, options: LLMGenerateOptions = {}) {
    return generate(this.model, { ...settings, ...options, contextTokens: this.contextTokens });
  }
}
