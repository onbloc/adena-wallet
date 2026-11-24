import { asSchema, jsonSchema, tool } from 'ai';
import type { GenerateTextOnStepEndCallback, Instructions, JSONSchema7, LanguageModel, ModelMessage, PrepareStepFunction, StopCondition, ToolSet } from 'ai';
import type { Decision, HarnessRun, ToolDefinition } from '../harness/core';
import { compactContext } from '../llm/core';

export type Interruption = Extract<Decision, { kind: 'clarify' | 'approval-required' }>;
export type AiSdkBudget =
  | { kind: 'local' }
  | { kind: 'cloud'; reserveStep(request: Readonly<{ operationId: string; stepNumber: number; inputTokenUpperBound: number; maxOutputTokens: number; signal: AbortSignal }>): Promise<boolean> };

type ModelToolDefinition = Readonly<{ name: string; description: string; inputSchema: JSONSchema7 }>;

type Operation = Readonly<{
  definition: ToolDefinition;
  execute(input: unknown): Promise<Decision>;
}>;

function createAiSdkTools({ run, definitions, operations, onInterrupt, projectResult }: {
  run: HarnessRun;
  definitions: readonly ToolDefinition[];
  operations: ReadonlyMap<string, Operation>;
  onInterrupt: (interruption: Interruption) => void;
  projectResult?: (name: string, output: unknown) => unknown;
}): ToolSet {
  const tools: ToolSet = {};
  for (const definition of definitions) {
    const { name, description } = definition;
    tools[name] = tool({
      description,
      inputSchema: 'inputSchema' in definition ? definition.inputSchema : jsonSchema(definition.jsonSchema),
      ...(projectResult && {
        toModelOutput: ({ output }: { output: unknown }) => ({
          type: 'text' as const, value: JSON.stringify(projectResult(name, output)),
        }),
      }),
      async execute(input) {
        const operation = operations.get(name);
        const decision = operation ? await operation.execute(input) : await run.dispatch({ name, input });
        if (decision.kind === 'clarify' || decision.kind === 'approval-required') {
          onInterrupt(decision);
          // Keep approval actions and clarification choices on the application side.
          return { kind: decision.kind };
        }
        return decision;
      },
    });
  }
  return tools;
}

/** Options for one AI SDK generation loop. Close the run in the consumer's finally block. */
export function createAiSdkRun({ run, maxOutputTokens, estimateInputTokens, budget, onInterrupt, projectResult, contextWindow, onContextCompacted, hideTools, operations = [] }: {
  run: HarnessRun;
  maxOutputTokens: number;
  contextWindow?: number;
  onContextCompacted?: (droppedTurns: number) => void;
  /** Include instructions, tool schema and provider formatting overhead for this step. */
  estimateInputTokens: (input: Readonly<{
    model: LanguageModel;
    messages: readonly ModelMessage[];
    instructions: Instructions | undefined;
    tools: readonly ModelToolDefinition[];
  }>) => number;
  budget: AiSdkBudget;
  onInterrupt: (interruption: Interruption) => void;
  projectResult?: (name: string, output: unknown) => unknown;
  /** Internal provider tools remain dispatchable and budgeted, but are not exposed to the model. */
  hideTools?: ReadonlySet<string>;
  /** Composite operations must dispatch their underlying calls through this same run. */
  operations?: readonly Operation[];
}) {
  const byName = new Map(operations.map(operation => [operation.definition.name, operation]));
  if (byName.size !== operations.length) throw new Error('Duplicate operation name.');
  const definitions = [
    ...run.tools.filter(definition => !hideTools?.has(definition.name)),
    ...operations.map(operation => operation.definition),
  ];
  if (new Set(definitions.map(definition => definition.name)).size !== definitions.length) {
    throw new Error('Operation name conflicts with a harness tool.');
  }
  const tools = createAiSdkTools({ run, definitions, operations: byName, onInterrupt, projectResult });
  let schemasPromise: Promise<ModelToolDefinition[]> | undefined;
  const prepareStep: PrepareStepFunction<ToolSet> = async ({ stepNumber, model, messages, instructions }) => {
    schemasPromise ??= Promise.all(definitions.map(async ({ name, description }) => ({
      name, description, inputSchema: await asSchema(tools[name].inputSchema).jsonSchema,
    })));
    const schemas = await schemasPromise;
    const estimate = (candidate: ModelMessage[]) => estimateInputTokens({ model, messages: candidate, instructions, tools: schemas });
    const context = contextWindow === undefined ? messages
      : compactContext(messages, candidate => estimate(candidate) + maxOutputTokens <= contextWindow);
    if (!context) throw new Error('ADENA_CONTEXT_LIMIT: Current request and tool results exceed the model context.');
    if (context.length < messages.length) onContextCompacted?.((messages.length - context.length) / 2);
    const inputTokenUpperBound = estimate(context);
    const limit = run.beginStep(maxOutputTokens, inputTokenUpperBound);
    if (limit === undefined) throw new Error('ADENA_RUN_CANNOT_START_STEP');
    if (budget.kind === 'cloud' && !await budget.reserveStep({ operationId: run.operationId, stepNumber, inputTokenUpperBound, maxOutputTokens: limit, signal: run.signal })) {
      run.close();
      throw new Error('ADENA_CLOUD_BUDGET_EXHAUSTED');
    }
    if (run.signal.aborted) throw new Error('ADENA_RUN_CANCELLED');
    return { messages: context, maxOutputTokens: limit };
  };
  const onStepEnd: GenerateTextOnStepEndCallback<ToolSet> = ({ usage }) => {
    run.finishStep(usage.totalTokens);
  };
  const stopWhen: StopCondition<ToolSet> = () => !run.canStartStep();
  return { tools, prepareStep, onStepEnd, stopWhen, abortSignal: run.signal, maxRetries: 0 };
}
