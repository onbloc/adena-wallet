import { allowed, evaluate, isTool, selectionSchema, toolsFor } from './tools';
import type { Decision, RunPurpose, Scope, Selection, ToolDefinition, WalletContext, WalletReader } from './tools';
import { GNO_MAINNET_CHAIN, gnoPublicAddress } from './gno';
import { createOnblocReader } from './onbloc-mcp';
import type { OnblocMcpConfig, RemoteTool } from './onbloc-mcp';

export type RunContext = WalletContext & Readonly<{
  operationId: string;
  scope: Scope;
  purpose?: RunPurpose;
  selection?: Selection;
  signal?: AbortSignal;
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
  signal: AbortSignal;
  tools: readonly ToolDefinition[];
  dispatch(proposal: { name: string; input: unknown }): Promise<Decision>;
  canStartStep(): boolean;
  beginStep(maxOutputTokens: number, inputTokenUpperBound: number): number | undefined;
  finishStep(totalTokens: number | undefined): void;
  close(): void;
}>;

export function createHarness({ wallet, budget, audit, onblocMcp }: {
  wallet: WalletReader;
  budget: Budget;
  audit?: (event: PolicyEvent) => void | Promise<void>;
  onblocMcp?: OnblocMcpConfig;
}) {
  for (const limit of [budget.maxSteps, budget.maxToolCalls, budget.maxTokens, budget.timeoutMs]) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError('Invalid execution budget');
  }
  if (budget.timeoutMs > 2_147_483_647) throw new RangeError('Timeout exceeds timer range');
  const { maxSteps, maxToolCalls, maxTokens, timeoutMs } = budget;
  const onbloc = onblocMcp && createOnblocReader(onblocMcp);

  return {
    async startRun(run: RunContext): Promise<HarnessRun> {
      const { scope, operationId } = run;
      if (!operationId || !run.account || !run.chainId) throw new TypeError('Missing run identity');
      const context: WalletContext = Object.freeze({ account: run.account, chainId: run.chainId });
      const selection = run.selection === undefined ? undefined : selectionSchema.parse(run.selection);
      const controller = new AbortController();
      const signal = controller.signal;
      const sourceSignal = run.signal;
      const deadline = Date.now() + timeoutMs;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const cancel = () => controller.abort();
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        sourceSignal?.removeEventListener('abort', cancel);
      }, { once: true });
      sourceSignal?.addEventListener('abort', cancel, { once: true });
      if (sourceSignal?.aborted) cancel();

      let remote: ReadonlyMap<string, RemoteTool> | undefined;
      try {
        if (onbloc && scope === 'read-only' && run.purpose === 'mainnet-read' &&
          context.chainId === GNO_MAINNET_CHAIN && gnoPublicAddress.safeParse(context.account).success) {
          remote = await onbloc(context.account, signal);
          for (const name of remote.keys()) {
            if (isTool(name) || Object.hasOwn(Object.prototype, name)) throw new Error('Onbloc tool name conflicts with a reserved name.');
          }
        }
      } catch (cause) {
        cancel();
        throw new Error('Could not discover Onbloc MCP tools.', { cause });
      }
      const tools = Object.freeze(remote ? Array.from(remote.values(), tool => tool.definition) : toolsFor(scope, wallet, run.purpose));
      const enabled = new Set(tools.map(tool => tool.name));

      let paused = false;
      let steps = 0;
      let calls = 0;
      let remainingTokens = maxTokens;
      let awaitingUsage = false;

      function canStartStep(): boolean {
        return !paused && !signal.aborted && Date.now() < deadline && !awaitingUsage &&
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
        const tool = remote?.get(name);
        if (!local && !tool) return { kind: 'denied', code: 'UNKNOWN_TOOL' };
        if (local && !allowed(scope, name)) return { kind: 'denied', code: 'OUT_OF_SCOPE' };
        if (!enabled.has(proposal.name)) {
          return { kind: 'denied', code: run.purpose === undefined ? 'UNKNOWN_TOOL' : 'OUT_OF_SCOPE' };
        }
        if (signal.aborted || Date.now() >= deadline) return { kind: 'denied', code: 'CANCELLED' };
        if (paused) return { kind: 'denied', code: 'RUN_PAUSED' };
        if (calls >= maxToolCalls || remainingTokens <= 0) return { kind: 'denied', code: 'BUDGET_EXHAUSTED' };
        calls++;
        try {
          const decision = local ? await evaluate(name, proposal.input, context, selection, wallet, signal)
            : await tool?.execute(proposal.input);
          if (!decision) return { kind: 'denied', code: 'UNKNOWN_TOOL' };
          if (signal.aborted || Date.now() >= deadline) return { kind: 'denied', code: 'CANCELLED' };
          if (paused) return { kind: 'denied', code: 'RUN_PAUSED' };
          if (decision.kind === 'clarify' || decision.kind === 'approval-required') paused = true;
          return decision;
        } catch {
          return { kind: 'denied', code: signal.aborted ? 'CANCELLED' : local ? 'WALLET_UNAVAILABLE' : 'MCP_UNAVAILABLE' };
        }
      }

      async function dispatch(proposal: { name: string; input: unknown }): Promise<Decision> {
        const name = proposal.name;
        const decision = await evaluateProposal(proposal);
        if (audit) await audit({
          operationId,
          at: Date.now(),
          ...(isTool(name) || remote?.has(name) ? { tool: name } : {}),
          decision: decision.kind,
          ...(decision.kind === 'denied' ? { denial: decision.code } : {}),
        });
        return decision;
      }

      return { operationId, signal, tools, dispatch, canStartStep, beginStep, finishStep, close: cancel };
    },
  };
}
