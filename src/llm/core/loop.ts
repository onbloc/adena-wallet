import type {
  GenerateTextOnStepEndCallback,
  PrepareStepFunction,
  StopCondition,
  ToolSet,
} from 'ai';

/**
 * What a layer above the LLM hands in to drive and bound the tool loop: the tools and the
 * AI SDK hooks around each step. `generate` merges `options` into the SDK call and calls
 * `close` when the generation ends, however it ends.
 */
export type ToolLoop = Readonly<{
  options: {
    tools?: ToolSet;
    prepareStep?: PrepareStepFunction<ToolSet>;
    onStepEnd?: GenerateTextOnStepEndCallback<ToolSet>;
    stopWhen?: StopCondition<ToolSet>;
    /** Aborts the generation, e.g. when a budget runs out. Counts as a stop, not a failure. */
    abortSignal?: AbortSignal;
    maxRetries?: number;
  };
  close(): void;
}>;
