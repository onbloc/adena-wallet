import type { AIAgent, GenerateEvent as AgentEvent, PreparedTransaction, WalletOperationOptions } from 'adena-ai-llm-poc';
import type { ChatSession, LLM } from 'adena-ai-llm-poc/llm';
import type { LLMOnDevice } from 'adena-ai-llm-poc/llm/device';

import { getAiNetworkConfig } from '../config/ai';
import { toErrorMessage } from '../core/error-message';
import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import {
  AiChatTurn,
  AiConfig,
  AiConfigInput,
  AiLocalModel,
  AiLocalModelStatus,
  AiRunEvent,
  AiTransferDraft,
} from '../domain/ai';
import { Network } from '../domain/network';
import { AiLibrary, AiLibraryLoader, loadAiLibrary } from '../infrastructure/ai/ai-library';
import { streamingFetch } from '../infrastructure/ai/streaming-fetch';
import { AiChatRepository, AiChatScope } from '../repositories/ai-chat.repository';
import { AiProvider, AiSettingsRepository } from '../repositories/ai-settings.repository';
import { AccountService } from './account.service';
import { AiWalletService } from './ai-wallet.service';
import { AccountScopedData } from './wallet.service';

const TURN_TIMEOUT_MS = 5 * 60_000;

// A conversation and the agent continuing it. The agent is rebuilt when the model, key or account data changes.
interface Conversation {
  session: ChatSession;
  agent?: AIAgent;
  llm?: LLM;
  // Drafts the running turn prepared, drained into the event stream in order.
  drafts: AiTransferDraft[];
  active?: ActiveRun;
}

const scopeKey = ({ networkId, accountId }: AiChatScope): string => JSON.stringify([networkId, accountId]);

interface ActiveRun {
  accountId: string;
  controller: AbortController;
}

// Reads the selected supported Gno network and prepares transfers for user review.
export class AiAssistantService implements AccountScopedData {
  private readonly conversations = new Map<string, Conversation>();
  private localModel: Promise<LLMOnDevice> | undefined;
  private readonly activeRuns = new Map<string, ActiveRun>();
  private readonly removedAccounts = new Set<string>();
  private readonly revisions = new Map<string, number>();
  private llmCache?: { model: string; apiKey: string; llm: LLM };

  constructor(
    private readonly settings: AiSettingsRepository,
    private readonly chats: AiChatRepository,
    private readonly wallet: AiWalletService,
    private readonly accountService: AccountService,
    private readonly loadLibrary: AiLibraryLoader = loadAiLibrary,
    private readonly fetchImpl: typeof fetch = streamingFetch,
  ) {}

  isSupported(network: Network): boolean {
    return getAiNetworkConfig(network) !== undefined;
  }

  async getConfig(): Promise<AiConfig> {
    const { provider, model } = this.settings.get();
    const library = await this.loadLibrary();
    const models = library.remote.OPENAI_MODELS
      .filter(item => item.status === 'active' && item.access === 'public')
      .map(item => ({ id: item.id, name: item.name }));

    return { provider, model, hasApiKey: Boolean(await this.settings.getApiKey()), models };
  }

  async saveConfig(input: AiConfigInput): Promise<void> {
    const current = this.settings.get();
    const model = input.model?.trim() || current.model;

    if (model !== current.model) {
      // Refuses models the agent cannot run on (no streaming, tools or structured output).
      try {
        (await this.loadLibrary()).remote.resolveOpenAIModel(model);
      }
      catch (error) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, toErrorMessage(error), { cause: error });
      }
    }

    if (input.apiKey !== undefined && input.apiKey !== null && input.apiKey.trim() === '') {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Enter an API key');
    }

    // Do not publish new preferences if writing the credential fails.

    if (input.apiKey !== undefined) {
      await this.settings.saveApiKey(input.apiKey === null ? null : input.apiKey.trim());
    }

    this.settings.save({ provider: input.provider ?? current.provider, model });
    this.clearAllPending();
    this.llmCache = undefined;
    this.conversations.forEach((conversation) => {
      conversation.agent = undefined;
      conversation.llm = undefined;
    });
  }

  async getLocalModel(): Promise<AiLocalModel> {
    const model = await this.ensureLocalModel();

    return {
      getStatus: (): AiLocalModelStatus => {
        const status = model.status;

        switch (status.state) {
          case 'downloading':
            return { state: 'downloading', percentage: status.percentage };
          case 'error':
            return { state: 'error', message: status.message };
          default:
            return { state: status.state };
        }
      },
      subscribe: model.subscribe,
      load: () => model.load(),
      unload: () => model.unload(),
      remove: () => model.remove(),
    };
  }

  // The retained turns of a conversation, oldest first.
  async getTurns(scope: AiChatScope): Promise<AiChatTurn[]> {
    const revision = this.revisions.get(scopeKey(scope));
    const library = await this.loadLibrary();

    if (this.removedAccounts.has(scope.accountId) || revision !== this.revisions.get(scopeKey(scope))) {
      return [];
    }

    return this.conversationFor(scope, library).session.turns.map(turn => ({ prompt: turn.prompt, answer: turn.answer }));
  }

  async* run(input: { prompt: string; account: Account; network: Network; signal?: AbortSignal }): AsyncGenerator<AiRunEvent> {
    const { prompt, account, network, signal } = input;

    if (!getAiNetworkConfig(network)) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'The assistant is only available on built-in Gno Mainnet and Onyx');
    }

    const scope = { networkId: network.id, accountId: account.id };
    const key = scopeKey(scope);

    if (this.activeRuns.has(key)) {
      this.clearPending(scope);
    }

    const active: ActiveRun = { accountId: account.id, controller: new AbortController() };
    const onAbort = (): void => {
      active.controller.abort();

      if (this.activeRuns.get(key) === active) {
        this.clearPending(scope);
      }
    };

    this.activeRuns.set(key, active);
    signal?.addEventListener('abort', onAbort, { once: true });

    if (signal?.aborted || this.removedAccounts.has(account.id)) {
      onAbort();
    }

    const isCurrent = (): boolean => !active.controller.signal.aborted && this.activeRuns.get(key) === active;
    let conversation: Conversation | undefined;
    let completed = false;

    try {
      if (!isCurrent()) {
        yield { type: 'done', aborted: true, warnings: [] };
        return;
      }

      const library = await this.loadLibrary();

      if (!isCurrent()) {
        yield { type: 'done', aborted: true, warnings: [] };
        return;
      }

      conversation = this.conversationFor(scope, library);
      conversation.active = active;
      const agent = await this.agentFor(conversation, library, account, network, isCurrent);

      if (!isCurrent()) {
        yield { type: 'done', aborted: true, warnings: [] };
        return;
      }

      const address = this.accountService.getAddress(account, network);

      for await (const event of agent.run({ prompt }, { account: address, signal: active.controller.signal, allowTransactionPreparation: true })) {
        if (!isCurrent()) {
          break;
        }

        yield* this.drainDrafts(conversation, isCurrent);

        if (!isCurrent()) {
          break;
        }

        const mapped = this.mapEvent(event);

        if (mapped) {
          if (mapped.type === 'done') {
            completed = !mapped.aborted;
          }

          yield mapped;
        }
      }

      if (!isCurrent()) {
        yield { type: 'done', aborted: true, warnings: [] };
      }
      else {
        yield* this.drainDrafts(conversation, isCurrent);
      }
    }
    catch (error) {
      if (!isCurrent()) {
        yield { type: 'done', aborted: true, warnings: [] };
      }
      else {
        yield { type: 'error', message: toErrorMessage(error) };
      }
    }
    finally {
      signal?.removeEventListener('abort', onAbort);
      const snapshot = isCurrent() && completed && conversation && this.conversations.get(key) === conversation
        ? conversation.session.serialize()
        : undefined;

      if (conversation?.active === active) {
        if (!completed) {
          conversation.agent?.clearPending();
        }

        conversation.drafts.splice(0);
        conversation.active = undefined;
      }

      active.controller.abort();

      if (this.activeRuns.get(key) === active) {
        this.activeRuns.delete(key);
      }

      if (snapshot !== undefined) {
        this.chats.save(scope, snapshot);
      }
    }
  }

  // Backgrounding or a lock must not leave a half-answered question that could be confirmed later.
  clearPending(scope: AiChatScope): void {
    const key = scopeKey(scope);

    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
    const active = this.activeRuns.get(key);

    active?.controller.abort();
    this.activeRuns.delete(key);
    const conversation = this.conversations.get(key);

    conversation?.agent?.clearPending();
    conversation?.drafts.splice(0);

    // A canceled provider may finish late; never reuse its mutable session.
    if (active) {
      this.conversations.delete(key);
    }
  }

  clearAllPending(): void {
    for (const key of this.activeRuns.keys()) {
      const [networkId, accountId] = JSON.parse(key) as [string, string];

      this.clearPending({ networkId, accountId });
    }

    this.conversations.forEach((conversation) => {
      conversation.agent?.clearPending();
      conversation.drafts.splice(0);
    });
  }

  reset(scope: AiChatScope): void {
    this.clearPending(scope);
    const conversation = this.conversations.get(scopeKey(scope));

    conversation?.agent?.reset();
    conversation?.session.reset();
    this.conversations.delete(scopeKey(scope));
    this.chats.clear(scope);
  }

  removeAccount(accountId: string): void {
    this.removedAccounts.add(accountId);

    for (const [key, active] of this.activeRuns) {
      if (active.accountId === accountId) {
        active.controller.abort();
        this.activeRuns.delete(key);
      }
    }

    for (const [key, conversation] of this.conversations) {
      if ((JSON.parse(key) as [string, string])[1] === accountId) {
        conversation.agent?.reset();
        this.conversations.delete(key);
      }
    }

    this.chats.removeAccount(accountId);
  }

  private async ensureLocalModel(): Promise<LLMOnDevice> {
    this.localModel ??= this.loadLibrary().then(library => library.device.createLLM({ kind: 'local' })).catch((error: unknown) => {
      this.localModel = undefined;
      throw error;
    });

    return this.localModel;
  }

  private conversationFor(scope: AiChatScope, library: AiLibrary): Conversation {
    const key = scopeKey(scope);
    const existing = this.conversations.get(key);

    if (existing) {
      return existing;
    }

    const conversation: Conversation = {
      session: library.llm.createChatSession(this.chats.load(scope)),
      drafts: [],
    };

    this.conversations.set(key, conversation);
    return conversation;
  }

  private async createLlm(library: AiLibrary, isCurrent: () => boolean): Promise<LLM> {
    const { provider, model } = this.settings.get();

    if (provider === AiProvider.LOCAL) {
      const local = await this.ensureLocalModel();

      if (!isCurrent()) {
        throw new Error('The operation was aborted');
      }

      if (local.status.state !== 'ready') {
        throw new AppError(AppErrorCode.AI_NOT_CONFIGURED, 'Load the on-device model first');
      }

      return local;
    }

    const apiKey = await this.settings.getApiKey();

    if (!isCurrent()) {
      throw new Error('The operation was aborted');
    }

    if (!apiKey) {
      throw new AppError(AppErrorCode.AI_NOT_CONFIGURED, 'Add an OpenAI API key first');
    }

    if (this.llmCache?.model === model && this.llmCache.apiKey === apiKey) {
      return this.llmCache.llm;
    }

    const llm = library.remote.createLLMRemote({ apiKey, model, fetch: this.fetchImpl });

    this.llmCache = { model, apiKey, llm };
    return llm;
  }

  private async agentFor(conversation: Conversation, library: AiLibrary, account: Account, network: Network, isCurrent: () => boolean): Promise<AIAgent> {
    const config = getAiNetworkConfig(network);

    if (!config) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'The assistant is only available on built-in Gno Mainnet and Onyx');
    }

    const llm = await this.createLlm(library, isCurrent);

    if (!isCurrent()) {
      throw new Error('The operation was aborted');
    }

    if (conversation.agent && conversation.llm === llm) {
      return conversation.agent;
    }

    // Switching models keeps the visible history; pending clarifications are dropped by design.
    conversation.agent?.clearPending();

    const harness = new library.harness.Harness({
      toolSources: [library.onbloc.createOnblocToolSource({ endpoint: config.mcpEndpoint, chainId: network.chainId, fetcher: this.fetchImpl })],
      budget: { ...library.harness.DEFAULT_BUDGET, maxTokens: 2 * llm.contextTokens, timeoutMs: TURN_TIMEOUT_MS },
    });
    const wallet = this.wallet.createSdk(library, account, network);
    const tokenSymbols = await this.wallet.getTokenSymbols(account, network);

    if (!isCurrent()) {
      throw new Error('The operation was aborted');
    }

    const agent = new library.agent.AIAgent({
      chainId: network.chainId,
      llm,
      harness,
      wallet,
      onTransaction: (prepared: PreparedTransaction, options?: WalletOperationOptions): void => {
        if (conversation.active && !conversation.active.controller.signal.aborted && !options?.signal.aborted) {
          conversation.drafts.push(prepared.tx as AiTransferDraft);
        }
      },
      session: conversation.session,
      tokenSymbols,
    });

    conversation.agent = agent;
    conversation.llm = llm;
    return agent;
  }

  private* drainDrafts(conversation: Conversation, isCurrent: () => boolean): Generator<AiRunEvent> {
    while (isCurrent() && conversation.drafts.length > 0) {
      yield { type: 'draft', draft: conversation.drafts.shift() as AiTransferDraft };
    }
  }

  private mapEvent(event: AgentEvent): AiRunEvent | null {
    switch (event.type) {
      case 'text':
        return { type: 'text', delta: event.delta };
      case 'tool-call':
        return event.invalid
          ? { type: 'tool', id: event.id, name: event.name, status: 'error', detail: event.error }
          : { type: 'tool', id: event.id, name: event.name, status: 'running' };
      case 'tool-result': {
        const output = event.output as { kind?: string; code?: string; value?: { status?: string } } | undefined;
        const failed = output?.kind === 'denied' || output?.value?.status === 'error';

        return { type: 'tool', id: event.id, name: event.name, status: failed ? 'error' : 'done', detail: output?.code };
      }

      case 'tool-error':
        return { type: 'tool', id: event.id, name: event.name, status: 'error', detail: event.error };
      case 'done':
        return { type: 'done', aborted: event.aborted, warnings: event.warnings };
      default:
        return null;
    }
  }
}
