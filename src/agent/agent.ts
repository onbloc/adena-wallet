import type { ModelMessage } from 'ai';
import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { balanceRequestSchema, balanceResultSchema, balanceToolDefinition, getBalance as readBalance } from './balanceOperation';
import type { BalanceAdapter, BalanceRequest, BalanceResult } from './balanceOperation';
import { describeToolRecord } from './toolRecord';
import { buildWalletPrompt } from './prompts';
import { realmEvidence } from './realmEvidence';
import type { RealmEvidence } from './realmEvidence';
import { askWhichRecipient, classifyRequest, proposePreparation, selectLookupTools, type LookupToolSelection, type PreparationProposal, type RequestIntent } from './requestIntent';
import type { TransactionHandler, WalletSdk } from './wallet/port';
import { fromBaseUnits } from './wallet/amount';
import { createWalletTools } from './wallet/tools';
import type { Decision, Harness, HarnessRun } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import { onblocBalanceAdapter } from './onblocBalanceAdapter';
import {
  applyToolEvent,
  canRememberTurn,
  createChatSession,
  DEFAULT_GENERATE_SETTINGS,
  estimateContextInput,
  GenerateEventType,
  type CallRecord,
  type ChatSession,
  type GenerateEvent,
  type GenerateSettings,
  type LLM,
  type ToolLoop,
} from '../llm/core';

export type AIAgentOptions = {
  llm: LLM;
  harness: Harness;
  /** The conversation to continue, e.g. restored with `createChatSession(saved)`; a new one by default. */
  session?: ChatSession;
  chainId?: string;
  balanceAdapter?: BalanceAdapter;
  /** The token symbols the wallet can prepare, so a misspelled symbol (`got`) is read back as the right one. */
  tokenSymbols?: readonly string[];
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | { wallet: WalletSdk; onTransaction: TransactionHandler }
);
export type AgentRunOptions = {
  account?: string;
  signal?: AbortSignal;
  contextTokens?: number;
  /** Host permission, independent of the model's classification. Defaults to false. */
  allowTransactionPreparation?: boolean;
  onContextCompacted?: (droppedTurns: number) => void;
};
/** What one turn needs from the host: the prompt, and how the model should answer it. */
export type AgentSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { prompt: string };
type RunOptions = AgentRunOptions & { contextTokens: number; signal: AbortSignal };
type AccountRunOptions = RunOptions & { account: string };
type AnswerSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { messages: ModelMessage[] };
type DoneEvent = Extract<GenerateEvent, { type: 'done' }>;
const REQUEST_TIMEOUT_MS = 5 * 60_000;
const ANSWER_INSTRUCTIONS = {
  explanation: 'Explain only concepts, not current wallet or chain facts. Use no tools.',
  clarification: 'Ask a concise clarification about missing details, ambiguous tasks, or which independent action to perform first. Prepare nothing.',
  chat: 'Reply naturally to the conversation. You can only explain concepts, read the wallet\'s data and prepare transfers and approvals; if asked for anything else (swap, stake, buy, bridge, send an NFT), say plainly that you cannot. This reply has no wallet data and prepares nothing: never claim to have read the wallet or done a wallet action. Use no tools.',
} as const;

/** A wallet action acts for an account: without one the host has to link a wallet first. */
function requireAccount(options: RunOptions): AccountRunOptions {
  if (!options.account) throw new Error('ADENA_ACCOUNT_REQUIRED: Link a wallet to read wallet data or prepare transactions.');
  return { ...options, account: options.account };
}

/** The assistant: an LLM, a harness and a wallet, with the conversation it keeps going. */
export class AIAgent {
  readonly llm: LLM;
  readonly harness: Harness;
  readonly wallet?: WalletSdk;
  /** What was said and called so far. */
  readonly session: ChatSession;
  private readonly onTransaction?: TransactionHandler;
  private readonly chainId: string;
  private readonly balanceAdapter: BalanceAdapter;
  private readonly tokenSymbols: readonly string[];
  private active?: AbortController;
  private revision = 0;
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, session, chainId = GNO_MAINNET_CHAIN, balanceAdapter = onblocBalanceAdapter, tokenSymbols = [] }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.session = session ?? createChatSession();
    this.chainId = chainId;
    this.balanceAdapter = balanceAdapter;
    this.tokenSymbols = tokenSymbols;
  }

  get turns() {
    return this.session.turns;
  }

  serialize(): string {
    return this.session.serialize();
  }

  /** Forgets the conversation and stops the turn in progress; whatever it still produces is not remembered. */
  reset(): void {
    this.revision++;
    this.active?.abort();
    this.session.reset();
  }

  /** Structured queries need no model; every provider call stays in the same run. */
  async getBalance(request: BalanceRequest, { account, signal }: { account: string; signal?: AbortSignal }): Promise<BalanceResult> {
    const parsed = balanceRequestSchema.parse(request);
    const run = await this.harness.startRun({ account, chainId: this.chainId, operationId: `balance-${++this.runs}`, scope: 'read-only', purpose: 'mainnet-read', signal });
    try {
      return await readBalance(run, parsed, { account, chainId: this.chainId, adapter: this.balanceAdapter });
    } finally {
      run.close();
    }
  }

  /**
   * One turn of the conversation. The prompt joins the history; once the turn completes it is
   * remembered with what the agent called and what came of it, so later turns know.
   */
  async *run(settings: AgentSettings, options: AgentRunOptions = {}): AsyncGenerator<GenerateEvent> {
    const { signal, contextTokens = this.llm.contextTokens, onContextCompacted } = options;
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) throw new RangeError('contextTokens must be a positive integer within the model context.');
    if (this.active) throw new Error('A conversation already has an active turn.');
    if (!settings.prompt.trim()) throw new TypeError('A conversation prompt must not be empty.');
    const outputTokens = settings.maxOutputTokens ?? DEFAULT_GENERATE_SETTINGS.maxOutputTokens;
    if (!Number.isSafeInteger(outputTokens) || outputTokens <= 0) throw new RangeError('maxOutputTokens must be a positive integer.');
    // Every turn starts with the structured classification call, which is capped at 512 tokens.
    const reservedOutput = Math.min(outputTokens, 512);
    // Reject an oversized current request unchanged, before discovery or wallet access.
    if (estimateContextInput([settings.system, [{ role: 'user', content: settings.prompt }]]) + reservedOutput > contextTokens) {
      throw new Error('ADENA_CONTEXT_LIMIT: Current request exceeds the conversation context; shorten it.');
    }

    const revision = this.revision;
    const controller = new AbortController();
    this.active = controller;
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const { prompt, ...generation } = settings;
    let answer = '';
    let calls: CallRecord[] = [];
    let completed = false;
    try {
      const events = this.execute({ ...generation, messages: this.session.messages(prompt) }, {
        ...options,
        signal: controller.signal,
        contextTokens,
        onContextCompacted: (count) => {
          if (revision !== this.revision || controller.signal.aborted) return;
          this.session.trimOldest(count);
          onContextCompacted?.(count);
        },
      });
      for await (const event of events) {
        if (event.type === GenerateEventType.Text) answer += event.delta;
        else if (event.type === GenerateEventType.ToolCall || event.type === GenerateEventType.ToolResult || event.type === GenerateEventType.ToolError) {
          calls = applyToolEvent(calls, event);
        }
        if (event.type === GenerateEventType.Done && !completed) {
          completed = true;
          if (revision === this.revision && !controller.signal.aborted && canRememberTurn(event)) {
            this.session.complete(prompt, answer, describeToolRecord(calls));
          }
        }
        yield event;
      }
    } finally {
      controller.abort();
      signal?.removeEventListener('abort', abort);
      if (this.active === controller) this.active = undefined;
    }
  }

  /** Classifies the request on the history in `settings.messages`, then answers it by its route. */
  private async *execute(settings: GenerateSettings, {
    account, signal, contextTokens, onContextCompacted, allowTransactionPreparation = false,
  }: RunOptions): AsyncGenerator<GenerateEvent> {
    const started = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    const timer = setTimeout(() => controller.abort(new Error('Wallet request timed out.')), REQUEST_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let firstVisibleAt: number | undefined;
    try {
      const classified = await classifyRequest(this.llm, settings, { signal: controller.signal, contextTokens, onContextCompacted });
      if (classified.aborted || controller.signal.aborted) {
        yield { ...this.done(controller.signal), warnings: classified.warnings, metrics: { ...classified.metrics, totalMs: Date.now() - started, ttftMs: null } };
        return;
      }
      const options: RunOptions = { account, signal: controller.signal, contextTokens, onContextCompacted, allowTransactionPreparation };
      const { prompt: _prompt, ...answerSettings } = settings;
      const events = this.answerRequest(classified.intent, { ...answerSettings, messages: classified.messages }, options);
      for await (const event of events) {
        if (firstVisibleAt === undefined && (event.type === 'text' || event.type === 'reasoning' || event.type === 'tool-call')) firstVisibleAt = Date.now();
        if (event.type !== 'done') { yield event; continue; }
        const outputTokens = classified.metrics.outputTokens !== undefined && event.metrics.outputTokens !== undefined
          ? classified.metrics.outputTokens + event.metrics.outputTokens : undefined;
        yield { ...event, warnings: [...classified.warnings, ...event.warnings], metrics: {
          ...event.metrics, totalMs: Date.now() - started, ttftMs: firstVisibleAt === undefined ? null : firstVisibleAt - started,
          outputTokens, tokensPerSec: undefined,
        } };
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      yield { ...this.done(controller.signal), metrics: { totalMs: Date.now() - started, ttftMs: firstVisibleAt === undefined ? null : firstVisibleAt - started } };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }

  private async *answerRequest(intent: RequestIntent, settings: AnswerSettings, options: RunOptions): AsyncGenerator<GenerateEvent> {
    if (intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'chat') {
      yield* guardAnswer(this.llm.generate({
        ...settings, tools: undefined, outputSchema: undefined,
        system: [settings.system ?? this.prompt(), ANSWER_INSTRUCTIONS[intent.kind]].join('\n\n'),
      }, options), () => true, intent);
    } else if (intent.kind === 'lookup') {
      yield* this.answerLookups(intent, settings, requireAccount(options));
    } else {
      const { account } = requireAccount(options);
      if (!options.allowTransactionPreparation || !this.wallet || !this.onTransaction) {
        yield { type: 'text', delta: 'Transaction preparation is not enabled for this run. No transaction was prepared.' };
        yield this.done(options.signal);
        return;
      }
      const planned = await proposePreparation(this.llm, settings.messages, { ...options, tokenSymbols: this.tokenSymbols });
      const completion = { ...this.done(options.signal), metrics: planned.metrics, warnings: planned.warnings };
      if (planned.aborted || options.signal.aborted) { yield { ...completion, aborted: true }; return; }
      const proposal = planned.proposal;
      if (proposal.operation === 'clarification') {
        yield { type: 'text', delta: proposal.question };
        yield { ...completion, messages: [{ role: 'assistant', content: proposal.question }] };
        return;
      }
      const action = proposal.operation;
      // Only now is the address book read; the model never sees it.
      const contacts = (await this.wallet.getContacts?.()) ?? [];
      const whom = askWhichRecipient(settings.messages, contacts);
      if (whom !== undefined) {
        yield { type: 'text', delta: whom };
        yield { ...completion, messages: [{ role: 'assistant', content: whom }] };
        return;
      }
      const all = createWalletTools({ sdk: this.wallet, account, contacts, onTransaction: this.onTransaction });
      if (!Object.hasOwn(all, action)) {
        yield { type: 'text', delta: `The wallet does not support ${action}. No transaction was prepared.` };
        yield completion;
        return;
      }
      const run = await this.harness.startRun({ account, chainId: this.chainId, operationId: `prepare-${++this.runs}`,
        scope: 'prepare-wallet', purpose: 'mainnet-read', walletTools: { [action]: all[action] }, signal: options.signal });
      try {
        yield* this.prepareEvents(proposal, run, completion);
      } finally { run.close(); }
    }
  }

  private async *prepareEvents(proposal: Exclude<PreparationProposal, { operation: 'clarification' }>,
    run: HarnessRun, completion: DoneEvent): AsyncGenerator<GenerateEvent> {
    let amount: string;
    if (proposal.amount.kind === 'fraction') {
      const request: BalanceRequest = { kind: 'one', asset: proposal.asset };
      const id = `${run.operationId}:balance`;
      yield { type: 'tool-call', id, name: balanceToolDefinition.name, input: request, invalid: false };
      const output = await this.balanceDecision(run, request);
      yield { type: 'tool-result', id, name: balanceToolDefinition.name, output };
      const result = output.kind === 'result' ? balanceResultSchema.safeParse(output.value) : undefined;
      let failure: string | undefined;
      if (!result?.success || result.data.status !== 'complete') {
        failure = 'A complete, unambiguous balance could not be verified. No transaction was prepared.';
      } else {
        const asset = result.data.assets[0];
        const numerator = BigInt(asset.amount) * BigInt(proposal.amount.numerator);
        const denominator = BigInt(proposal.amount.denominator);
        if (numerator % denominator !== 0n) {
          failure = 'The requested share cannot be represented in this asset’s smallest unit. Specify an exact amount. No transaction was prepared.';
        } else {
          amount = fromBaseUnits(numerator / denominator, asset.decimals);
        }
      }
      if (failure !== undefined) {
        yield { type: 'text', delta: failure };
        yield { ...completion, aborted: run.signal.aborted, warnings: [...completion.warnings,
          ...(run.auditFailed ? ['Audit logging failed; transaction preparation was stopped.'] : [])] };
        return;
      }
    } else {
      amount = proposal.amount.value;
    }
    const name = proposal.operation;
    const id = `${run.operationId}:${name}`;
    const input = { [name === 'transfer' ? 'to' : 'spender']: proposal.recipient, amount: amount!, token: proposal.asset.value };
    const events = (async function* (): AsyncGenerator<GenerateEvent> {
      yield { type: 'tool-call', id, name, input, invalid: false };
      yield { type: 'tool-result', id, name, output: await run.dispatch({ name, input }) };
      yield { ...completion, aborted: run.signal.aborted };
    })();
    yield* guardAnswer(events, tool => tool !== name, { kind: 'prepare', action: name }, { auditFailed: () => run.auditFailed });
  }

  private async *answerLookups(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: AccountRunOptions): AsyncGenerator<GenerateEvent> {
    const other = intent.requests.find(request => request.target === 'other');
    const walletTools = this.wallet && this.onTransaction && other
      ? Object.fromEntries(Object.entries(createWalletTools({ sdk: this.wallet, account: options.account, contacts: [], onTransaction: this.onTransaction })).filter(([, tool]) => tool.effect === 'read')) : {};
    const run = await this.harness.startRun({ account: options.account, chainId: this.chainId, operationId: `lookup-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', walletTools, signal: options.signal });
    try {
      const hidden = new Set([...onblocBalanceAdapter.toolNames, ...this.balanceAdapter.toolNames]);
      const catalog = run.tools.filter(tool => !hidden.has(tool.name));
      const selection = other ? await selectLookupTools(this.llm, other.query, catalog, { signal: run.signal, contextTokens: options.contextTokens }) : undefined;
      if (selection?.aborted || run.signal.aborted) { yield { ...this.done(run.signal), warnings: selection?.warnings ?? [] }; return; }
      const requiredReads = selection && !selection.aborted ? selection.toolNames : [];
      const evidence = realmEvidence(this.userText(settings), run);
      yield* guardAnswer(this.lookupEvents(intent, settings, options, run, requiredReads, hidden, evidence, selection), () => true, intent,
        { requiredReads, userText: this.userText(settings), evidence, auditFailed: () => run.auditFailed });
    } finally { run.close(); }
  }

  private async *lookupEvents(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: RunOptions,
    run: HarnessRun, requiredReads: readonly string[], hidden: ReadonlySet<string>, evidence: RealmEvidence,
    selection: LookupToolSelection | undefined): AsyncGenerator<GenerateEvent> {
    let done = this.done(run.signal);
    let outputTokens = selection?.metrics.outputTokens ?? (selection ? undefined : 0);
    const warnings = [...(selection?.warnings ?? [])];
    const record = (event: DoneEvent) => {
      done = event;
      outputTokens = outputTokens !== undefined && event.metrics.outputTokens !== undefined ? outputTokens + event.metrics.outputTokens : undefined;
      warnings.push(...event.warnings);
    };
    let index = 0;
    for (const request of intent.requests) {
      if (request.target !== 'balance' || run.signal.aborted) continue;
      const id = `${run.operationId}:balance-${++index}`;
      yield { type: 'tool-call', id, name: balanceToolDefinition.name, input: request.request, invalid: false };
      const output = await this.balanceDecision(run, request.request);
      yield { type: 'tool-result', id, name: balanceToolDefinition.name, output };
    }
    if (requiredReads.length && run.canStartStep()) {
      const completed = new Set<string>();
      const loop = this.createLoop(run, settings, options, {
        hideTools: new Set(run.tools.filter(tool => hidden.has(tool.name) || !requiredReads.includes(tool.name)).map(tool => tool.name)), evidence,
        nextTool: () => requiredReads.find(name => !completed.has(name)),
        stopAfterResult: (name, decision) => {
          if (decision.kind === 'result' && !(typeof decision.value === 'object' && decision.value !== null && 'status' in decision.value && decision.value.status === 'error')) completed.add(name);
          return requiredReads.every(name => completed.has(name));
        },
      });
      try {
        for await (const event of this.llm.generate({ ...settings, tools: undefined, outputSchema: undefined,
          system: [settings.system ?? this.prompt(), `Obtain fresh results from every required read: ${requiredReads.join(', ')}. Unrelated reads do not complete this task.`].join('\n\n'),
        }, { ...options, loop })) {
          if (event.type === 'done') record(event);
          else if (event.type !== 'text') yield event;
        }
      } catch (error) {
        // A model that does not make the call it was told to make leaves the lookup incomplete;
        // the guard reports that. Any other failure still fails the run.
        if (options.signal.aborted || !(error instanceof Error) || error.name !== 'AI_ToolChoiceViolationError') throw error;
        warnings.push(`The required lookup did not run: ${error.message}`);
      }
    }
    if (intent.explanation && !done.aborted && !options.signal.aborted) {
      try {
        for await (const event of this.llm.generate({ ...settings, messages: [{ role: 'user', content: intent.explanation }], tools: undefined, outputSchema: undefined,
          system: [settings.system ?? this.prompt(), 'Answer only the conceptual question. Current facts are rendered separately; do not claim balances, source implementation details, or wallet actions.'].join('\n\n'),
        }, { signal: options.signal, contextTokens: options.contextTokens })) {
          if (event.type === 'done') record(event); else yield event;
        }
      } catch (error) {
        if (options.signal.aborted) throw error;
        warnings.push(`The requested explanation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    yield { ...done, aborted: done.aborted || options.signal.aborted, warnings, metrics: { ...done.metrics, outputTokens } };
  }

  private async balanceDecision(run: HarnessRun, request: BalanceRequest): Promise<Decision> {
    const value = await readBalance(run, request, { account: run.context.account, chainId: run.context.chainId, adapter: this.balanceAdapter });
    return { kind: 'result', value, ...(run.auditFailed ? { auditFailed: true as const } : {}) };
  }

  private createLoop(run: HarnessRun, settings: AnswerSettings, options: RunOptions, policy: {
    hideTools: ReadonlySet<string>;
    evidence?: RealmEvidence;
    stopAfterResult(name: string, decision: Decision): boolean;
    nextTool(): string | undefined;
  }): ToolLoop {
    const sdk = createAiSdkRun({ run, maxOutputTokens: Math.min(settings.maxOutputTokens ?? 512, 512), budget: { kind: 'local' },
      contextWindow: options.contextTokens, onContextCompacted: options.onContextCompacted,
      estimateInputTokens: ({ instructions, messages, tools }) => estimateContextInput([instructions, messages, tools]),
      hideTools: policy.hideTools, evidence: policy.evidence, stopAfterResult: policy.stopAfterResult, onInterrupt: () => run.close(),
    });
    return { options: { ...sdk, prepareStep: async input => {
      const step = await sdk.prepareStep(input);
      const name = policy.nextTool();
      return name ? { ...step, activeTools: [name], toolChoice: { type: 'tool', toolName: name } } : step;
    } }, close: run.close };
  }

  private prompt() {
    return buildWalletPrompt({ approvals: this.wallet?.getAllowances !== undefined });
  }

  private userText(settings: AnswerSettings) {
    const last = settings.messages.at(-1);
    return last?.role === 'user' ? typeof last.content === 'string' ? last.content : last.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n') : '';
  }

  private done(signal?: AbortSignal): DoneEvent {
    return { type: 'done', aborted: signal?.aborted === true, finishReason: 'stop', warnings: [], messages: [], metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 } };
  }
}
