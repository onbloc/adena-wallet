import { jsonSchema, Output, streamText, type LanguageModel } from 'ai';

export type JsonSchema = Parameters<typeof jsonSchema>[0];

export type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  /** Ignored when `schema` is set: thinking and grammar cannot be combined. */
  reasoning?: 'none' | 'provider-default';
  /** Structured mode: output is constrained by a grammar built from this schema. */
  schema?: JsonSchema;
  signal?: AbortSignal;
};

export type Metrics = {
  /**
   * Start -> first text or reasoning delta. Null if nothing was produced, and
   * in structured mode, where the provider sends the whole output at once.
   */
  ttftMs: number | null;
  totalMs: number;
  /** From provider usage; undefined when the provider does not report it. */
  outputTokens?: number;
  /** Decode speed after the first token: (tokens - 1) / (end - first delta). Text mode only. */
  tokensPerSec?: number;
};

export type GenerateEvent =
  | { type: 'text'; delta: string }
  | { type: 'reasoning'; delta: string }
  | {
      type: 'done';
      metrics: Metrics;
      aborted: boolean;
      finishReason?: string;
      /** Provider warnings, e.g. unsupported options. */
      warnings: string[];
    };

export type ParsedJson =
  | { valid: true; value: unknown }
  | { valid: false; error: string };

export function tryParseJson(text: string): ParsedJson {
  try {
    return { valid: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type Warning = { type: string; feature?: string; details?: string; message?: string };

const describeWarning = (warning: Warning) =>
  warning.message ??
  [warning.type, warning.feature, warning.details].filter(Boolean).join(': ');

/**
 * Streams a completion. Always ends with one 'done' event, including after an
 * abort; any other failure is thrown.
 *
 * Structured mode (`schema`): the provider generates the full JSON first and
 * emits it as a single text event, so there is no TTFT / decode speed.
 */
export async function* generate(
  model: LanguageModel,
  { signal, schema, reasoning, ...options }: GenerateOptions,
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
      // Never pass reasoning with a grammar: llama.rn crashes natively.
      ...(schema
        ? { output: Output.object({ schema: jsonSchema(schema) }) }
        : { reasoning }),
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
  const streamed = schema === undefined && firstDeltaAt !== undefined;
  const decodeMs = streamed ? endedAt - (firstDeltaAt as number) : 0;
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
      ttftMs: streamed ? (firstDeltaAt as number) - startedAt : null,
      totalMs: endedAt - startedAt,
      outputTokens,
      tokensPerSec,
    },
  };
}
