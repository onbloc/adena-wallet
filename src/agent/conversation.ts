import type { ModelMessage } from 'ai';

import {
  canRememberTurn,
  createChatSession,
  DEFAULT_GENERATE_SETTINGS,
  estimateContextInput,
  GenerateEventType,
  type ChatSession,
  type GenerateEvent,
  type GenerateSettings,
} from '../llm/core';
import type { AIAgent, BalanceReferent, PendingClarification, PendingPreparation } from './agent';

/** Ephemeral, one-shot clarification state. Never serialize or share across wallet scopes. */
export type ConversationPendingState = Readonly<{ clear(): void }>;
const pendingStates = new WeakMap<ConversationPendingState, {
  revision: number;
  pending?: PendingPreparation;
  clarification?: { value: PendingClarification; account?: string; agent: AIAgent };
  balance?: { value: BalanceReferent; account?: string; agent: AIAgent };
}>();

export function createConversationPendingState(): ConversationPendingState {
  const state: ConversationPendingState = Object.freeze({
    clear() {
      const entry = pendingStates.get(state)!;
      entry.revision++;
      entry.pending = undefined;
      entry.clarification = undefined;
      entry.balance = undefined;
    },
  });
  pendingStates.set(state, { revision: 0 });
  return state;
}

export type ConversationSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { prompt: string };
export type ConversationOptions = {
  account?: string;
  contextTokens?: number;
  /** A host may retain this only for the lifetime of the same account and network scope. */
  pendingState?: ConversationPendingState;
  /** Permit unsigned transaction preparation for each turn; defaults to false. */
  allowTransactionPreparation?: boolean;
} & (
  | { saved?: string | null; session?: undefined }
  | { session: ChatSession; saved?: undefined }
);

/** One scoped conversation. Only text turns survive; tool calls and transactions never replay. */
export class AgentConversation {
  readonly contextTokens: number;
  private readonly session: ChatSession;
  private readonly account?: string;
  private readonly allowTransactionPreparation: boolean;
  private readonly pendingState: ConversationPendingState;
  private active?: AbortController;
  private revision = 0;

  constructor(private readonly agent: AIAgent, options: ConversationOptions = {}) {
    this.contextTokens = options.contextTokens ?? agent.llm.contextTokens;
    if (!Number.isSafeInteger(this.contextTokens) || this.contextTokens <= 0 || this.contextTokens > agent.llm.contextTokens) {
      throw new RangeError('Conversation contextTokens must be a positive integer within the model context.');
    }
    if (agent.wallet && !options.account) throw new TypeError('A wallet conversation needs an account.');
    this.account = options.account;
    this.allowTransactionPreparation = options.allowTransactionPreparation === true;
    this.pendingState = options.pendingState ?? createConversationPendingState();
    if (!pendingStates.has(this.pendingState)) throw new TypeError('Invalid conversation pending state.');
    this.session = options.session ?? createChatSession(options.saved);
  }

  get turns() {
    return this.session.turns;
  }

  serialize(): string {
    return this.session.serialize();
  }

  reset(): void {
    this.revision++;
    this.pendingState.clear();
    this.active?.abort();
    this.session.reset();
  }

  async *run(
    settings: ConversationSettings,
    { signal }: { signal?: AbortSignal } = {}
  ): AsyncGenerator<GenerateEvent> {
    if (this.active) throw new Error('A conversation already has an active turn.');
    const entry = pendingStates.get(this.pendingState)!;
    const clarification = entry.clarification;
    const pendingClarification = this.allowTransactionPreparation && clarification && clarification.account === this.account &&
      clarification.agent === this.agent ? clarification.value : undefined;
    const pendingPreparation = this.allowTransactionPreparation && entry.pending?.candidateIds.includes(settings.prompt.trim())
      ? entry.pending : undefined;
    const balance = entry.balance;
    const balanceReferent = balance && balance.account === this.account && balance.agent === this.agent
      ? balance.value : undefined;
    this.pendingState.clear();
    const pendingRevision = entry.revision;
    if (!settings.prompt.trim()) throw new TypeError('A conversation prompt must not be empty.');
    const outputTokens = settings.maxOutputTokens ?? DEFAULT_GENERATE_SETTINGS.maxOutputTokens;
    if (!Number.isSafeInteger(outputTokens) || outputTokens <= 0) throw new RangeError('maxOutputTokens must be a positive integer.');
    const reservedOutput = this.account ? Math.min(outputTokens, 512) : outputTokens;
    const current: ModelMessage[] = [{ role: 'user', content: settings.prompt }];
    // Reject an oversized current request unchanged, before discovery or wallet access.
    if (estimateContextInput([settings.system, current]) + reservedOutput > this.contextTokens) {
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
    let completed = false;
    let nextClarification: PendingClarification | undefined;
    let nextBalanceReferent: BalanceReferent | undefined;
    let nextPending: PendingPreparation | undefined;
    try {
      for await (const event of this.agent.run(
        { ...generation, messages: this.session.messages(prompt) },
        {
          account: this.account,
          signal: controller.signal,
          allowTransactionPreparation: this.allowTransactionPreparation,
          contextTokens: this.contextTokens,
          pendingPreparation,
          pendingClarification,
          onPreparationClarification: (text, slot) => { nextClarification = { text, slot }; },
          balanceReferent,
          onBalanceReferent: (asset) => { nextBalanceReferent = asset; },
          onAmbiguousPreparation: (pending) => { nextPending = pending; },
          onContextCompacted: (count) => {
            if (revision !== this.revision || controller.signal.aborted) return;
            nextClarification = undefined;
            nextBalanceReferent = undefined;
            this.session.trimOldest(count);
          },
        }
      )) {
        if (event.type === GenerateEventType.Text) answer += event.delta;
        if (event.type === GenerateEventType.Done && !completed) {
          completed = true;
          if (revision === this.revision && !controller.signal.aborted && !event.aborted) {
            if (this.allowTransactionPreparation && entry.revision === pendingRevision && event.finishReason === 'stop' && nextClarification) {
              entry.clarification = { value: nextClarification, account: this.account, agent: this.agent };
            }
            if (this.allowTransactionPreparation && entry.revision === pendingRevision && event.finishReason === 'stop') {
              entry.pending = nextPending;
            }
            if (entry.revision === pendingRevision && event.finishReason === 'stop' && nextBalanceReferent) {
              entry.balance = { value: nextBalanceReferent, account: this.account, agent: this.agent };
            }
            if (canRememberTurn(event)) this.session.complete(prompt, answer);
          }
        }
        yield event;
      }
    } finally {
      if (controller.signal.aborted && entry.revision === pendingRevision) this.pendingState.clear();
      controller.abort();
      signal?.removeEventListener('abort', abort);
      if (this.active === controller) this.active = undefined;
    }
  }
}
