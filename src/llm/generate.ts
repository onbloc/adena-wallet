import {
  isStepCount,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import { startOnblocRun, type OnblocRun } from './onblocRun';

/** What to answer: one prompt, or a whole conversation. */
type GenerateInput =
  | { prompt: string; messages?: undefined }
  | { messages: ModelMessage[]; prompt?: undefined };

/** Everything that shapes a generation except the abort signal. */
export type GenerateSettings = GenerateInput & {
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
  /** Read-only mainnet mode; mutually exclusive with the playground's mock tools. */
  onbloc?: OnblocRun;
};

export type GenerateOptions = GenerateSettings & { signal?: AbortSignal };

export type Metrics = {
  /** Start -> first text, reasoning or tool-call; null if nothing was produced. */
  ttftMs: number | null;
  totalMs: number;
  /** From provider usage (summed over steps); undefined when not reported. */
  outputTokens?: number;
  /** Decode speed after the first token: (tokens - 1) / (end - first delta). */
  tokensPerSec?: number;
};

/** Kinds of events `generate` yields. */
export const GenerateEventType = {
  Text: 'text',
  Reasoning: 'reasoning',
  ToolCall: 'tool-call',
  ToolResult: 'tool-result',
  ToolError: 'tool-error',
  Done: 'done',
} as const;
export type GenerateEventType = (typeof GenerateEventType)[keyof typeof GenerateEventType];

export type GenerateEvent =
  | { type: typeof GenerateEventType.Text; delta: string }
  | { type: typeof GenerateEventType.Reasoning; delta: string }
  | {
      type: typeof GenerateEventType.ToolCall;
      id: string;
      name: string;
      input: unknown;
      /** Unparsable input, unknown tool, or input that failed schema validation. */
      invalid: boolean;
      error?: string;
    }
  | { type: typeof GenerateEventType.ToolResult; id: string; name: string; output: unknown }
  | { type: typeof GenerateEventType.ToolError; id: string; name: string; error: string }
  | {
      type: typeof GenerateEventType.Done;
      metrics: Metrics;
      aborted: boolean;
      finishReason?: string;
      /** Provider warnings, e.g. unsupported options. */
      warnings: string[];
      /** What the model said and did (assistant and tool messages), to append to a conversation. Empty if aborted. */
      messages: ModelMessage[];
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
  { signal, maxSteps, onbloc, ...options }: GenerateOptions,
  now: () => number = () => Date.now()
): AsyncGenerator<GenerateEvent> {
  const startedAt = now();
  let firstDeltaAt: number | undefined;
  let outputTokens: number | undefined;
  let finishReason: string | undefined;
  let aborted = false;
  const warnings: string[] = [];
  let responseMessages: ModelMessage[] = [];
  let managed: Awaited<ReturnType<typeof startOnblocRun>> | undefined;
  let onblocText = '';
  let readSucceeded = false;
  let readFailed = false;

  try {
    if (onbloc) {
      if (options.tools || maxSteps !== undefined) throw new TypeError('Cannot combine Onbloc and mock wallet tools.');
      managed = await startOnblocRun(onbloc, options.maxOutputTokens ?? 512, signal);
    }
    const result = streamText({
      model,
      ...options,
      ...(maxSteps !== undefined && { stopWhen: isStepCount(maxSteps) }),
      abortSignal: signal,
      ...managed?.options,
      onError: () => {}, // errors are rethrown from the stream below
    });
    // Part types in the cases below are the AI SDK's; yielded events use GenerateEventType.
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'start-step':
          if (managed) onblocText = '';
          warnings.push(...part.warnings.map(describeWarning));
          break;
        case 'text-delta':
          firstDeltaAt ??= now();
          if (managed) onblocText += part.text;
          else yield { type: GenerateEventType.Text, delta: part.text };
          break;
        case 'reasoning-delta':
          firstDeltaAt ??= now();
          yield { type: GenerateEventType.Reasoning, delta: part.text };
          break;
        case 'tool-call':
          firstDeltaAt ??= now();
          if (part.invalid) readFailed = true;
          yield {
            type: GenerateEventType.ToolCall,
            id: part.toolCallId,
            name: part.toolName,
            input: part.input,
            invalid: part.invalid === true,
            error: part.error === undefined ? undefined : errorMessage(part.error),
          };
          break;
        case 'tool-result':
          if (managed && part.output && typeof part.output === 'object' && 'kind' in part.output && part.output.kind === 'result') {
            readSucceeded = true;
          } else if (managed) readFailed = true;
          yield {
            type: GenerateEventType.ToolResult,
            id: part.toolCallId,
            name: part.toolName,
            output: part.output,
          };
          break;
        case 'tool-error':
          readFailed = true;
          yield {
            type: GenerateEventType.ToolError,
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
    if (!aborted && (!managed || (readSucceeded && !readFailed))) responseMessages = await result.responseMessages;
  } catch (error) {
    if (!signal?.aborted && !managed?.options.abortSignal.aborted) throw error;
    aborted = true;
  } finally {
    managed?.close();
  }

  const endedAt = now();
  const decodeMs = firstDeltaAt === undefined ? 0 : endedAt - firstDeltaAt;
  const tokensPerSec =
    outputTokens !== undefined && outputTokens > 1 && decodeMs > 0
      ? ((outputTokens - 1) * 1000) / decodeMs
      : undefined;

  if (onbloc && !aborted) {
    const answer = !readSucceeded ? 'No Onbloc lookup returned verified data.'
      : readFailed ? 'Some Onbloc lookups failed. Review the individual tool results.'
        : onblocText || 'Onbloc returned data; no model summary was produced.';
    yield { type: GenerateEventType.Text, delta: answer };
  }

  yield {
    type: GenerateEventType.Done,
    aborted,
    finishReason,
    warnings,
    messages: responseMessages,
    metrics: {
      ttftMs: firstDeltaAt === undefined ? null : firstDeltaAt - startedAt,
      totalMs: endedAt - startedAt,
      outputTokens,
      tokensPerSec,
    },
  };
}
