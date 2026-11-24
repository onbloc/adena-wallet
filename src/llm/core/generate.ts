import {
  asSchema,
  isStepCount,
  Output,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import type { ZodType } from 'zod';
import type { ToolLoop } from './loop';
import { compactContext, estimateContextInput } from './session';

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
  /** Max model calls when tools are used (SDK default: 1). A `loop` brings its own limit. */
  maxSteps?: number;
  /** Constrains providers with structured-output support; callers still validate the result. */
  outputSchema?: ZodType;
};

export type GenerateOptions = GenerateSettings & {
  signal?: AbortSignal;
  /** Tools and per-step hooks from the layer above; closed when the generation ends. */
  loop?: ToolLoop;
  /** Bound each model step to this context window. Managed loops apply their own budget. */
  contextTokens?: number;
  /** History user/assistant pairs removed from a successful step's input. */
  onContextCompacted?: (droppedTurns: number) => void;
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

/** Kinds of events `generate` yields. */
export const GenerateEventType = {
  Text: 'text',
  Reasoning: 'reasoning',
  ToolCall: 'tool-call',
  ToolResult: 'tool-result',
  ToolError: 'tool-error',
  /** A model call (step) of the tool loop begins. */
  StepStart: 'step-start',
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
  | { type: typeof GenerateEventType.StepStart }
  | {
      type: typeof GenerateEventType.Done;
      metrics: Metrics;
      aborted: boolean;
      finishReason?: string;
      /** The application rendered a complete answer directly from validated balance results. */
      verifiedAnswer?: true;
      /** Provider warnings, e.g. unsupported options. */
      warnings: string[];
      /** Raw assistant and tool messages for this run; never replay tool calls as chat history. */
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
  { signal, maxSteps, loop, contextTokens, onContextCompacted, outputSchema, ...options }: GenerateOptions,
  now: () => number = () => Date.now()
): AsyncGenerator<GenerateEvent> {
  const startedAt = now();
  let firstDeltaAt: number | undefined;
  let outputTokens: number | undefined;
  let finishReason: string | undefined;
  let aborted = false;
  const warnings: string[] = [];
  let responseMessages: ModelMessage[] = [];

  try {
    if (contextTokens !== undefined && (!Number.isSafeInteger(contextTokens) || contextTokens <= 0)) {
      throw new RangeError('Context tokens must be a positive safe integer.');
    }
    const bounded = contextTokens !== undefined && !loop?.options.prepareStep;
    const maxOutputTokens = options.maxOutputTokens ?? 512;
    const tools = loop?.options.tools ?? options.tools;
    const schemas = bounded && tools
      ? await Promise.all(Object.entries(tools).map(async ([name, definition]) =>
        [name, definition.description, await asSchema(definition.inputSchema).jsonSchema]))
      : [];
    const formatSchemas = bounded && outputSchema
      ? [...schemas, { responseFormat: await asSchema(outputSchema).jsonSchema }] : schemas;
    const result = streamText({
      model,
      ...options,
      ...(outputSchema && { output: Output.object({ schema: outputSchema }) }),
      ...(maxSteps !== undefined && { stopWhen: isStepCount(maxSteps) }),
      abortSignal: signal,
      ...(bounded && {
        maxOutputTokens,
        prepareStep: ({ messages, instructions }) => {
          const context = compactContext(messages, candidate =>
            estimateContextInput([instructions, formatSchemas, candidate]) + maxOutputTokens <= (contextTokens ?? Infinity));
          if (!context) throw new Error('ADENA_CONTEXT_LIMIT: Current request and tool results exceed the model context.');
          const droppedTurns = (messages.length - context.length) / 2;
          if (droppedTurns > 0) onContextCompacted?.(droppedTurns);
          return { messages: context };
        },
      }),
      ...loop?.options,
      onError: () => {}, // errors are rethrown from the stream below
    });
    // Part types in the cases below are the AI SDK's; yielded events use GenerateEventType.
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'start-step':
          warnings.push(...part.warnings.map(describeWarning));
          yield { type: GenerateEventType.StepStart };
          break;
        case 'text-delta':
          firstDeltaAt ??= now();
          yield { type: GenerateEventType.Text, delta: part.text };
          break;
        case 'reasoning-delta':
          firstDeltaAt ??= now();
          yield { type: GenerateEventType.Reasoning, delta: part.text };
          break;
        case 'tool-call':
          firstDeltaAt ??= now();
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
          yield {
            type: GenerateEventType.ToolResult,
            id: part.toolCallId,
            name: part.toolName,
            output: part.output,
          };
          break;
        case 'tool-error':
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
    if (!aborted) responseMessages = await result.responseMessages;
  } catch (error) {
    if (!signal?.aborted && !loop?.options.abortSignal?.aborted) throw error;
    aborted = true;
  } finally {
    loop?.close();
  }

  const endedAt = now();
  const decodeMs = firstDeltaAt === undefined ? 0 : endedAt - firstDeltaAt;
  const tokensPerSec =
    outputTokens !== undefined && outputTokens > 1 && decodeMs > 0
      ? ((outputTokens - 1) * 1000) / decodeMs
      : undefined;

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
