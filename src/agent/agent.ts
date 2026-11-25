import type { ModelMessage } from 'ai';
import { exactAmountEvidence, fractionEvidence, pairedDecimalAmount } from './amountEvidence';
import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { balanceRequestSchema, balanceResultSchema, balanceToolDefinition, getBalance as readBalance } from './balanceOperation';
import type { BalanceAdapter, BalanceRequest, BalanceResult } from './balanceOperation';
import { AgentConversation, type ConversationOptions } from './conversation';
import { buildWalletPrompt } from './prompts';
import { realmEvidence } from './realmEvidence';
import type { RealmEvidence } from './realmEvidence';
import { classifyRequest, proposePreparation, selectLookupTools, type LookupToolSelection, type PreparationPlanning, type PreparationProposal, type RequestIntent } from './requestIntent';
import type { TransactionHandler, WalletSdk } from './wallet/port';
import { fromBaseUnits } from './wallet/amount';
import { createWalletTools } from './wallet/tools';
import type { Decision, Harness, HarnessRun } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import { onblocBalanceAdapter } from './onblocBalanceAdapter';
import { estimateContextInput, type GenerateEvent, type GenerateSettings, type LLM, type ToolLoop } from '../llm/core';

export type AIAgentOptions = {
  llm: LLM;
  harness: Harness;
  chainId?: string;
  balanceAdapter?: BalanceAdapter;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | { wallet: WalletSdk; onTransaction: TransactionHandler }
);
export type PendingPreparation = {
  proposal: Exclude<PreparationProposal, { operation: 'clarification' }>;
  candidateIds: string[];
  account: string;
  chainId: string;
};
export type AgentRunOptions = {
  account?: string;
  signal?: AbortSignal;
  contextTokens?: number;
  /** Host permission, independent of the model's classification. Defaults to false. */
  allowTransactionPreparation?: boolean;
  onContextCompacted?: (droppedTurns: number) => void;
  /** Host-owned, one-turn state from a prior SDK ambiguity; never derived from model text. */
  pendingPreparation?: PendingPreparation;
  onAmbiguousPreparation?: (pending: PendingPreparation) => void;
};
type RunOptions = AgentRunOptions & { account: string; contextTokens: number; signal: AbortSignal };
type AnswerSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { messages: ModelMessage[] };
type DoneEvent = Extract<GenerateEvent, { type: 'done' }>;
const REQUEST_TIMEOUT_MS = 5 * 60_000;

// Match complete user-supplied identifiers, not a symbol embedded in another symbol
// or a package path embedded in a longer path.
function mentionsIdentifier(text: string, value: string, exact = false, minimum = 1): boolean {
  const source = exact ? text : text.toLowerCase();
  const needle = exact ? value : value.toLowerCase();
  const identifier = /[\p{L}\p{M}\p{N}_/-]/u;
  let matches = 0;
  for (let index = source.indexOf(needle); needle && index !== -1; index = source.indexOf(needle, index + 1)) {
    const before = Array.from(source.slice(0, index)).at(-1) ?? '';
    const after = Array.from(source.slice(index + needle.length))[0] ?? '';
    const koreanParticle = !exact && /^[a-z0-9.]+$/i.test(needle) && /^\p{Script=Hangul}$/u.test(after);
    if (!identifier.test(before) && (!identifier.test(after) || koreanParticle) && ++matches >= minimum) return true;
  }
  return false;
}


/** Composes domain policy with provider-independent operations and the host's harness limits. */
export class AIAgent {
  readonly llm: LLM;
  readonly harness: Harness;
  readonly wallet?: WalletSdk;
  private readonly onTransaction?: TransactionHandler;
  private readonly chainId: string;
  private readonly balanceAdapter: BalanceAdapter;
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, chainId = GNO_MAINNET_CHAIN, balanceAdapter = onblocBalanceAdapter }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.chainId = chainId;
    this.balanceAdapter = balanceAdapter;
  }

  createConversation(options: ConversationOptions = {}): AgentConversation {
    return new AgentConversation(this, options);
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

  async *run(settings: GenerateSettings, {
    account, signal, contextTokens = this.llm.contextTokens, onContextCompacted, allowTransactionPreparation = false,
    pendingPreparation, onAmbiguousPreparation,
  }: AgentRunOptions = {}): AsyncGenerator<GenerateEvent> {
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) throw new RangeError('contextTokens must be a positive integer within the model context.');
    if (!account) {
      if (this.wallet) throw new TypeError('An agent with a wallet needs the account to act for: run(settings, { account })');
      yield* this.llm.generate({ ...settings, tools: undefined }, { signal, contextTokens, onContextCompacted });
      return;
    }
    const started = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    const timer = setTimeout(() => controller.abort(new Error('Wallet request timed out.')), REQUEST_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let firstVisibleAt: number | undefined;
    try {
      const messages: ModelMessage[] = settings.messages ?? [{ role: 'user', content: settings.prompt }];
      const latest = messages.at(-1);
      const choice = latest?.role === 'user' && typeof latest.content === 'string' ? latest.content.trim() : '';
      const selected = pendingPreparation?.account === account && pendingPreparation.chainId === this.chainId
        && pendingPreparation.candidateIds.includes(choice) ? choice : undefined;
      const classified = selected
        ? { aborted: false as const, intent: { kind: 'prepare' as const }, messages,
          metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 }, warnings: [] as string[] }
        : await classifyRequest(this.llm, settings, { signal: controller.signal, contextTokens, onContextCompacted });
      if (classified.aborted || controller.signal.aborted) {
        yield { ...this.done(controller.signal), warnings: classified.warnings, metrics: { ...classified.metrics, totalMs: Date.now() - started, ttftMs: null } };
        return;
      }
      const options: RunOptions = { account, signal: controller.signal, contextTokens, onContextCompacted, allowTransactionPreparation,
        onAmbiguousPreparation, pendingPreparation: selected ? pendingPreparation : undefined };
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
    if (intent.kind === 'unsupported') {
      yield { type: 'text', delta: 'I can help with wallet explanations, current read-only data, and explicitly enabled unsigned transaction preparation.' };
      yield this.done(options.signal);
    } else if (intent.kind === 'explanation' || intent.kind === 'clarification') {
      yield* guardAnswer(this.llm.generate({
        ...settings, tools: undefined, outputSchema: undefined,
        system: [settings.system ?? this.prompt(), intent.kind === 'explanation'
          ? 'Explain briefly in the user’s language, using Gno.land conventions and examples only. Its native coin is GNOT; contract-issued GRC20 tokens are not native coins. Do not infer what the user holds or take any wallet action.'
          : 'Ask a concise question in the user’s language. If they requested multiple actions, name each action and ask which to perform first. Do not invent missing details or prerequisite lookups. Prepare nothing.',
          options.allowTransactionPreparation
            ? 'The host permits unsigned preparation for eligible requests, but this response uses no tools and prepares nothing. Do not claim preparation is globally disabled.'
            : 'This run cannot prepare transactions.'].join('\n\n'),
      }, options), () => true, intent);
    } else if (intent.kind === 'lookup') {
      yield* this.answerLookups(intent, settings, options);
    } else {
      if (!options.allowTransactionPreparation || !this.wallet || !this.onTransaction) {
        yield { type: 'text', delta: 'Transaction preparation is not enabled for this run. No transaction was prepared.' };
        yield this.done(options.signal);
        return;
      }
      const selected = options.pendingPreparation;
      if (!selected && /(?:^|[\s(:])[-−]\d/u.test(this.userText(settings))) {
        yield { type: 'text', delta: 'A negative amount is not valid for a wallet transaction. No transaction was prepared.' };
        yield this.done(options.signal);
        return;
      }
      let planned: PreparationPlanning | undefined;
      try {
        planned = selected ? undefined : await proposePreparation(this.llm, settings.messages, options);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith('ADENA_PREPARATION_INVALID:')) throw error;
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(this.userText(settings))
          ? '받는 사람, 자산, 금액을 모두 알려 주시겠어요? 금액은 음수가 아니어야 합니다. 거래는 준비되지 않았습니다.'
          : 'Which recipient, asset, and amount should I use? Amounts must be non-negative. No transaction was prepared.' };
        yield this.done(options.signal);
        return;
      }
      const completion = planned ? { ...this.done(options.signal), metrics: planned.metrics, warnings: planned.warnings } : this.done(options.signal);
      if (planned?.aborted || options.signal.aborted) { yield { ...completion, aborted: true }; return; }
      let proposal = selected
        ? { ...selected.proposal, asset: { kind: 'id' as const, value: this.userText(settings).trim() } }
        : planned!.aborted ? undefined : planned!.proposal;
      if (!proposal) return;
      if (proposal.operation === 'clarification') {
        yield { type: 'text', delta: proposal.question };
        yield { ...completion, messages: [{ role: 'assistant', content: proposal.question }] };
        return;
      }
      const authorizedText = this.userText(settings);
      if (!selected && proposal.amount.kind === 'fraction' && !fractionEvidence(authorizedText, proposal.amount)) {
        const value = pairedDecimalAmount(authorizedText, proposal.asset.value);
        if (value) {
          proposal = { ...proposal, amount: { kind: 'exact', value } };
        } else {
          yield { type: 'text', delta: 'Please specify the exact amount or an unambiguous share of the balance. No transaction was prepared.' };
          yield completion;
          return;
        }
      }
      if (!selected && proposal.recipient.toLowerCase() === proposal.asset.value.toLowerCase()
        && !mentionsIdentifier(authorizedText, proposal.recipient, false, 2)) {
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(authorizedText)
          ? '받는 사람이 누구인가요? 자산과 받는 사람을 각각 확인해 주세요. 거래는 준비되지 않았습니다.'
          : 'Who is the recipient? Please identify the recipient separately from the asset. No transaction was prepared.' };
        yield completion;
        return;
      }
      if (!selected && (!mentionsIdentifier(authorizedText, proposal.recipient)
        || !mentionsIdentifier(authorizedText, proposal.asset.value, proposal.asset.kind === 'id')
        || proposal.amount.kind === 'exact' && !exactAmountEvidence(authorizedText, proposal.amount.value))) {
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(authorizedText)
          ? '받는 사람, 수량과 정확한 자산을 모두 확인해 주세요. 거래는 준비되지 않았습니다.'
          : 'Please confirm the recipient, amount, and exact asset for this transaction. No transaction was prepared.' };
        yield completion;
        return;
      }
      const action = proposal.operation;
      const contacts = (await this.wallet.getContacts?.()) ?? [];
      const all = createWalletTools({ sdk: this.wallet, account: options.account, contacts, userText: authorizedText,
        authorizedRecipient: selected?.proposal.recipient, onTransaction: this.onTransaction });
      if (!Object.hasOwn(all, action)) {
        yield { type: 'text', delta: `The wallet does not support ${action}. No transaction was prepared.` };
        yield completion;
        return;
      }
      const run = await this.harness.startRun({ account: options.account, chainId: this.chainId, operationId: `prepare-${++this.runs}`,
        scope: 'prepare-wallet', purpose: 'mainnet-read', walletTools: { [action]: all[action] }, signal: options.signal });
      try {
        yield* this.prepareEvents(proposal, run, completion, pending => {
          const recipient = contacts.find(contact => contact.alias.toLowerCase() === proposal.recipient.trim().toLowerCase())?.address
            ?? proposal.recipient;
          options.onAmbiguousPreparation?.({ ...pending, proposal: { ...pending.proposal, recipient } });
        });
      } finally { run.close(); }
    }
  }

  private async *prepareEvents(proposal: Exclude<PreparationProposal, { operation: 'clarification' }>,
    run: HarnessRun, completion: DoneEvent, onAmbiguousPreparation?: (pending: PendingPreparation) => void): AsyncGenerator<GenerateEvent> {
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
      const output = await run.dispatch({ name, input });
      if (!run.signal.aborted && !run.auditFailed && proposal.asset.kind === 'symbol' && output.kind === 'result'
        && typeof output.value === 'object' && output.value !== null && 'code' in output.value
        && output.value.code === 'ambiguous_token' && 'candidateIds' in output.value
        && Array.isArray(output.value.candidateIds) && output.value.candidateIds.length >= 2
        && output.value.candidateIds.every((id: unknown) => typeof id === 'string' && id.length > 0)) {
        onAmbiguousPreparation?.({ proposal, candidateIds: [...output.value.candidateIds],
          account: run.context.account, chainId: run.context.chainId });
      }
      yield { type: 'tool-result', id, name, output };
      yield { ...completion, aborted: run.signal.aborted };
    })();
    yield* guardAnswer(events, tool => tool !== name, { kind: 'prepare', action: name }, { auditFailed: () => run.auditFailed });
  }

  private async *answerLookups(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: RunOptions): AsyncGenerator<GenerateEvent> {
    const other = intent.requests.find(request => request.target === 'other');
    const walletTools = this.wallet && this.onTransaction && other
      ? Object.fromEntries(Object.entries(createWalletTools({ sdk: this.wallet, account: options.account, contacts: [], userText: this.userText(settings), onTransaction: this.onTransaction })).filter(([, tool]) => tool.effect === 'read')) : {};
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
      for await (const event of this.llm.generate({ ...settings, tools: undefined, outputSchema: undefined,
        system: [settings.system ?? this.prompt(), `Obtain fresh results from every required read: ${requiredReads.join(', ')}. Unrelated reads do not complete this task.`].join('\n\n'),
      }, { ...options, loop })) {
        if (event.type === 'done') record(event);
        else if (event.type !== 'text') yield event;
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
