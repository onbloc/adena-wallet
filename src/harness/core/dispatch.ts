import { allowed, evaluate, isTool, selectionSchema, toolsFor } from './tools';
import type { Decision, RemoteTool, RunPurpose, Scope, Selection, ToolDefinition, ToolSource, WalletContext, WalletReader, WalletTool } from './tools';

export type RunContext = WalletContext & Readonly<{
  operationId: string;
  scope: Scope;
  purpose?: RunPurpose;
  selection?: Selection;
  signal?: AbortSignal;
  /** Trusted operations bound to this account; preparation never signs or sends. */
  walletTools?: Readonly<Record<string, WalletTool>>;
  /** Overrides the harness's budget for this run. */
  budget?: Partial<Budget>;
}>;

export type Budget = Readonly<{
  maxSteps: number;
  maxToolCalls: number;
  maxTokens: number;
  timeoutMs: number;
}>;

export type PolicyEvent = Readonly<{
  operationId: string;
  at: number;
  tool?: string;
  decision: Decision['kind'];
  denial?: Extract<Decision, { kind: 'denied' }>['code'];
}>;

export type HarnessRun = Readonly<{
  operationId: string;
  /** Immutable account and chain bound to this run. */
  context: WalletContext;
  signal: AbortSignal;
  /** An audit callback failed; completed decisions remain available, but new work is paused. */
  auditFailed: boolean;
  tools: readonly ToolDefinition[];
  dispatch(proposal: { name: string; input: unknown }): Promise<Decision>;
  canStartStep(): boolean;
  beginStep(maxOutputTokens: number, inputTokenUpperBound: number): number | undefined;
  finishStep(totalTokens: number | undefined): void;
  close(): void;
}>;

/** Limits that fit a small on-device model. A run can override any of them. */
export const DEFAULT_BUDGET: Budget = { maxSteps: 5, maxToolCalls: 4, maxTokens: 16_384, timeoutMs: 60_000 };

function checked(budget: Budget): Budget {
  for (const limit of [budget.maxSteps, budget.maxToolCalls, budget.maxTokens, budget.timeoutMs]) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError('Invalid execution budget');
  }
  if (budget.timeoutMs > 2_147_483_647) throw new RangeError('Timeout exceeds timer range');
  return budget;
}

function bindLifetime(source: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const deadline = Date.now() + timeoutMs;
  const timer = setTimeout(cancel, timeoutMs);
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timer);
    source?.removeEventListener('abort', cancel);
  }, { once: true });
  source?.addEventListener('abort', cancel, { once: true });
  if (source?.aborted) cancel();
  return { signal: controller.signal, deadline, cancel };
}

function waitForAudit(pending: Promise<void>, signal: AbortSignal): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const abort = () => {
    signal.removeEventListener('abort', abort);
    reject(new Error('Audit interrupted by the run deadline or cancellation.'));
  };
  pending.then(() => {
    signal.removeEventListener('abort', abort);
    resolve();
  }, error => {
    signal.removeEventListener('abort', abort);
    reject(error);
  });
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  return promise;
}

function collectWalletTools(tools: RunContext['walletTools']) {
  const offered = new Map(Object.entries(tools ?? {}));
  for (const [name, tool] of offered) {
    if (name !== tool.definition.name || isTool(name) || Object.hasOwn(Object.prototype, name)) {
      throw new Error('Wallet tool name conflicts with a reserved name.');
    }
    if (tool.effect !== 'read' && tool.effect !== 'prepare') throw new Error('Invalid wallet tool effect.');
  }
  return offered;
}

async function discoverReads(sources: readonly ToolSource[], context: WalletContext, signal: AbortSignal,
  offered: ReadonlyMap<string, WalletTool>) {
  const found = new Map<string, RemoteTool>();
  for (const source of sources) {
    for (const [name, tool] of await source(context, signal)) {
      if (name !== tool.definition.name || found.has(name)) throw new Error('Invalid or duplicate remote tool name.');
      if (isTool(name) || offered.has(name) || Object.hasOwn(Object.prototype, name)) {
        throw new Error('Remote tool name conflicts with a reserved name.');
      }
      found.set(name, tool);
    }
  }
  return found;
}

export function createHarness({ wallet = {}, budget = DEFAULT_BUDGET, audit, toolSources = [] }: {
  wallet?: WalletReader;
  budget?: Budget;
  audit?: (event: PolicyEvent) => void | Promise<void>;
  /** Where the run's remote tools come from, e.g. an MCP server. */
  toolSources?: readonly ToolSource[];
}) {
  checked(budget);

  return {
    async startRun(run: RunContext): Promise<HarnessRun> {
      const { scope, operationId } = run;
      if (!operationId || !run.account || !run.chainId) throw new TypeError('Missing run identity');
      const { maxSteps, maxToolCalls, maxTokens, timeoutMs } = checked({ ...budget, ...run.budget });
      const context: WalletContext = Object.freeze({ account: run.account, chainId: run.chainId });
      const selection = run.selection === undefined ? undefined : selectionSchema.parse(run.selection);
      const offered = collectWalletTools(run.walletTools);
      const { signal, deadline, cancel } = bindLifetime(run.signal, timeoutMs);

      let remote: ReadonlyMap<string, RemoteTool> | undefined;
      try {
        if (toolSources.length > 0 && (scope === 'read-only' || scope === 'prepare-wallet') && run.purpose === 'mainnet-read') {
          remote = await discoverReads(toolSources, context, signal, offered);
        }
      } catch (cause) {
        cancel();
        throw new Error('Could not discover remote tools.', { cause });
      }
      const tools = Object.freeze([
        ...(remote ? Array.from(remote.values(), tool => tool.definition) : toolsFor(scope, wallet, run.purpose)),
        ...Array.from(offered.values())
          .filter(tool => tool.effect === 'read' || scope === 'prepare-wallet')
          .map(tool => tool.definition),
      ]);
      const enabled = new Set(tools.map(tool => tool.name));

      let paused = false;
      let auditFailed = false;
      let steps = 0;
      let calls = 0;
      let remainingTokens = maxTokens;
      let awaitingUsage = false;

      function canStartStep(): boolean {
        return !paused && !auditFailed && !signal.aborted && Date.now() < deadline && !awaitingUsage &&
          steps < maxSteps && remainingTokens > 0;
      }

      function beginStep(maxOutputTokens: number, inputTokenUpperBound: number): number | undefined {
        if (!canStartStep()) return undefined;
        if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens <= 0) throw new RangeError('Invalid output token limit');
        if (!Number.isSafeInteger(inputTokenUpperBound) || inputTokenUpperBound < 0) throw new RangeError('Invalid input token bound');
        if (inputTokenUpperBound >= remainingTokens) return undefined;
        steps++;
        awaitingUsage = true;
        return Math.min(maxOutputTokens, remainingTokens - inputTokenUpperBound);
      }

      function finishStep(totalTokens: number | undefined) {
        if (!awaitingUsage) throw new Error('No model step is running');
        awaitingUsage = false;
        if (totalTokens === undefined || !Number.isSafeInteger(totalTokens) || totalTokens <= 0) {
          remainingTokens = 0;
        } else {
          remainingTokens -= totalTokens;
        }
      }

      async function evaluateProposal(proposal: { name: string; input: unknown }): Promise<Decision> {
        const name = proposal.name;
        const local = isTool(name);
        const walletTool = offered.get(name);
        const tool = remote?.get(name);
        if (!local && !walletTool && !tool) return { kind: 'denied', code: 'UNKNOWN_TOOL' };
        if (local && !allowed(scope, name)) return { kind: 'denied', code: 'OUT_OF_SCOPE' };
        if (walletTool?.effect === 'prepare' && scope !== 'prepare-wallet') return { kind: 'denied', code: 'OUT_OF_SCOPE' };
        if (!enabled.has(name)) {
          return { kind: 'denied', code: run.purpose === undefined ? 'UNKNOWN_TOOL' : 'OUT_OF_SCOPE' };
        }
        if (signal.aborted || Date.now() >= deadline) return { kind: 'denied', code: 'CANCELLED' };
        if (paused || auditFailed) return { kind: 'denied', code: 'RUN_PAUSED' };
        if (calls >= maxToolCalls || remainingTokens <= 0) return { kind: 'denied', code: 'BUDGET_EXHAUSTED' };
        calls++;
        try {
          const decision = local ? await evaluate(name, proposal.input, context, selection, wallet, signal)
            : walletTool ? await walletTool.execute(proposal.input, signal) : await tool?.execute(proposal.input);
          if (!decision) return { kind: 'denied', code: 'UNKNOWN_TOOL' };
          // Once a transaction is handed to the app, cancellation cannot undo the handoff.
          if (walletTool?.effect !== 'prepare') {
            if (signal.aborted || Date.now() >= deadline) return { kind: 'denied', code: 'CANCELLED' };
            if (paused) return { kind: 'denied', code: 'RUN_PAUSED' };
          }
          if (decision.kind === 'clarify' || decision.kind === 'approval-required') paused = true;
          return decision;
        } catch {
          if (signal.aborted && walletTool?.effect !== 'prepare') return { kind: 'denied', code: 'CANCELLED' };
          return { kind: 'denied', code: local || walletTool ? 'WALLET_UNAVAILABLE' : 'MCP_UNAVAILABLE' };
        }
      }

      async function dispatch(proposal: { name: string; input: unknown }): Promise<Decision> {
        const name = proposal.name;
        const decision = await evaluateProposal(proposal);
        try {
          const pending = audit?.({
            operationId,
            at: Date.now(),
            ...(isTool(name) || remote?.has(name) || offered.has(name) ? { tool: name } : {}),
            decision: decision.kind,
            ...(decision.kind === 'denied' ? { denial: decision.code } : {}),
          });
          if (pending) await waitForAudit(pending, signal);
        } catch {
          auditFailed = true;
          return { ...decision, auditFailed: true };
        }
        return decision;
      }

      return { operationId, context, signal, tools, dispatch, canStartStep, beginStep, finishStep, close: cancel,
        get auditFailed() { return auditFailed; } };
    },
  };
}
