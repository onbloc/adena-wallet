import { Harness } from '../harness';
import type { PolicyEvent, RunContext } from '../dispatch';
import type { RemoteTool, ToolSource, WalletTool } from '../tools';

const run: RunContext = {
  account: 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v',
  chainId: 'gnoland-1',
  operationId: 'op-1',
  scope: 'read-only',
  purpose: 'mainnet-read',
};

const tool = (name: string): RemoteTool => ({
  definition: { name, description: name, jsonSchema: { type: 'object', properties: {} } },
  execute: async () => ({ kind: 'result', value: `${name} ran` }),
});

const walletTool = (name: string, effect: WalletTool['effect']): WalletTool => ({
  ...tool(name),
  effect,
});

/** A source that offers the named tools and records the account it was asked for. */
const source = (...names: string[]) => {
  const asked: string[] = [];
  const toolSource: ToolSource = async ({ account }) => {
    asked.push(account);
    return new Map(names.map((name) => [name, tool(name)]));
  };
  return { toolSource, asked };
};

describe('Harness', () => {
  it('lists the tools its sources offer for the run account and runs them', async () => {
    const { toolSource, asked } = source('ping');
    const harness = new Harness({ toolSources: [toolSource] });

    const started = await harness.startRun(run);

    expect(asked).toEqual([run.account]);
    expect(started.tools.map((t) => t.name)).toEqual(['ping']);
    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({ kind: 'result', value: 'ping ran' });
    started.close();
  });

  it('merges the tools of several sources', async () => {
    const harness = new Harness({ toolSources: [source('a').toolSource, source('b').toolSource] });

    const started = await harness.startRun(run);

    expect(started.tools.map((t) => t.name)).toEqual(['a', 'b']);
    started.close();
  });

  it('refuses two sources that offer the same tool name', async () => {
    const harness = new Harness({ toolSources: [source('a').toolSource, source('a').toolSource] });

    await expect(harness.startRun(run)).rejects.toThrow('Could not discover remote tools.');
  });

  it('refuses a tool whose name would shadow an object property', async () => {
    const harness = new Harness({ toolSources: [source('constructor').toolSource] });

    await expect(harness.startRun(run)).rejects.toThrow('Could not discover remote tools.');
  });

  it('rejects a remote name that conflicts with a wallet tool, even when it is out of scope', async () => {
    const harness = new Harness({ toolSources: [source('transfer').toolSource] });

    await expect(harness.startRun({ ...run, walletTools: { transfer: walletTool('transfer', 'prepare') } }))
      .rejects.toThrow('Could not discover remote tools.');
  });

  it('rejects wallet and remote tools whose catalog names do not match their keys', async () => {
    const harness = new Harness();
    await expect(harness.startRun({ ...run, walletTools: { transfer: walletTool('other', 'prepare') } }))
      .rejects.toThrow('Wallet tool name');

    const sourceWithWrongName: ToolSource = async () => new Map([['ping', tool('transfer')]]);
    await expect(new Harness({ toolSources: [sourceWithWrongName] }).startRun(run))
      .rejects.toThrow('Could not discover remote tools.');
  });

  it('lists remote reads alongside wallet tools and applies a shared call budget', async () => {
    const execute = jest.fn(async () => ({ kind: 'result' as const, value: 'prepared' }));
    const transfer: WalletTool = { ...walletTool('transfer', 'prepare'), execute };
    const events: PolicyEvent[] = [];
    const harness = new Harness({ toolSources: [source('ping').toolSource], audit: event => { events.push(event); } });
    const started = await harness.startRun({
      ...run, scope: 'prepare-wallet', walletTools: { transfer }, budget: { maxToolCalls: 1 },
    });

    expect(started.tools.map(tool => tool.name)).toEqual(['ping', 'transfer']);
    expect((await started.dispatch({ name: 'ping', input: {} })).kind).toBe('result');
    expect(await started.dispatch({ name: 'transfer', input: {} })).toEqual({ kind: 'denied', code: 'BUDGET_EXHAUSTED' });
    expect(execute).not.toHaveBeenCalled();
    expect(events.map(event => [event.tool, event.decision, event.denial])).toEqual([
      ['ping', 'result', undefined], ['transfer', 'denied', 'BUDGET_EXHAUSTED'],
    ]);
    started.close();
  });

  it.each(['throw', 'reject'] as const)('preserves a prepared result and pauses after an audit callback %s', async failure => {
    const prepared = { status: 'prepared', transactionId: 'tx-1' };
    const execute = jest.fn(async () => ({ kind: 'result' as const, value: prepared }));
    const transfer: WalletTool = { ...walletTool('transfer', 'prepare'), execute };
    const audit = jest.fn((_event: PolicyEvent): void | Promise<void> => {
      if (failure === 'throw') throw new Error('Private audit failure');
      return Promise.reject(new Error('Private audit failure'));
    });
    const started = await new Harness({ audit }).startRun({
      ...run, scope: 'prepare-wallet', walletTools: { transfer },
    });

    try {
      expect(started.auditFailed).toBe(false);
      expect(started.beginStep(100, 10)).toBeDefined();
      const decision = await started.dispatch({ name: 'transfer', input: {} });
      expect(decision).toEqual({ kind: 'result', value: prepared, auditFailed: true });
      if (decision.kind === 'result') expect(decision.value).toBe(prepared);
      expect(started.auditFailed).toBe(true);
      started.finishStep(20);
      expect(started.canStartStep()).toBe(false);
      expect(started.beginStep(100, 10)).toBeUndefined();
      expect(started.signal.aborted).toBe(false);
      expect(await started.dispatch({ name: 'transfer', input: {} })).toEqual({
        kind: 'denied', code: 'RUN_PAUSED', auditFailed: true,
      });
      expect(execute).toHaveBeenCalledTimes(1);
      expect(audit.mock.calls.map(([event]) => [event.tool, event.decision, event.denial])).toEqual([
        ['transfer', 'result', undefined], ['transfer', 'denied', 'RUN_PAUSED'],
      ]);
    } finally {
      started.close();
    }
  });

  it('serializes reads and pauses queued calls after an audit failure', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const slow: RemoteTool = {
      ...tool('slow'),
      async execute() {
        entered.resolve();
        await release.promise;
        return { kind: 'result', value: 'completed read' };
      },
    };
    const started = await new Harness({
      toolSources: [async () => new Map([['slow', slow], ['ping', tool('ping')]])],
      audit: event => { if (event.tool === 'ping') throw new Error('Private audit failure'); },
    }).startRun(run);

    try {
      const pending = started.dispatch({ name: 'slow', input: {} });
      await entered.promise;
      const queued = started.dispatch({ name: 'ping', input: {} });
      const afterFailure = started.dispatch({ name: 'slow', input: {} });
      release.resolve();
      expect(await pending).toEqual({ kind: 'result', value: 'completed read' });
      expect(await queued).toEqual({
        kind: 'result', value: 'ping ran', auditFailed: true,
      });
      expect(started.auditFailed).toBe(true);
      expect(started.canStartStep()).toBe(false);
      expect(await afterFailure).toEqual({ kind: 'denied', code: 'RUN_PAUSED' });
    } finally {
      release.resolve();
      started.close();
    }
  });

  it('retains a completed wallet handoff after cancellation even when its audit fails', async () => {
    const controller = new AbortController();
    const prepared = { status: 'prepared', transactionId: 'tx-1' };
    const transfer: WalletTool = {
      ...walletTool('transfer', 'prepare'),
      async execute() {
        controller.abort();
        return { kind: 'result', value: prepared };
      },
    };
    const started = await new Harness({ audit: () => { throw new Error('Private audit failure'); } }).startRun({
      ...run, scope: 'prepare-wallet', walletTools: { transfer }, signal: controller.signal,
    });

    expect(await started.dispatch({ name: 'transfer', input: {} })).toEqual({
      kind: 'result', value: prepared, auditFailed: true,
    });
    expect(started.auditFailed).toBe(true);
    expect(started.signal.aborted).toBe(true);
  });

  it('drops an allowance read that finishes after cancellation', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const controller = new AbortController();
    const read: WalletTool = {
      ...walletTool('get_approvals', 'read'),
      async execute(_input, signal) {
        expect(signal.aborted).toBe(false);
        entered.resolve();
        await release.promise;
        expect(signal.aborted).toBe(true);
        return { kind: 'result', value: 'late read' };
      },
    };
    const events: PolicyEvent[] = [];
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      ...run, walletTools: { get_approvals: read }, signal: controller.signal,
    });

    const pending = started.dispatch({ name: 'get_approvals', input: {} });
    await entered.promise;
    controller.abort();
    release.resolve();
    expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(events.map(event => [event.tool, event.decision, event.denial]))
      .toEqual([['get_approvals', 'denied', 'CANCELLED']]);
  });

  it('does not start a concurrent preparation before an earlier clarification is resolved', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const clarify: WalletTool = {
      ...walletTool('check', 'read'),
      async execute() {
        entered.resolve();
        await release.promise;
        return { kind: 'clarify', reason: 'CONFIRM_TRANSFER' };
      },
    };
    const prepare = jest.fn(async () => ({ kind: 'result' as const, value: 'prepared' }));
    const started = await new Harness().startRun({
      ...run, scope: 'prepare-wallet',
      walletTools: { check: clarify, transfer: { ...walletTool('transfer', 'prepare'), execute: prepare } },
    });
    const first = started.dispatch({ name: 'check', input: {} });
    await entered.promise;
    const second = started.dispatch({ name: 'transfer', input: {} });
    await Promise.resolve();
    expect(prepare).not.toHaveBeenCalled();
    release.resolve();
    expect(await first).toEqual({ kind: 'clarify', reason: 'CONFIRM_TRANSFER' });
    expect(await second).toEqual({ kind: 'denied', code: 'RUN_PAUSED' });
    expect(prepare).not.toHaveBeenCalled();
    started.close();
  });

  it('counts concurrent proposals against the same tool-call budget', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const execute = jest.fn(async () => {
      entered.resolve();
      await release.promise;
      return { kind: 'result' as const, value: 'done' };
    });
    const started = await new Harness().startRun({
      ...run, walletTools: { check: { ...walletTool('check', 'read'), execute } }, budget: { maxToolCalls: 1 },
    });
    const first = started.dispatch({ name: 'check', input: {} });
    await entered.promise;
    const second = started.dispatch({ name: 'check', input: {} });
    release.resolve();
    expect(await first).toEqual({ kind: 'result', value: 'done' });
    expect(await second).toEqual({ kind: 'denied', code: 'BUDGET_EXHAUSTED' });
    expect(execute).toHaveBeenCalledTimes(1);
    started.close();
  });

  it('settles a pending read on cancellation even if the tool ignores its signal', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const read: WalletTool = {
      ...walletTool('check', 'read'),
      async execute() {
        entered.resolve();
        await release.promise;
        throw new Error('late failure');
      },
    };
    const events: PolicyEvent[] = [];
    const controller = new AbortController();
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      ...run, walletTools: { check: read }, signal: controller.signal,
    });
    const pending = started.dispatch({ name: 'check', input: {} });
    await entered.promise;
    controller.abort();
    expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(events.map(event => [event.tool, event.decision, event.denial]))
      .toEqual([['check', 'denied', 'CANCELLED']]);
    release.resolve();
  });

  it('settles discovery on cancellation even if a source ignores its signal', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<ReadonlyMap<string, RemoteTool>>();
    const source: ToolSource = async () => {
      entered.resolve();
      return release.promise;
    };
    const controller = new AbortController();
    const pending = new Harness({ toolSources: [source] }).startRun({ ...run, signal: controller.signal });
    await entered.promise;
    controller.abort();
    await expect(pending).rejects.toThrow('Could not discover remote tools.');
    release.resolve(new Map());
  });

  it.each(['result', 'error'] as const)('discards a delayed MCP %s after cancellation', async outcome => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const controller = new AbortController();
    const external: RemoteTool = {
      ...tool('external'),
      async execute() {
        entered.resolve();
        await release.promise;
        if (outcome === 'error') throw new Error('private remote detail');
        return { kind: 'result', value: 'late remote data' };
      },
    };
    const started = await new Harness({
      toolSources: [async () => new Map([['external', external]])],
    }).startRun({ ...run, signal: controller.signal });
    const pending = started.dispatch({ name: 'external', input: {} });
    await entered.promise;
    controller.abort();
    expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
    release.resolve();
    expect(await started.dispatch({ name: 'external', input: {} })).toEqual({ kind: 'denied', code: 'CANCELLED' });
    started.close();
  });

  it('sanitizes a delayed MCP failure before cancellation', async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const external: RemoteTool = {
      ...tool('external'),
      async execute() {
        entered.resolve();
        await release.promise;
        throw new Error('private remote detail');
      },
    };
    const started = await new Harness({
      toolSources: [async () => new Map([['external', external]])],
    }).startRun(run);
    const pending = started.dispatch({ name: 'external', input: {} });
    await entered.promise;
    release.resolve();
    expect(await pending).toEqual({ kind: 'denied', code: 'MCP_UNAVAILABLE' });
    started.close();
  });

  it.each([
    { kind: 'approval-required' as const, action: { kind: 'revoke-session' as const, sessionId: 's1', account: run.account, chainId: run.chainId } },
    { kind: 'clarify' as const, reason: 'CONFIRM_TRANSFER' as const },
  ])('rejects external decisions that attempt to initiate a wallet handoff: $kind', async decision => {
    const external: RemoteTool = { ...tool('external'), execute: async () => decision };
    const started = await new Harness({
      toolSources: [async () => new Map([['external', external]])],
    }).startRun(run);
    expect(await started.dispatch({ name: 'external', input: {} })).toEqual({ kind: 'denied', code: 'INVALID_OUTPUT' });
    started.close();
  });

  it.each(['account', 'chainId'] as const)('isolates session results when the %s changes', async field => {
    const listSessions = jest.fn(async (context: { account: string; chainId: string }) => ({
      ...context, sessions: [{ sessionId: `${context.account}:${context.chainId}`, expiresAt: 10 }],
    }));
    const harness = new Harness({ wallet: { listSessions } });
    const first = await harness.startRun({ ...run, purpose: undefined, scope: 'manage-session' });
    const nextContext = { ...run, [field]: `other-${field}`, purpose: undefined, scope: 'manage-session' as const };
    const second = await harness.startRun(nextContext);
    expect(await first.dispatch({ name: 'list_sessions', input: {} })).toEqual({
      kind: 'result', value: { account: run.account, chainId: run.chainId,
        sessions: [{ sessionId: `${run.account}:${run.chainId}`, expiresAt: 10 }] },
    });
    expect(await second.dispatch({ name: 'list_sessions', input: {} })).toEqual({
      kind: 'result', value: { account: nextContext.account, chainId: nextContext.chainId,
        sessions: [{ sessionId: `${nextContext.account}:${nextContext.chainId}`, expiresAt: 10 }] },
    });
    first.close();
    second.close();
  });

  it.each(['account', 'chainId'] as const)('rejects session data for a different %s', async field => {
    const started = await new Harness({ wallet: {
      listSessions: async context => ({ ...context, [field]: 'different', sessions: [] }),
    } }).startRun({ ...run, purpose: undefined, scope: 'manage-session' });
    expect(await started.dispatch({ name: 'list_sessions', input: {} })).toEqual({ kind: 'denied', code: 'INVALID_OUTPUT' });
    started.close();
  });

  it.each(['account', 'chainId'] as const)('does not reuse ambiguous token candidates after changing %s', async field => {
    const findTokens = jest.fn(async (context: { account: string; chainId: string }) => ({
      chainId: context.chainId,
      candidates: context[field] === run[field]
        ? [{ assetId: 'old/a', symbol: 'GNS', decimals: 6 }, { assetId: 'old/b', symbol: 'GNS', decimals: 6 }]
        : [{ assetId: 'new/token', symbol: 'GNS', decimals: 6 }],
    }));
    const harness = new Harness({ wallet: { findTokens } });
    const first = await harness.startRun({ ...run, purpose: undefined });
    expect(await first.dispatch({ name: 'find_tokens', input: { symbol: 'GNS' } })).toMatchObject({
      kind: 'clarify', reason: 'AMBIGUOUS_ASSET', choices: [{ assetId: 'old/a' }, { assetId: 'old/b' }],
    });
    const second = await harness.startRun({ ...run, [field]: `other-${field}`, purpose: undefined });
    expect(await second.dispatch({ name: 'find_tokens', input: { symbol: 'GNS' } })).toMatchObject({
      kind: 'result', value: { candidates: [{ assetId: 'new/token' }] },
    });
    expect(findTokens).toHaveBeenCalledTimes(2);
    first.close();
    second.close();
  });

  it('requires the selected session and stops a queued revoke after cancellation', async () => {
    const controller = new AbortController();
    const started = await new Harness().startRun({
      ...run, purpose: undefined, scope: 'manage-session', signal: controller.signal,
      selection: { kind: 'revoke-session', sessionId: 'selected' },
    });
    expect(await started.dispatch({ name: 'revoke_session', input: { sessionId: 'other' } }))
      .toEqual({ kind: 'denied', code: 'TARGET_CHANGED' });
    controller.abort();
    expect(await started.dispatch({ name: 'revoke_session', input: { sessionId: 'selected' } }))
      .toEqual({ kind: 'denied', code: 'CANCELLED' });
    started.close();
  });

  it('emits at most one session approval per run for repeated identical proposals', async () => {
    const started = await new Harness().startRun({
      ...run, purpose: undefined, scope: 'manage-session',
      selection: { kind: 'revoke-session', sessionId: 'selected' },
    });
    const proposal = { name: 'revoke_session', input: { sessionId: 'selected' } };
    const [first, duplicate] = await Promise.all([started.dispatch(proposal), started.dispatch(proposal)]);
    expect(first).toEqual({ kind: 'approval-required', action: {
      kind: 'revoke-session', sessionId: 'selected', account: run.account, chainId: run.chainId,
    } });
    expect(duplicate).toEqual({ kind: 'denied', code: 'RUN_PAUSED' });
    started.close();
  });

  it('returns a sanitized failure when a session read throws', async () => {
    const started = await new Harness({ wallet: {
      listSessions: async () => { throw new Error('private wallet detail'); },
    } }).startRun({ ...run, purpose: undefined, scope: 'manage-session' });
    expect(await started.dispatch({ name: 'list_sessions', input: {} })).toEqual({ kind: 'denied', code: 'WALLET_UNAVAILABLE' });
    started.close();
  });

  it('times out a session read that ignores cancellation and discards its late result', async () => {
    jest.useFakeTimers();
    try {
      const entered = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const started = await new Harness({ wallet: {
        listSessions: async context => {
          entered.resolve();
          await release.promise;
          return { ...context, sessions: [] };
        },
      } }).startRun({ ...run, purpose: undefined, scope: 'manage-session', budget: { timeoutMs: 100 } });
      const pending = started.dispatch({ name: 'list_sessions', input: {} });
      await entered.promise;
      jest.advanceTimersByTime(100);
      expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
      release.resolve();
      expect(await started.dispatch({ name: 'list_sessions', input: {} })).toEqual({ kind: 'denied', code: 'CANCELLED' });
      started.close();
    } finally {
      jest.useRealTimers();
    }
  });

  it('denies a tool the model invents', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun(run);

    expect(await started.dispatch({ name: 'burn_everything', input: {} })).toEqual({
      kind: 'denied',
      code: 'UNKNOWN_TOOL',
    });
    started.close();
  });

  it('stops dispatching once the tool-call budget is used up, and a run can override the budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, budget: { maxToolCalls: 2 } });

    const kinds = [];
    for (let i = 0; i < 3; i++) kinds.push((await started.dispatch({ name: 'ping', input: {} })).kind);

    expect(kinds).toEqual(['result', 'result', 'denied']);
    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({
      kind: 'denied',
      code: 'BUDGET_EXHAUSTED',
    });
    started.close();
  });

  it('counts steps against the budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, budget: { maxSteps: 1 } });

    expect(started.beginStep(100, 10)).toBeDefined();
    started.finishStep(50);

    expect(started.canStartStep()).toBe(false);
    started.close();
  });

  it('denies calls after the run is cancelled', async () => {
    const controller = new AbortController();
    const harness = new Harness({ toolSources: [source('ping').toolSource] });
    const started = await harness.startRun({ ...run, signal: controller.signal });

    controller.abort();

    expect(await started.dispatch({ name: 'ping', input: {} })).toEqual({ kind: 'denied', code: 'CANCELLED' });
  });

  it('rejects an invalid budget', async () => {
    const harness = new Harness({ toolSources: [source('ping').toolSource] });

    await expect(harness.startRun({ ...run, budget: { maxSteps: 0 } })).rejects.toThrow('Invalid execution budget');
  });

  it('audits every decision', async () => {
    const events: PolicyEvent[] = [];
    const harness = new Harness({ toolSources: [source('ping').toolSource], audit: (event) => void events.push(event) });
    const started = await harness.startRun(run);

    await started.dispatch({ name: 'ping', input: {} });
    await started.dispatch({ name: 'nope', input: {} });

    expect(events.map((e) => [e.tool, e.decision, e.denial])).toEqual([
      ['ping', 'result', undefined],
      [undefined, 'denied', 'UNKNOWN_TOOL'],
    ]);
    started.close();
  });
});
