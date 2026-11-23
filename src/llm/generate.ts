import { isStepCount, streamText, type LanguageModel, type ToolSet } from 'ai';

export type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  seed?: number;
  reasoning?: 'none' | 'provider-default';
  /** Tools with `execute` are run by the SDK and their results fed back to the model. */
  tools?: ToolSet;
  /** Max model calls when tools are used (SDK default: 1). */
  maxSteps?: number;
  signal?: AbortSignal;
};

export type Metrics = {
  /** Start -> first text, reasoning or tool-call; null if nothing was produced. */
  ttftMs: number | null;
  totalMs: number;
  /** From provider usage (summed over steps); undefined when not reported. */
  outputTokens?: number;
  /** Decode speed after the first token: (tokens - 1) / (end - first delta). */
  tokensPerSec?: number;
};

export type GenerateEvent =
  | { type: 'text'; delta: string }
  | { type: 'reasoning'; delta: string }
  | {
      type: 'tool-call';
      id: string;
      name: string;
      input: unknown;
      /** Unparsable input, unknown tool, or input that failed schema validation. */
      invalid: boolean;
      error?: string;
    }
  | { type: 'tool-result'; id: string; name: string; output: unknown }
  | { type: 'tool-error'; id: string; name: string; error: string }
  | {
      type: 'done';
      metrics: Metrics;
      aborted: boolean;
      finishReason?: string;
      /** Provider warnings, e.g. unsupported options. */
      warnings: string[];
    };

type Warning = { type: string; feature?: string; details?: string; message?: string };

const describeWarning = (warning: Warning) =>
  warning.message ??
  [warning.type, warning.feature, warning.details].filter(Boolean).join(': ');

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Streams a completion. Always ends with one 'done' event, including after an
 * abort; any other failure is thrown.
 */
export async function* generate(
  model: LanguageModel,
  { signal, maxSteps, ...options }: GenerateOptions,
  now: () => number = () => Date.now()
): AsyncGenerator<GenerateEvent> {
  const startedAt = now();
  let firstDeltaAt: number | undefined;
  let outputTokens: number | undefined;
  let finishReason: string | undefined;
  let aborted = false;
  const warnings: string[] = [];

  try {
    const result = streamText({
      model,
      ...options,
      ...(maxSteps !== undefined && { stopWhen: isStepCount(maxSteps) }),
      abortSignal: signal,
      onError: () => {}, // errors are rethrown from the stream below
    });
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'start-step':
          warnings.push(...part.warnings.map(describeWarning));
          break;
        case 'text-delta':
          firstDeltaAt ??= now();
          yield { type: 'text', delta: part.text };
          break;
        case 'reasoning-delta':
          firstDeltaAt ??= now();
          yield { type: 'reasoning', delta: part.text };
          break;
        case 'tool-call':
          firstDeltaAt ??= now();
          yield {
            type: 'tool-call',
            id: part.toolCallId,
            name: part.toolName,
            input: part.input,
            invalid: part.invalid === true,
            error: part.error === undefined ? undefined : errorMessage(part.error),
          };
          break;
        case 'tool-result':
          yield {
            type: 'tool-result',
            id: part.toolCallId,
            name: part.toolName,
            output: part.output,
          };
          break;
        case 'tool-error':
          yield {
            type: 'tool-error',
            id: part.toolCallId,
            name: part.toolName,
            error: errorMessage(part.error),
          };
          break;
        case 'finish':
          outputTokens = part.totalUsage.outputTokens;
          finishReason = part.finishReason;
          break;
        case 'abort':
          aborted = true;
          break;
        case 'error':
          throw part.error;
      }
    }
  } catch (error) {
    if (!signal?.aborted) throw error;
    aborted = true;
  }

  const endedAt = now();
  const decodeMs = firstDeltaAt === undefined ? 0 : endedAt - firstDeltaAt;
  const tokensPerSec =
    outputTokens !== undefined && outputTokens > 1 && decodeMs > 0
      ? ((outputTokens - 1) * 1000) / decodeMs
      : undefined;

  yield {
    type: 'done',
    aborted,
    finishReason,
    warnings,
    metrics: {
      ttftMs: firstDeltaAt === undefined ? null : firstDeltaAt - startedAt,
      totalMs: endedAt - startedAt,
      outputTokens,
      tokensPerSec,
    },
  };
}
