import { streamText, type LanguageModel } from 'ai';

export type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  reasoning?: 'none' | 'provider-default';
  signal?: AbortSignal;
};

export type Metrics = {
  /** Start -> first text or reasoning delta; null if nothing was produced. */
  ttftMs: number | null;
  totalMs: number;
  /** From provider usage; undefined when the provider does not report it. */
  outputTokens?: number;
  /** Decode speed after the first token: (tokens - 1) / (end - first delta). */
  tokensPerSec?: number;
};

export type GenerateEvent =
  | { type: 'text'; delta: string }
  | { type: 'reasoning'; delta: string }
  | { type: 'done'; metrics: Metrics; aborted: boolean };

/**
 * Streams a completion. Always ends with one 'done' event, including after an
 * abort; any other failure is thrown.
 */
export async function* generate(
  model: LanguageModel,
  { signal, ...options }: GenerateOptions,
  now: () => number = () => Date.now()
): AsyncGenerator<GenerateEvent> {
  const startedAt = now();
  let firstDeltaAt: number | undefined;
  let outputTokens: number | undefined;
  let aborted = false;

  try {
    const result = streamText({
      model,
      ...options,
      abortSignal: signal,
      onError: () => {}, // errors are rethrown from the stream below
    });
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          firstDeltaAt ??= now();
          yield { type: 'text', delta: part.text };
          break;
        case 'reasoning-delta':
          firstDeltaAt ??= now();
          yield { type: 'reasoning', delta: part.text };
          break;
        case 'finish':
          outputTokens = part.totalUsage.outputTokens;
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
    metrics: {
      ttftMs: firstDeltaAt === undefined ? null : firstDeltaAt - startedAt,
      totalMs: endedAt - startedAt,
      outputTokens,
      tokensPerSec,
    },
  };
}
