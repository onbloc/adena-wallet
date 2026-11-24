import { Harness, type HarnessRun } from '../../harness/core';
import { createAiSdkRun, type AiSdkBudget } from '../aiSdkBridge';

type Execute = (input: unknown, options: unknown) => Promise<unknown>;
type PrepareStep = (options: unknown) => Promise<{ maxOutputTokens: number; messages?: unknown }>;

const ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';

async function startRun(
  execute: () => Promise<unknown> = async () => ({ kind: 'result', value: 'pong' }),
  budget = { maxSteps: 2, maxToolCalls: 2, maxTokens: 1000, timeoutMs: 60_000 }
): Promise<HarnessRun> {
  const harness = new Harness({
    toolSources: [
      async () =>
        new Map([
          [
            'ping',
            {
              definition: { name: 'ping', description: 'ping', jsonSchema: { type: 'object' as const, properties: {} } },
              execute: execute as never,
            },
          ],
        ]),
    ],
  });
  return harness.startRun({ account: ACCOUNT, chainId: 'gnoland-1', operationId: 'op', scope: 'read-only', purpose: 'mainnet-read', budget });
}

const bridge = (run: HarnessRun, extra: { budget?: AiSdkBudget; estimate?: number } = {}) =>
  createAiSdkRun({
    run,
    maxOutputTokens: 512,
    budget: extra.budget ?? { kind: 'local' },
    onInterrupt: () => {},
    estimateInputTokens: () => extra.estimate ?? 100,
  });
const step = { stepNumber: 0, model: {}, messages: [], instructions: undefined };

describe('createAiSdkRun', () => {
  it('runs a tool through the harness', async () => {
    const run = await startRun();
    const { tools } = bridge(run);

    expect(await (tools.ping.execute as Execute)({}, {})).toEqual({ kind: 'result', value: 'pong' });
    run.close();
  });

  it('compacts context while exposing a composite operation instead of its budgeted underlying tool', async () => {
    const run = await startRun();
    const onContextCompacted = jest.fn();
    let advertisedTools: string[] = [];
    const { tools, prepareStep } = createAiSdkRun({
      run,
      maxOutputTokens: 100,
      contextWindow: 130,
      onContextCompacted,
      hideTools: new Set(['ping']),
      operations: [{
        definition: { name: 'get_ping', description: 'Read a ping', jsonSchema: { type: 'object', properties: {} } },
        execute: async input => run.dispatch({ name: 'ping', input }),
      }],
      budget: { kind: 'local' },
      onInterrupt: () => {},
      estimateInputTokens: ({ messages, tools: definitions }) => {
        advertisedTools = definitions.map(definition => definition.name);
        return messages.length * 20;
      },
    });
    const messages = [
      { role: 'user', content: 'old one' }, { role: 'assistant', content: 'answer one' },
      { role: 'user', content: 'old two' }, { role: 'assistant', content: 'answer two' },
      { role: 'user', content: 'current' },
    ];
    const prepared = await (prepareStep as PrepareStep)({ ...step, messages });

    expect(prepared.messages).toEqual([messages[4]]);
    expect(onContextCompacted).toHaveBeenCalledWith(2);
    expect(advertisedTools).toEqual(['get_ping']);
    expect(tools.ping).toBeUndefined();
    expect(await (tools.get_ping.execute as Execute)({}, {})).toEqual({ kind: 'result', value: 'pong' });
    expect(await (tools.get_ping.execute as Execute)({}, {})).toEqual({ kind: 'result', value: 'pong' });
    expect(await (tools.get_ping.execute as Execute)({}, {})).toEqual({ kind: 'denied', code: 'BUDGET_EXHAUSTED' });
    run.close();
  });

  it('rejects duplicate composite operations and collisions with visible harness tools', async () => {
    const run = await startRun();
    const options = {
      run, maxOutputTokens: 100, budget: { kind: 'local' as const },
      onInterrupt: () => {}, estimateInputTokens: () => 1,
    };
    const operation = {
      definition: { name: 'ping', description: 'duplicate', jsonSchema: { type: 'object' as const, properties: {} } },
      execute: async (input: unknown) => run.dispatch({ name: 'ping', input }),
    };
    expect(() => createAiSdkRun({ ...options, operations: [operation] }))
      .toThrow('Operation name conflicts with a harness tool.');
    expect(() => createAiSdkRun({ ...options, operations: [operation, operation] }))
      .toThrow('Duplicate operation name.');
    run.close();
  });

  it('keeps an interruption on the application side: the model only learns its kind', async () => {
    const interruptions: unknown[] = [];
    const run = await startRun(async () => ({ kind: 'clarify', reason: 'AMBIGUOUS_ASSET', choices: [] }));
    const { tools } = createAiSdkRun({
      run,
      maxOutputTokens: 512,
      budget: { kind: 'local' },
      onInterrupt: (interruption) => interruptions.push(interruption),
      estimateInputTokens: () => 1,
    });

    expect(await (tools.ping.execute as Execute)({}, {})).toEqual({ kind: 'clarify' });
    expect(interruptions).toEqual([{ kind: 'clarify', reason: 'AMBIGUOUS_ASSET', choices: [] }]);
    run.close();
  });

  it('caps the output of a step by what is left of the token budget', async () => {
    const run = await startRun(undefined, { maxSteps: 2, maxToolCalls: 2, maxTokens: 600, timeoutMs: 60_000 });
    const { prepareStep } = bridge(run, { estimate: 400 });

    expect(await (prepareStep as PrepareStep)(step)).toMatchObject({ maxOutputTokens: 200 });
    run.close();
  });

  it('refuses a step whose input alone would not fit the budget', async () => {
    const run = await startRun(undefined, { maxSteps: 2, maxToolCalls: 2, maxTokens: 600, timeoutMs: 60_000 });
    const { prepareStep } = bridge(run, { estimate: 600 });

    await expect((prepareStep as PrepareStep)(step)).rejects.toThrow('ADENA_RUN_CANNOT_START_STEP');
    run.close();
  });

  it('stops the loop once the step budget is used up', async () => {
    const run = await startRun(undefined, { maxSteps: 1, maxToolCalls: 2, maxTokens: 1000, timeoutMs: 60_000 });
    const { prepareStep, onStepEnd, stopWhen } = bridge(run);

    expect(stopWhen({ steps: [] })).toBe(false);
    await (prepareStep as PrepareStep)(step);
    (onStepEnd as (event: unknown) => void)({ usage: { totalTokens: 10 } });

    expect(stopWhen({ steps: [] })).toBe(true);
    run.close();
  });

  it('cancels the run when the cloud budget refuses a step', async () => {
    const run = await startRun();
    const { prepareStep } = bridge(run, { budget: { kind: 'cloud', reserveStep: async () => false } });

    await expect((prepareStep as PrepareStep)(step)).rejects.toThrow('ADENA_CLOUD_BUDGET_EXHAUSTED');
    expect(run.signal.aborted).toBe(true);
  });
});
