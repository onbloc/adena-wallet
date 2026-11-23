import { asSchema, jsonSchema, tool } from 'ai';
import type { GenerateTextOnStepEndCallback, Instructions, JSONSchema7, LanguageModel, ModelMessage, PrepareStepFunction, StopCondition, ToolSet } from 'ai';
import type { HarnessRun } from './dispatch';
import type { Decision } from './tools';

export type Interruption = Extract<Decision, { kind: 'clarify' | 'approval-required' }>;
export type AiSdkBudget =
  | { kind: 'local' }
  | { kind: 'cloud'; reserveStep(request: Readonly<{ operationId: string; stepNumber: number; inputTokenUpperBound: number; maxOutputTokens: number; signal: AbortSignal }>): Promise<boolean> };

type ModelToolDefinition = Readonly<{ name: string; description: string; inputSchema: JSONSchema7 }>;

function createAiSdkTools({ run, onInterrupt, projectResult }: {
  run: HarnessRun;
  onInterrupt: (interruption: Interruption) => void;
  projectResult?: (name: string, output: unknown) => unknown;
}): ToolSet {
  const tools: ToolSet = {};
  for (const definition of run.tools) {
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
        const decision = await run.dispatch({ name, input });
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
export function createAiSdkRun({ run, maxOutputTokens, estimateInputTokens, budget, onInterrupt, projectResult }: {
  run: HarnessRun;
  maxOutputTokens: number;
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
}) {
  const tools = createAiSdkTools({ run, onInterrupt, projectResult });
  let definitions: Promise<ModelToolDefinition[]> | undefined;
  const prepareStep: PrepareStepFunction<ToolSet> = async ({ stepNumber, model, messages, instructions }) => {
    definitions ??= Promise.all(run.tools.map(async ({ name, description }) => ({
      name, description, inputSchema: await asSchema(tools[name].inputSchema).jsonSchema,
    })));
    const inputTokenUpperBound = estimateInputTokens({ model, messages, instructions, tools: await definitions });
    const limit = run.beginStep(maxOutputTokens, inputTokenUpperBound);
    if (limit === undefined) throw new Error('ADENA_RUN_CANNOT_START_STEP');
    if (budget.kind === 'cloud' && !await budget.reserveStep({ operationId: run.operationId, stepNumber, inputTokenUpperBound, maxOutputTokens: limit, signal: run.signal })) {
      run.close();
      throw new Error('ADENA_CLOUD_BUDGET_EXHAUSTED');
    }
    if (run.signal.aborted) throw new Error('ADENA_RUN_CANCELLED');
    return { maxOutputTokens: limit };
  };
  const onStepEnd: GenerateTextOnStepEndCallback<ToolSet> = ({ usage }) => {
    run.finishStep(usage.totalTokens);
  };
  const stopWhen: StopCondition<ToolSet> = () => !run.canStartStep();
  return { tools, prepareStep, onStepEnd, stopWhen, abortSignal: run.signal, maxRetries: 0 };
}
