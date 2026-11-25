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
import type { AIAgent, BalanceReferent, PendingClarification } from './agent';

export type ConversationSettings = Omit<GenerateSettings, 'prompt' | 'messages'> & { prompt: string };
export type ConversationOptions = {
  account?: string;
  contextTokens?: number;
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
  private active?: AbortController;
  private pendingClarification?: PendingClarification;
  private balanceReferent?: BalanceReferent;
  private revision = 0;

  constructor(private readonly agent: AIAgent, options: ConversationOptions = {}) {
    this.contextTokens = options.contextTokens ?? agent.llm.contextTokens;
    if (!Number.isSafeInteger(this.contextTokens) || this.contextTokens <= 0 || this.contextTokens > agent.llm.contextTokens) {
      throw new RangeError('Conversation contextTokens must be a positive integer within the model context.');
    }
    if (agent.wallet && !options.account) throw new TypeError('A wallet conversation needs an account.');
    this.account = options.account;
    this.allowTransactionPreparation = options.allowTransactionPreparation === true;
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
    this.pendingClarification = undefined;
    this.balanceReferent = undefined;
    this.active?.abort();
    this.session.reset();
  }

  async *run(
    settings: ConversationSettings,
    { signal }: { signal?: AbortSignal } = {}
  ): AsyncGenerator<GenerateEvent> {
    if (this.active) throw new Error('A conversation already has an active turn.');
    if (!settings.prompt.trim()) throw new TypeError('A conversation prompt must not be empty.');
    const pendingClarification = this.allowTransactionPreparation ? this.pendingClarification : undefined;
    this.pendingClarification = undefined;
    const balanceReferent = this.balanceReferent;
    this.balanceReferent = undefined;
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
    try {
      for await (const event of this.agent.run(
        { ...generation, messages: this.session.messages(prompt) },
        {
          account: this.account,
          signal: controller.signal,
          allowTransactionPreparation: this.allowTransactionPreparation,
          contextTokens: this.contextTokens,
          pendingClarification,
          onPreparationClarification: (text, slot) => { nextClarification = { text, slot }; },
          balanceReferent,
          onBalanceReferent: (asset) => { nextBalanceReferent = asset; },
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
            if (this.allowTransactionPreparation && event.finishReason === 'stop') this.pendingClarification = nextClarification;
            if (event.finishReason === 'stop') this.balanceReferent = nextBalanceReferent;
            if (canRememberTurn(event)) this.session.complete(prompt, answer);
          }
        }
        yield event;
      }
    } finally {
      if (controller.signal.aborted) {
        this.pendingClarification = undefined;
        this.balanceReferent = undefined;
      }
      controller.abort();
      signal?.removeEventListener('abort', abort);
      if (this.active === controller) this.active = undefined;
    }
  }
}
