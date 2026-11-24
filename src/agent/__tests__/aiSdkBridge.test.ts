import { simulateStreamingMiddleware, streamText, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness, type Decision, type HarnessRun, type RemoteTool } from '../../harness/core';
import { createAiSdkRun, type AiSdkBudget } from '../aiSdkBridge';
import { realmEvidence } from '../realmEvidence';

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

  it.each([true, false])('keeps realm selection terminal and marks only verified source completion (%s)', async valid => {
    const path = 'gno.land/r/demo/bank';
    const run = await new Harness({
      toolSources: [async () => new Map<string, RemoteTool>([
        ['get_realm_info', {
          definition: { name: 'get_realm_info', description: 'Index realm', jsonSchema: { type: 'object', properties: {} } },
          execute: async () => ({ kind: 'result' as const, value: { untrustedData: {
            path, functions: [{ name: 'BalanceOf', signature: 'func BalanceOf() int', filename: 'bank.gno', line: 1 }],
            sourceFiles: ['bank.gno'],
          } } }),
        }],
        ['get_realm_source', {
          definition: { name: 'get_realm_source', description: 'Read source', jsonSchema: { type: 'object', properties: {} } },
          execute: async () => ({ kind: 'result' as const, value: { untrustedData: {
            path: valid ? path : 'gno.land/r/other/bank', filename: 'bank.gno', content: 'func BalanceOf() int {\n\treturn 1\n}',
          } } }),
        }],
      ])],
    }).startRun({ account: ACCOUNT, chainId: 'gnoland-1', operationId: 'realm', scope: 'read-only', purpose: 'mainnet-read' });
    const evidence = realmEvidence(`Explain BalanceOf in ${path}`, run);
    const sdk = createAiSdkRun({
      run, maxOutputTokens: 100, budget: { kind: 'local' },
      onInterrupt: () => {}, estimateInputTokens: () => 1, evidence,
    });

    try {
      expect(evidence.verified()).toBe(false);
      expect(evidence.selected()).toBe(false);
      await (sdk.tools.get_realm_info.execute as Execute)({ path }, {});
      expect(evidence.selected()).toBe(true);
      expect(evidence.verified()).toBe(false);
      expect(sdk.stopWhen({ steps: [] })).toBe(true);
      expect(run.signal.aborted).toBe(false);
      const events = [];
      for await (const event of evidence.answer()) events.push(event);
      expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', name: 'get_realm_source' }));
      expect(events).toContainEqual({
        type: 'text',
        delta: valid ? `${path}/bank.gno:1\nfunc BalanceOf() int {\n\treturn 1\n}`
          : 'The function implementation could not be verified from the indexed source.',
      });
      expect(evidence.verified()).toBe(valid);
    } finally {
      run.close();
    }
  });

  it('surfaces a provider audit failure through a nested operation without losing its normalized result', async () => {
    const run = await new Harness({
      toolSources: [async () => new Map<string, RemoteTool>([['provider_balance', {
        definition: { name: 'provider_balance', description: 'Read balance', jsonSchema: { type: 'object', properties: {} } },
        execute: async () => ({ kind: 'result' as const, value: '123' }),
      }]])],
      audit: () => { throw new Error('Private audit failure'); },
    }).startRun({ account: ACCOUNT, chainId: 'gnoland-1', operationId: 'nested', scope: 'read-only', purpose: 'mainnet-read' });
    const stopAfterResult = jest.fn((_name: string, decision: Decision) => decision.kind === 'result');
    const observe = jest.fn();
    const sdk = createAiSdkRun({
      run, maxOutputTokens: 100, budget: { kind: 'local' },
      onInterrupt: () => {}, estimateInputTokens: () => 1, stopAfterResult,
      hideTools: new Set(['provider_balance']),
      operations: [{
        definition: { name: 'get_balance', description: 'Normalized balance', jsonSchema: { type: 'object', properties: {} } },
        execute: async input => {
          const decision = await run.dispatch({ name: 'provider_balance', input });
          return decision.kind === 'result' ? { kind: 'result', value: { balance: decision.value } } : decision;
        },
      }],
      evidence: { observe, selected: () => false },
    });

    try {
      const normalized = { kind: 'result', value: { balance: '123' } };
      expect(await (sdk.tools.get_balance.execute as Execute)({}, {})).toEqual(normalized);
      expect(sdk.tools.provider_balance).toBeUndefined();
      expect(observe).toHaveBeenCalledWith('get_balance', {}, normalized);
      expect(stopAfterResult).toHaveBeenCalledWith('get_balance', normalized);
      expect(run.auditFailed).toBe(true);
      expect(run.canStartStep()).toBe(false);
      expect(sdk.stopWhen({ steps: [] })).toBe(true);
      expect(run.signal.aborted).toBe(false);
    } finally {
      run.close();
    }
  });

  it('keeps evidence selection terminal even when the result predicate is nonterminal', async () => {
    const run = await startRun();
    let selected = false;
    const observe = jest.fn(() => { selected = true; });
    const stopAfterResult = jest.fn(() => false);
    const sdk = createAiSdkRun({
      run, maxOutputTokens: 100, budget: { kind: 'local' },
      onInterrupt: () => {}, estimateInputTokens: () => 1, stopAfterResult,
      evidence: { observe, selected: () => selected },
    });

    try {
      expect(sdk.stopWhen({ steps: [] })).toBe(false);
      expect(await (sdk.tools.ping.execute as Execute)({}, {})).toEqual({ kind: 'result', value: 'pong' });
      expect(observe).toHaveBeenCalledWith('ping', {}, { kind: 'result', value: 'pong' });
      expect(stopAfterResult).toHaveBeenCalledWith('ping', { kind: 'result', value: 'pong' });
      expect(sdk.stopWhen({ steps: [] })).toBe(true);
      expect(run.signal.aborted).toBe(false);
    } finally {
      run.close();
    }
  });

  it.each([
    [true, false], [false, false], [true, true], [false, true],
  ])('honors terminal=%s with composite=%s in the real SDK loop without losing results', async (terminal, composite) => {
    const decision: Decision = { kind: 'result', value: 'finished' };
    const run = await startRun(async () => decision);
    const finishStep = jest.spyOn(run, 'finishStep');
    const name = composite ? 'get_ping' : 'ping';
    const stopAfterResult = jest.fn((toolName: string, result: Decision) =>
      terminal && toolName === name && result.kind === 'result' && result.value === 'finished');
    const usage = {
      inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 5, text: 5, reasoning: undefined },
    };
    const model = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [{ type: 'tool-call', toolCallId: 'ping-1', toolName: name, input: '{}' }],
          finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
        },
        {
          content: [{ type: 'text', text: 'A second model step ran.' }],
          finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [],
        },
      ],
    });

    try {
      const result = streamText({
        model: wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }),
        prompt: 'Run ping.',
        ...createAiSdkRun({
          run, maxOutputTokens: 512, budget: { kind: 'local' },
          onInterrupt: () => {}, estimateInputTokens: () => 100, stopAfterResult,
          ...(composite && {
            hideTools: new Set(['ping']),
            operations: [{
              definition: { name, description: 'Read ping', jsonSchema: { type: 'object', properties: {} } },
              execute: async (input: unknown) => run.dispatch({ name: 'ping', input }),
            }],
          }),
        }),
      });
      const events: unknown[] = [];
      for await (const event of result.fullStream) events.push(event);

      expect(events).toContainEqual(expect.objectContaining({ type: 'tool-result', toolName: name, output: decision }));
      expect(events).not.toContainEqual(expect.objectContaining({ type: 'error' }));
      expect(stopAfterResult).toHaveBeenCalledWith(name, decision);
      expect(model.doGenerateCalls).toHaveLength(terminal ? 1 : 2);
      expect(finishStep).toHaveBeenCalledTimes(terminal ? 1 : 2);
      expect(finishStep).toHaveBeenCalledWith(10);
      expect(run.signal.aborted).toBe(false);
      if (terminal) expect(run.canStartStep()).toBe(true);
    } finally {
      run.close();
    }
  });

  it('cancels the run when the cloud budget refuses a step', async () => {
    const run = await startRun();
    const { prepareStep } = bridge(run, { budget: { kind: 'cloud', reserveStep: async () => false } });

    await expect((prepareStep as PrepareStep)(step)).rejects.toThrow('ADENA_CLOUD_BUDGET_EXHAUSTED');
    expect(run.signal.aborted).toBe(true);
  });
});
