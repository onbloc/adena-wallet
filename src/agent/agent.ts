import { ToolChoiceViolationError, type ModelMessage } from 'ai';
import { balanceShareEvidence, exactAmountEvidence, fractionEvidence, pairedDecimalAmount } from './amountEvidence';
import { preparationEvidence } from './preparationEvidence';
import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { balanceRequestSchema, balanceResultSchema, balanceToolDefinition, getBalance as readBalance } from './balanceOperation';
import type { BalanceAdapter, BalanceRequest, BalanceResult } from './balanceOperation';
import { describeToolRecord } from './toolRecord';
import { buildWalletPrompt } from './prompts';
import { realmEvidence } from './realmEvidence';
import type { RealmEvidence } from './realmEvidence';
import { askWhichRecipient, classifyRequest, proposePreparation, selectLookupTools, verifyLookupTools, type LookupToolSelection, type PreparationPlanning, type PreparationProposal, type RequestIntent } from './requestIntent';
import type { Contact, TransactionHandler, WalletSdk } from './wallet/port';
import { fromBaseUnits } from './wallet/amount';
import { createWalletTools } from './wallet/tools';
import type { Budget, Decision, Harness, HarnessRun } from '../harness/core';
import { GNO_MAINNET_CHAIN, isValidGnoAddress } from '../harness/mcp';
import { onblocBalanceAdapter } from './onblocBalanceAdapter';
import {
  applyToolEvent,
  canRememberTurn,
  CHAT_PROMPT_MAX_LENGTH,
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

async function loadContacts(wallet: WalletSdk, signal: AbortSignal): Promise<Contact[]> {
  signal.throwIfAborted();
  if (!wallet.getContacts) return [];
  let cancel!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener('abort', cancel, { once: true });
  });
  try {
    const contacts = await Promise.race([
      cancelled,
      Promise.resolve().then(() => {
        signal.throwIfAborted();
        return wallet.getContacts?.({ signal }) ?? [];
      }),
    ]);
    signal.throwIfAborted();
    return contacts;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

export type AIAgentOptions = {
  llm: LLM;
  harness: Harness;
  /** The conversation to continue, e.g. restored with `createChatSession(saved)`; a new one by default. */
  session?: ChatSession;
  chainId?: string;
  balanceAdapter?: BalanceAdapter;
  /** The token symbols the wallet can prepare; unknown symbols require clarification. */
  tokenSymbols?: readonly string[];
  /**
   * Limits harness execution: 5 model steps, 4 tool dispatches, twice the context in tokens,
   * and 300000 ms by default. Dispatches include wallet preparations. Routing, planning and
   * tool-free answers are separate; timeoutMs bounds the entire turn.
   */
  budget?: Partial<Budget>;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | { wallet: WalletSdk; onTransaction: TransactionHandler }
);
type ClarificationSlot = 'recipient' | 'asset' | 'amount';
type PendingClarification = { text: string; slot?: ClarificationSlot };
type BalanceReferent = Extract<BalanceRequest, { kind: 'one' }>['asset'];
function clarificationSlot(question: string): ClarificationSlot | undefined {
  const slots: ClarificationSlot[] = [];
  if (/\b(?:who|recipient|receiver|spender)\b|받는\s*사람|누구/iu.test(question)) slots.push('recipient');
  if (/\b(?:asset|token|symbol)\b|자산|토큰|심볼/iu.test(question)) slots.push('asset');
  if (/\b(?:amount|quantity|how much|how many)\b|수량|금액|얼마/iu.test(question)) slots.push('amount');
  return slots.length === 1 ? slots[0] : undefined;
}
type PendingPreparation = {
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
};
/** What one turn needs from the host: the prompt, and how the model should answer it. */
export type AgentSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { prompt: string };
type RunOptions = AgentRunOptions & {
  contextTokens: number;
  signal: AbortSignal;
  budget: Budget;
  pendingClarification?: PendingClarification;
  onPreparationClarification?: (userText: string, slot?: ClarificationSlot) => void;
  balanceReferent?: BalanceReferent;
  onBalanceReferent?: (asset: BalanceReferent) => void;
  /** Host-owned, one-turn state from a prior SDK ambiguity; never derived from model text. */
  pendingPreparation?: PendingPreparation;
  onAmbiguousPreparation?: (pending: PendingPreparation) => void;
};
type AccountRunOptions = RunOptions & { account: string };
type AnswerSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { messages: ModelMessage[] };
type DoneEvent = Extract<GenerateEvent, { type: 'done' }>;
const REQUEST_TIMEOUT_MS = 5 * 60_000;
const ANSWER_INSTRUCTIONS = {
  explanation: 'Explain briefly in the user’s language using Gno.land conventions and examples. GNOT is native; contract-issued GRC20 tokens are not native coins. Do not infer holdings or take a wallet action. Use no tools.',
  clarification: 'Ask a concise question in the user’s language. For multiple actions, name each and ask which to perform first. Invent no missing details or prerequisite lookups. Prepare nothing.',
  chat: 'Reply naturally to the conversation. You can only explain concepts, read the wallet\'s data and prepare transfers and approvals; if asked for anything else (swap, stake, buy, bridge, send an NFT), say plainly that you cannot. This reply has no wallet data and prepares nothing: never claim to have read the wallet or done a wallet action. Use no tools.',
} as const;

// The model's missing-field guess is not evidence for that field.
function missingPreparationSlot(text: string, proposal: Exclude<PreparationProposal, { operation: 'clarification' }>): ClarificationSlot | undefined {
  if (preparationEvidence(text, proposal)) return undefined;
  const asset = mentionsIdentifier(text, proposal.asset.value, proposal.asset.kind === 'id');
  const same = proposal.recipient.toLowerCase() === proposal.asset.value.toLowerCase();
  const recipient = mentionsIdentifier(text, proposal.recipient, false, same ? 2 : 1);
  const amount = proposal.amount.kind === 'exact'
    ? exactAmountEvidence(text, proposal.amount.value, proposal.asset.value) : fractionEvidence(text, proposal.amount);
  if (asset && amount && !recipient) return 'recipient';
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const remainder = text.replace(new RegExp(`${escape(proposal.recipient)}|${escape(proposal.asset.value)}`, 'giu'), ' ');
  if (asset && recipient && !amount && !/\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|third|all)\b|(?:절반|전부|모두|전체|한\s*개|두\s*개|세\s*개)/iu.test(remainder)) return 'amount';
  return undefined;
}

// Match complete user-supplied identifiers, not a symbol embedded in another symbol
// or a package path embedded in a longer path.
function mentionsIdentifier(text: string, value: string, exact = false, minimum = 1): boolean {
  const source = exact ? text : text.toLowerCase();
  const needle = exact ? value : value.toLowerCase();
  const identifier = /[\p{L}\p{M}\p{N}_/:.-]/u;
  let matches = 0;
  for (let index = source.indexOf(needle); needle && index !== -1; index = source.indexOf(needle, index + 1)) {
    const before = Array.from(source.slice(0, index)).at(-1) ?? '';
    const after = Array.from(source.slice(index + needle.length))[0] ?? '';
    const koreanParticle = !exact && /^[a-z0-9.]+$/i.test(needle) && /^\p{Script=Hangul}$/u.test(after);
    const punctuation = /^\.+(?:$|[^\p{L}\p{M}\p{N}_/:.-])/u.test(source.slice(index + needle.length));
    if (!identifier.test(before) && (!identifier.test(after) || koreanParticle || punctuation) && ++matches >= minimum) return true;
  }
  return false;
}
const bareConfirmation = /^(?:yes|yeah|yep|ok(?:ay)?|sure|네|예|응|맞아|맞아요)[.!]*$/iu;

function restatementQuestion(text: string): string {
  return /[\uac00-\ud7a3]/u.test(text)
    ? '어떤 거래를 원하시나요? 동작, 받는 사람, 수량과 정확한 자산을 함께 다시 말씀해 주시겠어요? 거래는 준비되지 않았습니다.'
    : 'What transaction would you like? Please restate the action, recipient, amount, and exact asset. No transaction was prepared.';
}

function isClarificationReply(text: string): boolean {
  return text.length > 0 && text.length <= 100
    && !bareConfirmation.test(text.trim())
    && !/[?!;]|(?:\b(?:send|transfer|pay|approve|allow|if|not|never|instead|actually)\b)|(?:보내|송금|전송|승인|허용|하지|아니|만약)/iu.test(text);
}

/** A wallet action acts for an account: without one the host has to link a wallet first. */
function requireAccount(options: RunOptions): AccountRunOptions {
  if (!options.account) throw new Error('AGENT_ACCOUNT_REQUIRED: Link a wallet to read wallet data or prepare transactions.');
  return { ...options, account: options.account };
}

function userMessageText(message: ModelMessage): string {
  return message.role !== 'user' ? '' : typeof message.content === 'string' ? message.content
    : message.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n');
}

// Only user-authored standalone address candidates can select a read target.
function addressCandidates(text: string): string[] {
  return Array.from(text.matchAll(/(?:^|[^a-zA-Z0-9_/])(g1[a-zA-Z0-9]*)/gi), match => match[1]);
}

function lookupAccount(intent: Extract<RequestIntent, { kind: 'lookup' }>, messages: ModelMessage[]): string | undefined | null {
  const users = messages.filter(message => message.role === 'user').map(userMessageText);
  const latest = users.at(-1) ?? '';
  const candidates = addressCandidates(latest);
  const reference = /\b(?:that|this|same|previous|above|the)\s+(?:wallet|account|address)\b|(?:그|해당|위|이전|같은)\s*(?:주소|계정|지갑)/i.test(latest);
  const earlier = reference ? users.slice(0, -1).reverse().find(text => addressCandidates(text).length > 0) : undefined;
  const relevant = candidates.length ? candidates : earlier ? addressCandidates(earlier) : [];
  if (new Set(relevant.map(value => value.toLowerCase())).size > 1) return null;
  if (candidates.length === 1 && intent.requests.length === 1 && intent.requests[0].target === 'other') {
    const ownPermissions = /\bmy\b[^.!?;]*\b(?:approvals?|allowances?|permissions?)\b[^.!?;]*\b(?:for|to)\s+g1[a-z0-9]+/i.test(latest)
      || /g1[a-z0-9]+(?:에게|한테|께)/i.test(latest)
        && /(?:내가|제가)[^.!?;]*(?:승인|허용)\s*(?:해\s*)?(?:준|한|했던)|(?:내|나의|제)\s*(?:토큰\s*)?(?:승인|허용)\s*(?:목록|내역|권한)/u.test(latest);
    // An explicitly self-owned allowance names the spender, not another lookup owner.
    if (ownPermissions) return undefined;
  }
  const recipientOnly = candidates.length === 1
    && (/\b(?:to|recipient|spender)\s*[:=]?\s*g1/i.test(latest) || /g1[a-z0-9]+(?:에게|한테|으로)/i.test(latest))
    && (/\b(?:send|pay|transfer|spend)\b|보내|송금|지급/i.test(latest));
  if (recipientOnly) return intent.account === undefined ? undefined : null;
  if (intent.account !== undefined) {
    if (!isValidGnoAddress(intent.account) || !relevant.includes(intent.account)) return null;
    return intent.account;
  }
  if (relevant.length === 1 && isValidGnoAddress(relevant[0])
    && (/(?:주소|계정|지갑)|\b(?:address|account|wallet)\b/i.test(latest))
    && (candidates.length > 0 || reference)) return relevant[0];
  // An unclassified address must not silently fall back to the active account.
  if (relevant.length || reference) return null;
  if (/(?:address|주소)\s*(?:[:=]|\bis\b)\s*\S+/i.test(latest)) return null;
  return undefined;
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
  private readonly budget: Partial<Budget>;
  private active?: AbortController;
  private continuation?: { account?: string; clarification?: PendingClarification; balance?: BalanceReferent; preparation?: PendingPreparation };
  private revision = 0;
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, session, chainId = GNO_MAINNET_CHAIN, balanceAdapter = onblocBalanceAdapter, tokenSymbols = [], budget = {} }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.session = session ?? createChatSession();
    this.chainId = chainId;
    this.balanceAdapter = balanceAdapter;
    this.tokenSymbols = tokenSymbols;
    this.budget = { ...budget };
  }

  get turns() {
    return this.session.turns;
  }

  serialize(): string {
    return this.session.serialize();
  }

  /** Forgets the conversation and stops the turn in progress; whatever it still produces is not remembered. */
  reset(): void {
    this.clearPending();
    this.session.reset();
  }

  /** Revokes volatile authority and stops the active turn without forgetting the conversation. */
  clearPending(): void {
    this.revision++;
    this.continuation = undefined;
    this.active?.abort();
    this.active = undefined;
  }

  private executionBudget(contextTokens: number): Budget {
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0) throw new RangeError('Invalid model context token limit.');
    if (this.budget.maxTokens === undefined && contextTokens > Math.floor(Number.MAX_SAFE_INTEGER / 2)) {
      throw new RangeError('Default token budget exceeds safe integer range.');
    }
    const budget = { maxSteps: this.budget.maxSteps ?? 5, maxToolCalls: this.budget.maxToolCalls ?? 4,
      maxTokens: this.budget.maxTokens ?? contextTokens * 2, timeoutMs: this.budget.timeoutMs ?? REQUEST_TIMEOUT_MS };
    for (const limit of [budget.maxSteps, budget.maxToolCalls, budget.maxTokens, budget.timeoutMs]) {
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError('Invalid execution budget.');
    }
    if (budget.timeoutMs > 2_147_483_647) throw new RangeError('Timeout exceeds timer range.');
    return budget;
  }

  /** Structured queries need no model; every provider call stays in the same run. */
  async getBalance(request: BalanceRequest, { account, signal }: { account: string; signal?: AbortSignal }): Promise<BalanceResult> {
    const parsed = balanceRequestSchema.parse(request);
    const run = await this.harness.startRun({ account, chainId: this.chainId, operationId: `balance-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', signal, budget: this.executionBudget(this.llm.contextTokens) });
    try {
      return await readBalance(run, parsed, { account, chainId: this.chainId, adapter: this.balanceAdapter });
    } finally {
      run.close();
    }
  }

  /**
   * One turn of the conversation. Completed answers and tool records are remembered;
   * volatile preparation authority is never restored from that history.
   */
  async *run(settings: AgentSettings, options: AgentRunOptions = {}): AsyncGenerator<GenerateEvent> {
    const { signal, contextTokens = this.llm.contextTokens, onContextCompacted } = options;
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) throw new RangeError('contextTokens must be a positive integer within the model context.');
    const budget = this.executionBudget(contextTokens);
    if (this.active) throw new Error('A conversation already has an active turn.');
    if (!settings.prompt.trim()) throw new TypeError('A conversation prompt must not be empty.');
    if (settings.prompt.length > CHAT_PROMPT_MAX_LENGTH) {
      throw new RangeError(`AGENT_PROMPT_LIMIT: Prompts must not exceed ${CHAT_PROMPT_MAX_LENGTH} characters; shorten the request.`);
    }
    const outputTokens = settings.maxOutputTokens ?? DEFAULT_GENERATE_SETTINGS.maxOutputTokens;
    if (!Number.isSafeInteger(outputTokens) || outputTokens <= 0) throw new RangeError('maxOutputTokens must be a positive integer.');
    if (outputTokens > contextTokens) throw new RangeError('maxOutputTokens exceeds the model context.');
    // Every turn starts with the structured classification call, which is capped at 512 tokens.
    const reservedOutput = Math.min(outputTokens, 512);
    // Reject an oversized current request unchanged, before discovery or wallet access.
    if (estimateContextInput([settings.system, [{ role: 'user', content: settings.prompt }]]) + reservedOutput > contextTokens) {
      throw new Error('AGENT_CONTEXT_LIMIT: Current request exceeds the conversation context; shorten it.');
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
    const continuation = this.continuation?.account === options.account ? this.continuation : undefined;
    this.continuation = undefined;
    let nextClarification: PendingClarification | undefined;
    let nextBalanceReferent: BalanceReferent | undefined;
    let nextPreparation: PendingPreparation | undefined;
    try {
      const events = this.execute({ ...generation, messages: this.session.messages(prompt) }, {
        ...options,
        signal: controller.signal,
        contextTokens,
        budget,
        pendingPreparation: options.allowTransactionPreparation ? continuation?.preparation : undefined,
        onAmbiguousPreparation: (pending) => { nextPreparation = pending; },
        pendingClarification: options.allowTransactionPreparation ? continuation?.clarification : undefined,
        onPreparationClarification: (text, slot) => { nextClarification = { text, slot }; },
        balanceReferent: continuation?.balance,
        onBalanceReferent: (asset) => { nextBalanceReferent = asset; },
        onContextCompacted: (count) => {
          if (revision !== this.revision || controller.signal.aborted) return;
          nextClarification = undefined;
          nextBalanceReferent = undefined;
          nextPreparation = undefined;
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
          if (revision === this.revision && !controller.signal.aborted && !event.aborted) {
            if (event.finishReason === 'stop') {
              this.continuation = { account: options.account,
                clarification: options.allowTransactionPreparation ? nextClarification : undefined, balance: nextBalanceReferent,
                preparation: options.allowTransactionPreparation ? nextPreparation : undefined };
            }
            if (canRememberTurn(event) && !this.session.complete(prompt, answer, describeToolRecord(calls))) {
              yield { ...event, warnings: [...event.warnings, 'This completed answer exceeds conversation storage limits and was not retained. Future turns will not include this exchange.'] };
              continue;
            }
          }
        }
        yield event;
      }
    } finally {
      if (revision === this.revision && (controller.signal.aborted || !completed)) this.continuation = undefined;
      controller.abort();
      signal?.removeEventListener('abort', abort);
      if (this.active === controller) this.active = undefined;
    }
  }

  /** Classifies the request on the history in `settings.messages`, then answers it by its route. */
  private async *execute(settings: GenerateSettings, {
    account, signal, contextTokens, budget, onContextCompacted, allowTransactionPreparation = false,
    pendingClarification, onPreparationClarification, balanceReferent, onBalanceReferent,
    pendingPreparation, onAmbiguousPreparation,
  }: RunOptions): AsyncGenerator<GenerateEvent> {
    const started = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    const timer = setTimeout(() => controller.abort(new Error('Wallet request timed out.')), budget.timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let firstVisibleAt: number | undefined;
    let activeOptions: RunOptions | undefined;
    const compact = (count: number) => {
      pendingClarification = undefined;
      balanceReferent = undefined;
      pendingPreparation = undefined;
      if (activeOptions) {
        activeOptions.pendingClarification = undefined;
        activeOptions.balanceReferent = undefined;
        activeOptions.pendingPreparation = undefined;
      }
      onContextCompacted?.(count);
    };
    try {
      if (controller.signal.aborted) { yield this.done(controller.signal); return; }
      const messages: ModelMessage[] = settings.messages ?? [{ role: 'user', content: settings.prompt }];
      const latest = messages.at(-1);
      const choice = latest?.role === 'user' && typeof latest.content === 'string' ? latest.content.trim() : '';
      if (pendingClarification && bareConfirmation.test(choice)) {
        const question = restatementQuestion(pendingClarification.text);
        onPreparationClarification?.(pendingClarification.text, pendingClarification.slot);
        yield { type: 'text', delta: question };
        yield { ...this.done(controller.signal), messages: [{ role: 'assistant', content: question }] };
        return;
      }
      const selected = pendingPreparation && pendingPreparation.account === account && pendingPreparation.chainId === this.chainId
        && pendingPreparation.candidateIds.includes(choice) ? choice : undefined;
      const classified = selected
        ? { aborted: false as const, intent: { kind: 'prepare' as const }, messages,
          metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 }, warnings: [] as string[] }
        : await classifyRequest(this.llm, settings, { signal: controller.signal, contextTokens, onContextCompacted: compact });
      if (classified.aborted || controller.signal.aborted) {
        yield { ...this.done(controller.signal), warnings: classified.warnings, metrics: { ...classified.metrics, totalMs: Date.now() - started, ttftMs: null } };
        return;
      }
      const options: RunOptions = activeOptions = { account, signal: controller.signal, contextTokens, budget, onContextCompacted: compact, allowTransactionPreparation,
        onAmbiguousPreparation, pendingPreparation: selected ? pendingPreparation : undefined,
        pendingClarification, onPreparationClarification, balanceReferent, onBalanceReferent };
      const { prompt: _prompt, ...answerSettings } = settings;
      const intent = pendingClarification?.slot && isClarificationReply(choice) ? { kind: 'prepare' as const } : classified.intent;
      const events = this.answerRequest(intent, { ...answerSettings, messages: classified.messages }, options);
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
    const text = this.userText(settings);
    if (options.allowTransactionPreparation && /(?:^|[^\p{L}\p{N}])[-−]\s*\d/u.test(text)
      && /(?:\b(?:send|transfer|pay|approve|allow)\b|보내|송금|전송|승인|허용)/iu.test(text)) {
      const question = /[\uac00-\ud7a3]/u.test(text)
        ? '거래 금액은 음수일 수 없습니다. 유효한 금액을 입력해 주세요. 거래는 준비되지 않았습니다.'
        : 'The transaction amount cannot be negative. Please specify a valid amount. No transaction was prepared.';
      yield { type: 'text', delta: question };
      yield { ...this.done(options.signal), messages: [{ role: 'assistant', content: question }] };
      return;
    }
    if (intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'chat') {
      yield* guardAnswer(this.llm.generate({
        ...settings, tools: undefined, outputSchema: undefined,
        system: [settings.system ?? this.prompt(), ANSWER_INSTRUCTIONS[intent.kind],
          options.allowTransactionPreparation
            ? 'The host permits unsigned preparation for eligible requests, but this response uses no tools and prepares nothing. Do not claim preparation is globally disabled.'
            : 'This run cannot prepare transactions.'].join('\n\n'),
      }, options), () => true, intent);
    } else if (intent.kind === 'lookup') {
      const target = lookupAccount(intent, settings.messages);
      if (target === null) {
        const question = 'Which single valid Gno public address should I look up?';
        yield { type: 'text', delta: question };
        yield { ...this.done(options.signal), messages: [{ role: 'assistant', content: question }] };
        return;
      }
      yield* this.answerLookups(intent, settings, requireAccount({ ...options, account: target ?? options.account }), options.account);
    } else {
      const { account } = requireAccount(options);
      if (!options.allowTransactionPreparation || !this.wallet || !this.onTransaction) {
        yield { type: 'text', delta: 'Transaction preparation is not enabled for this run. No transaction was prepared.' };
        yield this.done(options.signal);
        return;
      }
      const selected = options.pendingPreparation;
      const reply = this.userText(settings);
      const pending = options.pendingClarification;
      const hasPriorTurn = settings.messages.some(message => message.role === 'user' && message.content === pending?.text);
      const planningReply = options.balanceReferent
        ? reply.replace(/\bof\s+(?:it|that)\b/iu, `of my ${options.balanceReferent.value}`)
          .replace(/그\s*(?=절반|전부|일부|반)/u, `내 ${options.balanceReferent.value} `)
        : reply;
      const messages: ModelMessage[] = pending?.slot && isClarificationReply(reply) && !hasPriorTurn
        ? [{ role: 'user', content: `${pending.text}\n${reply}` }]
        : planningReply !== reply ? [...settings.messages.slice(0, -1), { role: 'user', content: planningReply }] : settings.messages;
      let proposal: PreparationProposal;
      let completion = this.done(options.signal);
      if (selected) {
        proposal = { ...selected.proposal, asset: { kind: 'id', value: reply.trim() } };
      } else {
        let planned: PreparationPlanning;
        try {
          planned = await proposePreparation(this.llm, messages, { ...options, tokenSymbols: this.tokenSymbols });
        } catch (error) {
          if (!(error instanceof Error) || !error.message.startsWith('AGENT_PREPARATION_INVALID:')) throw error;
          options.onPreparationClarification?.(reply);
          const question = restatementQuestion(reply);
          yield { type: 'text', delta: question };
          yield { ...completion, messages: [{ role: 'assistant', content: question }] };
          return;
        }
        completion = { ...completion, metrics: planned.metrics, warnings: planned.warnings };
        if (planned.aborted || options.signal.aborted) { yield { ...completion, aborted: true }; return; }
        proposal = planned.proposal;
      }
      if (proposal.operation === 'clarification') {
        options.onPreparationClarification?.(this.userText(settings), clarificationSlot(proposal.question));
        yield { type: 'text', delta: proposal.question };
        yield { ...completion, messages: [{ role: 'assistant', content: proposal.question }] };
        return;
      }
      const current = this.userText(settings);
      const prior = options.pendingClarification?.text;
      const candidate = proposal;
      const amountIn = (text: string) => candidate.amount.kind === 'fraction'
        ? fractionEvidence(text, candidate.amount) : exactAmountEvidence(text, candidate.amount.value, candidate.asset.value);
      const continuation = !selected && !!prior && !!options.pendingClarification?.slot
        && options.pendingClarification.slot !== 'asset' && isClarificationReply(current)
        && (options.pendingClarification!.slot !== 'recipient'
          || !/(?:\b(?:to|for)\s+[\p{L}\p{N}][\p{L}\p{N}._:/-]*|[\p{L}\p{N}._:/-]+(?:에게|한테|께))/iu.test(prior))
        && mentionsIdentifier(prior, candidate.asset.value, candidate.asset.kind === 'id')
        && (options.pendingClarification!.slot === 'recipient' || mentionsIdentifier(prior, candidate.recipient))
        && (options.pendingClarification!.slot === 'amount' || amountIn(prior))
        && (options.pendingClarification!.slot === 'amount'
          ? !amountIn(prior) && amountIn(current)
          : !mentionsIdentifier(prior, options.pendingClarification!.slot === 'recipient' ? candidate.recipient : candidate.asset.value)
            && mentionsIdentifier(current, options.pendingClarification!.slot === 'recipient' ? candidate.recipient : candidate.asset.value))
        && !preparationEvidence(prior + '\n' + current, proposal);
      const relative = /(?:\b(?:half|quarter|third|all)\s+of\s+(?:it|that)\b|그\s*(?:절반|전부|일부|반))/iu.test(current);
      const referent = options.balanceReferent;
      const referencedAsset = relative && referent && proposal.asset.kind === referent.kind
        && proposal.asset.value.toLowerCase() === referent.value.toLowerCase();
      const authorizedText = continuation ? prior + '\n' + current : referencedAsset
        ? current.replace(/\bof\s+(?:it|that)\b/iu, `of my ${referent.value}`).replace(/그\s*(?=절반|전부|일부|반)/u, `내 ${referent.value} `)
        : current;
      const referentShare = referencedAsset ? balanceShareEvidence(authorizedText) : undefined;
      if (referentShare) proposal = { ...proposal, amount: { kind: 'fraction', ...referentShare } };
      if (!selected && !mentionsIdentifier(authorizedText, proposal.recipient)) {
        options.onPreparationClarification?.(current, missingPreparationSlot(current, proposal));
        const id = `prepare-${++this.runs}:target`;
        const input = { [proposal.operation === 'transfer' ? 'to' : 'spender']: proposal.recipient,
          amount: proposal.amount.kind === 'exact' ? proposal.amount.value : `${proposal.amount.numerator}/${proposal.amount.denominator}`,
          token: proposal.asset.value };
        yield { type: 'tool-call', id, name: proposal.operation, input, invalid: false };
        yield { type: 'tool-result', id, name: proposal.operation, output: { kind: 'denied', code: 'TARGET_CHANGED' } };
        const question = restatementQuestion(current);
        yield { type: 'text', delta: question };
        yield { ...completion, messages: [{ role: 'assistant', content: question }] };
        return;
      }
      const evidence = selected ? undefined : preparationEvidence(authorizedText, proposal);
      if (evidence) {
        options.onPreparationClarification?.(current);
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(current)
          ? evidence === 'multiple' ? '한 번에 한 거래만 준비할 수 있습니다. 하나의 동작, 받는 사람, 자산을 선택해 주세요. 거래는 준비되지 않았습니다.'
            : '송금 또는 승인할 내용과 받는 사람, 수량, 자산을 명확하게 다시 말씀해 주시겠어요? 거래는 준비되지 않았습니다.'
          : evidence === 'multiple' ? 'Please choose one action, recipient, and asset for one transaction. No transaction was prepared.'
            : 'Could you explicitly restate the transfer or approval, recipient, amount, and asset? No transaction was prepared.' };
        yield completion;
        return;
      }
      if (!selected && !mentionsIdentifier(authorizedText, proposal.asset.value, proposal.asset.kind === 'id')
        && /(?:\b(?:half|quarter|third|all)\s+of\s+(?:it|that)\b|그\s*(?:절반|전부|일부|반))/iu.test(current)) {
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(current)
          ? '어떤 자산의 잔액인가요? 자산과 거래 내용을 명확히 다시 알려 주시겠어요? 거래는 준비되지 않았습니다.'
          : 'Which asset balance do you mean? Please restate the asset and transaction explicitly. No transaction was prepared.' };
        yield completion;
        return;
      }
      if (!selected && proposal.amount.kind === 'fraction' && !fractionEvidence(authorizedText, proposal.amount)) {
        const value = pairedDecimalAmount(authorizedText, proposal.asset.value);
        if (value) {
          proposal = { ...proposal, amount: { kind: 'exact', value } };
        } else {
          yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(current)
            ? '정확한 수량이나 잔액의 명확한 비율을 알려 주시겠어요? 거래는 준비되지 않았습니다.'
            : 'Please specify the exact amount or an unambiguous share of the balance. No transaction was prepared.' };
          yield completion;
          return;
        }
      }
      if (!selected && proposal.recipient.toLowerCase() === proposal.asset.value.toLowerCase()
        && !mentionsIdentifier(authorizedText, proposal.recipient, false, 2)) {
        options.onPreparationClarification?.(current, missingPreparationSlot(current, proposal));
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(authorizedText)
          ? '받는 사람이 누구인가요? 자산과 받는 사람을 각각 확인해 주세요. 거래는 준비되지 않았습니다.'
          : 'Who is the recipient? Please identify the recipient separately from the asset. No transaction was prepared.' };
        yield completion;
        return;
      }
      if (!selected && (!mentionsIdentifier(authorizedText, proposal.recipient)
        || !mentionsIdentifier(authorizedText, proposal.asset.value, proposal.asset.kind === 'id')
        || proposal.amount.kind === 'exact' && !exactAmountEvidence(authorizedText, proposal.amount.value, proposal.asset.value))) {
        options.onPreparationClarification?.(current, missingPreparationSlot(current, proposal));
        yield { type: 'text', delta: /[\uac00-\ud7a3]/u.test(authorizedText)
          ? '받는 사람, 수량과 정확한 자산을 모두 다시 알려 주시겠어요? 거래는 준비되지 않았습니다.'
          : 'Could you restate the recipient, amount, and exact asset for this transaction? No transaction was prepared.' };
        yield completion;
        return;
      }
      const action = proposal.operation;
      // Only now may the address book be read; the model never sees it.
      const contacts: Contact[] = [];
      const all = createWalletTools({ sdk: this.wallet, account, contacts, userText: current,
        authorizedRecipient: selected?.proposal.recipient ?? (continuation ? proposal.recipient : undefined), onTransaction: this.onTransaction });
      if (!Object.hasOwn(all, action)) {
        yield { type: 'text', delta: `The wallet does not support ${action}. No transaction was prepared.` };
        yield completion;
        return;
      }
      const run = await this.harness.startRun({ account, chainId: this.chainId, operationId: `prepare-${++this.runs}`,
        scope: 'prepare-wallet', purpose: 'mainnet-read', walletTools: { [action]: all[action] }, signal: options.signal, budget: options.budget });
      try {
        for (const contact of await loadContacts(this.wallet, run.signal)) contacts.push(contact);
        const whom = selected ? undefined : askWhichRecipient(messages, contacts);
        if (whom !== undefined) {
          options.onPreparationClarification?.(current);
          yield { type: 'text', delta: whom };
          yield { ...completion, messages: [{ role: 'assistant', content: whom }] };
          return;
        }
        yield* this.prepareEvents(proposal, run, completion, pending => {
          const recipient = contacts.find(contact => contact.alias.trim().toLowerCase() === proposal.recipient.trim().toLowerCase())?.address
            ?? proposal.recipient;
          options.onAmbiguousPreparation?.({ ...pending, proposal: { ...pending.proposal, recipient } });
        }, current, options.onPreparationClarification);
      } catch (error) {
        if (!run.signal.aborted) throw error;
        yield { ...completion, aborted: true };
      } finally { run.close(); }
    }
  }

  private async *prepareEvents(proposal: Exclude<PreparationProposal, { operation: 'clarification' }>,
    run: HarnessRun, completion: DoneEvent, onAmbiguousPreparation: ((pending: PendingPreparation) => void) | undefined,
    userText: string, onClarification?: (text: string) => void): AsyncGenerator<GenerateEvent> {
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
        failure = /[\uac00-\ud7a3]/u.test(userText)
          ? '자산의 잔액을 정확히 확인하지 못했습니다. 정확한 토큰 심볼 또는 경로와 수량을 포함해 요청을 다시 말씀해 주시겠어요? 거래는 준비되지 않았습니다.'
          : 'The asset balance could not be verified. Could you restate the request with the exact token symbol or path and amount? No transaction was prepared.';
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
        if (!run.auditFailed && !run.signal.aborted) onClarification?.(userText);
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
    let clarification: string | undefined;
    for await (const event of guardAnswer(events, tool => tool !== name, { kind: 'prepare', action: name }, { auditFailed: () => run.auditFailed })) {
      if (event.type === 'tool-result' && typeof event.output === 'object' && event.output !== null
        && 'kind' in event.output && event.output.kind === 'result' && 'value' in event.output
        && typeof event.output.value === 'object' && event.output.value !== null && 'code' in event.output.value) {
        const code = event.output.value.code;
        const korean = /[\uac00-\ud7a3]/u.test(userText);
        const candidates = 'candidateIds' in event.output.value ? event.output.value.candidateIds : undefined;
        if (code === 'ambiguous_token' && Array.isArray(candidates)) {
          clarification = korean
            ? `어떤 토큰을 사용하시겠어요? 다음 중 정확한 경로 하나를 알려 주세요:\n${candidates.join('\n')}\n거래는 준비되지 않았습니다.`
            : `Which token should I use? Reply with one exact candidate ID:\n${candidates.join('\n')}\nNo transaction was prepared.`;
        } else if (code === 'unknown_token') {
          const asset = mentionsIdentifier(userText, proposal.asset.value) ? ` "${proposal.asset.value}"` : '';
          clarification = korean
            ? `자산${asset}을(를) 지갑에서 찾지 못했습니다. 정확한 토큰 심볼 또는 경로를 포함해 요청을 다시 말씀해 주시겠어요? 거래는 준비되지 않았습니다.`
            : `The asset${asset} was not found in the wallet. Could you restate the request with the exact token symbol or path? No transaction was prepared.`;
        } else if (code === 'invalid_address') {
          const recipient = mentionsIdentifier(userText, proposal.recipient) ? ` "${proposal.recipient}"` : '';
          clarification = korean
            ? `받는 사람 또는 연락처${recipient}의 주소를 확인하지 못했습니다. 정확한 주소나 연락처를 포함해 요청을 다시 말씀해 주시겠어요? 거래는 준비되지 않았습니다.`
            : `The recipient or contact${recipient} could not be verified. Could you restate the request with the exact address or contact? No transaction was prepared.`;
        }
      }
      if (event.type === 'text' && clarification && !run.auditFailed && !run.signal.aborted) onClarification?.(userText);
      yield event.type === 'text' && clarification && !run.auditFailed ? { ...event, delta: clarification } : event;
    }
  }

  private async *answerLookups(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: AccountRunOptions, activeAccount?: string): AsyncGenerator<GenerateEvent> {
    const other = intent.requests.find(request => request.target === 'other');
    const walletTools = this.wallet && this.onTransaction && other && options.account === activeAccount
      ? Object.fromEntries(Object.entries(createWalletTools({ sdk: this.wallet, account: options.account, contacts: [], userText: this.userText(settings), onTransaction: this.onTransaction })).filter(([, tool]) => tool.effect === 'read')) : {};
    const run = await this.harness.startRun({ account: options.account, chainId: this.chainId, operationId: `lookup-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', walletTools, signal: options.signal, budget: options.budget });
    try {
      const hidden = new Set([...onblocBalanceAdapter.toolNames, ...this.balanceAdapter.toolNames]);
      const catalog = run.tools.filter(tool => !hidden.has(tool.name));
      const query = other?.query;
      let selection = query ? await selectLookupTools(this.llm, query, catalog, { signal: run.signal, contextTokens: options.contextTokens }) : undefined;
      if (selection?.aborted || run.signal.aborted) { yield { ...this.done(run.signal), warnings: selection?.warnings ?? [] }; return; }
      const evidence = realmEvidence(this.userText(settings), run, query);
      let realmPath = query && catalog.some(tool => tool.name === 'get_realm_info') ? evidence.requestedPath() : undefined;
      if (realmPath && query && !selection?.toolNames.includes('get_realm_info') && catalog.some(tool => tool.name === 'get_realm_source')) {
        const names = new Set(['get_realm_info', 'get_realm_source', ...(selection?.toolNames ?? [])]);
        const fit = await verifyLookupTools(this.llm, query, catalog.filter(tool => names.has(tool.name)),
          { signal: run.signal, contextTokens: options.contextTokens });
        if (fit.aborted || run.signal.aborted) { yield { ...this.done(run.signal), warnings: fit.warnings }; return; }
        const prior = selection;
        selection = { ...fit, metrics: { ...fit.metrics, totalMs: (prior?.metrics.totalMs ?? 0) + fit.metrics.totalMs,
          outputTokens: prior?.metrics.outputTokens !== undefined && fit.metrics.outputTokens !== undefined
            ? prior.metrics.outputTokens + fit.metrics.outputTokens : undefined },
          warnings: [...(prior?.warnings ?? []), ...fit.warnings] };
        if (!fit.toolNames.length) realmPath = undefined;
      }
      const requiredReads = realmPath
        ? ['get_realm_info', ...(selection?.toolNames ?? []).filter(name => name !== 'get_realm_info' && name !== 'get_realm_source')]
        : selection && !selection.aborted ? selection.toolNames : [];
      const definition = !realmPath && requiredReads.length === 1 ? catalog.find(tool => tool.name === requiredReads[0]) : undefined;
      const schema = definition && 'jsonSchema' in definition ? definition.jsonSchema : undefined;
      const directRead = schema?.type === 'object' && schema.additionalProperties === false
        && Object.keys(schema.properties ?? {}).length === 0 && !(schema.required?.length)
        && Object.keys(schema).every(key => ['type', 'properties', 'required', 'additionalProperties', 'title', 'description', '$schema'].includes(key))
        ? definition?.name : undefined;
      const completion = { explanation: 'pending' as 'pending' | 'complete' | 'incomplete' };
      const remainingReads = requiredReads.filter(name => name !== directRead && !(realmPath && name === 'get_realm_info'));
      const remaining = this.lookupEvents(intent, settings,
        { ...options, onBalanceReferent: options.account === activeAccount ? options.onBalanceReferent : undefined },
        run, remainingReads, hidden, evidence, selection, completion, realmPath || undefined);
      const failed = { ...this.done(options.signal), metrics: selection?.metrics ?? this.done(options.signal).metrics, warnings: selection?.warnings ?? [] };
      const events = (async function* (): AsyncGenerator<GenerateEvent> {
        let rejectedCall = false;
        try {
          if (directRead && run.canStartStep()) {
            const id = `${run.operationId}:read`;
            const input = {};
            yield { type: 'tool-call', id, name: directRead, input, invalid: false };
            const output = await run.dispatch({ name: directRead, input });
            evidence.observe(directRead, input, output);
            yield { type: 'tool-result', id, name: directRead, output };
          }
          for await (const event of remaining) {
            if (event.type === 'tool-error' || event.type === 'tool-call' && event.invalid) rejectedCall = true;
            yield event;
          }
        } catch (error) {
          if (!ToolChoiceViolationError.isInstance(error) || rejectedCall || options.signal.aborted) throw error;
          yield { type: 'tool-error', id: `${run.operationId}:model`, name: requiredReads[0] ?? 'lookup', error: 'The model did not call the required read tool.' };
          yield failed;
        }
      })();
      yield* guardAnswer(events, () => true, intent,
        { requiredReads, userText: this.userText(settings), evidence, account: options.account, auditFailed: () => run.auditFailed,
          explanationComplete: () => completion.explanation === 'complete' });
    } finally { run.close(); }
  }

  private async *lookupEvents(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: RunOptions,
    run: HarnessRun, requiredReads: readonly string[], hidden: ReadonlySet<string>, evidence: RealmEvidence,
    selection: LookupToolSelection | undefined, completion: { explanation: 'pending' | 'complete' | 'incomplete' },
    realmPath?: string): AsyncGenerator<GenerateEvent> {
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
      if (intent.requests.length === 1 && request.request.kind === 'one' && output.kind === 'result'
        && !run.auditFailed && !run.signal.aborted
        && mentionsIdentifier(this.userText(settings), request.request.asset.value, request.request.asset.kind === 'id')) {
        const result = balanceResultSchema.safeParse(output.value);
        if (result.success && result.data.status === 'complete' && result.data.assets.length === 1) {
          options.onBalanceReferent?.(request.request.asset);
        }
      }
    }
    if (realmPath && run.canStartStep()) {
      const name = 'get_realm_info';
      const input = { path: realmPath };
      const id = `${run.operationId}:realm-index`;
      yield { type: 'tool-call', id, name, input, invalid: false };
      const output = await run.dispatch({ name, input });
      evidence.observe(name, input, output);
      yield { type: 'tool-result', id, name, output };
    }
    if (requiredReads.length && run.canStartStep()) {
      const completed = new Set<string>();
      const loop = this.createLoop(run, settings, options, {
        hideTools: new Set(run.tools.filter(tool => hidden.has(tool.name) || !requiredReads.includes(tool.name)).map(tool => tool.name)),
        evidence: realmPath ? { ...evidence, selected: () => false } : evidence,
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
          if (event.type === 'done') {
            record(event);
            completion.explanation = !event.aborted && event.finishReason === 'stop' ? 'complete' : 'incomplete';
          } else yield event;
        }
      } catch (error) {
        if (options.signal.aborted) throw error;
        completion.explanation = 'incomplete';
        warnings.push(`The requested explanation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (completion.explanation === 'pending') completion.explanation = 'incomplete';
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
    const sdk = createAiSdkRun({ run, maxOutputTokens: settings.maxOutputTokens ?? 512, budget: { kind: 'local' },
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
