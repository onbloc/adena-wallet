import { ToolChoiceViolationError, type ModelMessage } from 'ai';
import { balanceShareEvidence, exactAmountEvidence, fractionEvidence, pairedDecimalAmount } from './amountEvidence';
import { preparationEvidence } from './preparationEvidence';
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
export type ClarificationSlot = 'recipient' | 'asset' | 'amount';
export type PendingClarification = { text: string; slot?: ClarificationSlot };
export type BalanceReferent = Extract<BalanceRequest, { kind: 'one' }>['asset'];
function clarificationSlot(question: string): ClarificationSlot | undefined {
  const slots: ClarificationSlot[] = [];
  if (/\b(?:who|recipient|receiver|spender)\b|받는\s*사람|누구/iu.test(question)) slots.push('recipient');
  if (/\b(?:asset|token|symbol)\b|자산|토큰|심볼/iu.test(question)) slots.push('asset');
  if (/\b(?:amount|quantity|how much|how many)\b|수량|금액|얼마/iu.test(question)) slots.push('amount');
  return slots.length === 1 ? slots[0] : undefined;
}
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
  pendingClarification?: PendingClarification;
  onPreparationClarification?: (userText: string, slot?: ClarificationSlot) => void;
  balanceReferent?: BalanceReferent;
  onBalanceReferent?: (asset: BalanceReferent) => void;
  /** Host-owned, one-turn state from a prior SDK ambiguity; never derived from model text. */
  pendingPreparation?: PendingPreparation;
  onAmbiguousPreparation?: (pending: PendingPreparation) => void;
};
type RunOptions = AgentRunOptions & { account: string; contextTokens: number; signal: AbortSignal };
type AnswerSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { messages: ModelMessage[] };
type DoneEvent = Extract<GenerateEvent, { type: 'done' }>;
const REQUEST_TIMEOUT_MS = 5 * 60_000;

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
    pendingPreparation, onAmbiguousPreparation, pendingClarification, onPreparationClarification, balanceReferent, onBalanceReferent,
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
    let activeOptions: RunOptions | undefined;
    const compact = (count: number) => {
      pendingClarification = undefined;
      balanceReferent = undefined;
      if (activeOptions) {
        activeOptions.pendingClarification = undefined;
        activeOptions.balanceReferent = undefined;
      }
      onContextCompacted?.(count);
    };
    try {
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
      const selected = pendingPreparation?.account === account && pendingPreparation.chainId === this.chainId
        && pendingPreparation.candidateIds.includes(choice) ? choice : undefined;
      const classified = selected || pendingClarification?.slot && isClarificationReply(choice)
        ? { aborted: false as const, intent: { kind: 'prepare' as const }, messages,
          metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 }, warnings: [] as string[] }
        : await classifyRequest(this.llm, settings, { signal: controller.signal, contextTokens, onContextCompacted: compact });
      if (classified.aborted || controller.signal.aborted) {
        yield { ...this.done(controller.signal), warnings: classified.warnings, metrics: { ...classified.metrics, totalMs: Date.now() - started, ttftMs: null } };
        return;
      }
      const options: RunOptions = activeOptions = { account, signal: controller.signal, contextTokens, onContextCompacted: compact, allowTransactionPreparation,
        onAmbiguousPreparation, pendingPreparation: selected ? pendingPreparation : undefined,
        pendingClarification, onPreparationClarification, balanceReferent, onBalanceReferent };
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
      if (options.allowTransactionPreparation && /\d/u.test(text) && /(?:\bg1[a-z0-9]+|주소로|(?:에게|한테|께))/iu.test(text)) {
        options.onPreparationClarification?.(text);
        const question = restatementQuestion(text);
        yield { type: 'text', delta: question };
        yield { ...this.done(options.signal), messages: [{ role: 'assistant', content: question }] };
        return;
      }
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
      let planned: PreparationPlanning | undefined;
      try {
        planned = selected ? undefined : await proposePreparation(this.llm, messages, options);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith('ADENA_PREPARATION_INVALID:')) throw error;
        options.onPreparationClarification?.(this.userText(settings));
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
      const continuation = !selected && !!prior && !!options.pendingClarification?.slot && isClarificationReply(current)
        && (options.pendingClarification!.slot !== 'recipient'
          || !/(?:\b(?:to|for)\s+[\p{L}\p{N}][\p{L}\p{N}._:/-]*|[\p{L}\p{N}._:/-]+(?:에게|한테|께))/iu.test(prior))
        && (options.pendingClarification!.slot === 'asset' || mentionsIdentifier(prior, candidate.asset.value, candidate.asset.kind === 'id'))
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
      const contacts = (await this.wallet.getContacts?.()) ?? [];
      const all = createWalletTools({ sdk: this.wallet, account: options.account, contacts, userText: current,
        authorizedRecipient: selected?.proposal.recipient ?? (continuation
          ? contacts.find(contact => contact.alias.toLowerCase() === proposal.recipient.trim().toLowerCase())?.address ?? proposal.recipient : undefined),
        onTransaction: this.onTransaction });
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
        }, current, options.onPreparationClarification);
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
        if (code === 'unknown_token') {
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

  private async *answerLookups(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: RunOptions): AsyncGenerator<GenerateEvent> {
    const other = intent.requests.find(request => request.target === 'other');
    const walletTools = this.wallet && this.onTransaction && other
      ? Object.fromEntries(Object.entries(createWalletTools({ sdk: this.wallet, account: options.account, contacts: [], userText: this.userText(settings), onTransaction: this.onTransaction })).filter(([, tool]) => tool.effect === 'read')) : {};
    const run = await this.harness.startRun({ account: options.account, chainId: this.chainId, operationId: `lookup-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', walletTools, signal: options.signal });
    try {
      const hidden = new Set([...onblocBalanceAdapter.toolNames, ...this.balanceAdapter.toolNames]);
      const catalog = run.tools.filter(tool => !hidden.has(tool.name));
      const query = other?.query;
      const selection = query ? await selectLookupTools(this.llm, query, catalog, { signal: run.signal, contextTokens: options.contextTokens }) : undefined;
      if (selection?.aborted || run.signal.aborted) { yield { ...this.done(run.signal), warnings: selection?.warnings ?? [] }; return; }
      const evidence = realmEvidence(this.userText(settings), run, query);
      const realmPath = query && catalog.some(tool => tool.name === 'get_realm_info') ? evidence.requestedPath() : undefined;
      const requiredReads = realmPath
        ? ['get_realm_info', ...(selection?.toolNames ?? []).filter(name => name !== 'get_realm_info' && name !== 'get_realm_source')]
        : selection && !selection.aborted ? selection.toolNames : [];
      const definition = !realmPath && requiredReads.length === 1 ? catalog.find(tool => tool.name === requiredReads[0]) : undefined;
      const schema = definition && 'jsonSchema' in definition ? definition.jsonSchema : undefined;
      const directRead = schema?.type === 'object' && schema.additionalProperties === false
        && Object.keys(schema.properties ?? {}).length === 0 && !(schema.required?.length)
        && Object.keys(schema).every(key => ['type', 'properties', 'required', 'additionalProperties', 'title', 'description', '$schema'].includes(key))
        ? definition?.name : undefined;
      const remainingReads = requiredReads.filter(name => name !== directRead && !(realmPath && name === 'get_realm_info'));
      const remaining = this.lookupEvents(intent, settings, options, run, remainingReads, hidden, evidence, selection, realmPath || undefined);
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
        { requiredReads, userText: this.userText(settings), evidence, auditFailed: () => run.auditFailed });
    } finally { run.close(); }
  }

  private async *lookupEvents(intent: Extract<RequestIntent, { kind: 'lookup' }>, settings: AnswerSettings, options: RunOptions,
    run: HarnessRun, requiredReads: readonly string[], hidden: ReadonlySet<string>, evidence: RealmEvidence,
    selection: LookupToolSelection | undefined, realmPath?: string): AsyncGenerator<GenerateEvent> {
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
