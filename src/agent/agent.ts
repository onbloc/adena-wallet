import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { buildWalletPrompt } from './prompts';
import { classifyRequest, type RequestIntent } from './requestIntent';
import { AgentConversation, type ConversationOptions } from './conversation';
import type { TransactionHandler, WalletSdk } from './wallet/port';
import { createWalletTools } from './wallet/tools';
import type { Harness, WalletTool } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import { estimateContextInput, GenerateEventType, type GenerateEvent, type GenerateSettings, type LLM, type ToolLoop } from '../llm/core';

function compactHoldings(name: string, output: unknown): unknown {
  if (name !== 'get_token_balances' || !output || typeof output !== 'object' ||
    !('value' in output) || !output.value || typeof output.value !== 'object' ||
    !('untrustedData' in output.value)) return output;
  const data = output.value.untrustedData;
  if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) return output;
  const items = data.items.map(item => item && typeof item === 'object'
    ? { tokenId: item.tokenId, symbol: item.symbol, amount: item.amount, decimals: item.decimals } : item);
  return { ...output, value: { ...output.value, untrustedData: { ...data, items } } };
}

const RUN_TIMEOUT_MS = 5 * 60_000;
const MAX_STEPS = 5;

export type AIAgentOptions = {
  llm: LLM;
  harness: Harness;
  chainId?: string;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | { wallet: WalletSdk; onTransaction: TransactionHandler }
);

export type AgentRunOptions = {
  account?: string;
  signal?: AbortSignal;
  contextTokens?: number;
  onContextCompacted?: (droppedTurns: number) => void;
};

type WalletIntent = Exclude<RequestIntent, { kind: 'explanation' | 'clarification' | 'unsupported' }>;

/** Classifies each wallet request before selecting its tools and required outcomes. */
export class AIAgent {
  readonly llm: LLM;
  readonly harness: Harness;
  readonly wallet?: WalletSdk;
  private readonly onTransaction?: TransactionHandler;
  private readonly chainId: string;
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, chainId = GNO_MAINNET_CHAIN }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.chainId = chainId;
  }

  createConversation(options: ConversationOptions = {}): AgentConversation {
    return new AgentConversation(this, options);
  }

  /** Stateless execution; createConversation owns history. Classification never executes wallet tools. */
  async *run(
    settings: GenerateSettings,
    { account, signal, contextTokens = this.llm.contextTokens, onContextCompacted }: AgentRunOptions = {}
  ): AsyncGenerator<GenerateEvent> {
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) {
      throw new RangeError('contextTokens must be a positive integer within the model context.');
    }
    if (!this.wallet || !this.onTransaction) {
      yield* this.llm.generate(settings, { signal, contextTokens, onContextCompacted });
      return;
    }
    if (!account) throw new TypeError('An agent with a wallet needs the account to act for: run(settings, { account })');

    const started = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    const timeout = setTimeout(() => controller.abort(new Error('Wallet request timed out.')), RUN_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let firstVisibleAt: number | undefined;
    try {
      const classified = await classifyRequest(this.llm, settings, {
        signal: controller.signal, contextTokens, onContextCompacted,
      });
      if (classified.aborted || controller.signal.aborted) {
        yield {
          type: GenerateEventType.Done, aborted: true, warnings: classified.warnings, messages: [],
          metrics: { ...classified.metrics, totalMs: Date.now() - started, ttftMs: null, tokensPerSec: undefined },
        };
        return;
      }
      const answerSettings: GenerateSettings = { ...settings, prompt: undefined, messages: classified.messages };
      const events = this.answerRequest(classified.intent, answerSettings, {
        account, signal: controller.signal, contextTokens, onContextCompacted,
      });
      for await (const event of events) {
        if (firstVisibleAt === undefined && (event.type === GenerateEventType.Text ||
          event.type === GenerateEventType.Reasoning || event.type === GenerateEventType.ToolCall)) firstVisibleAt = Date.now();
        if (event.type === GenerateEventType.Done) {
          const outputTokens = classified.metrics.outputTokens !== undefined && event.metrics.outputTokens !== undefined
            ? classified.metrics.outputTokens + event.metrics.outputTokens : undefined;
          yield {
            ...event,
            warnings: [...classified.warnings, ...event.warnings],
            metrics: {
              ...event.metrics, totalMs: Date.now() - started,
              ttftMs: firstVisibleAt === undefined ? null : firstVisibleAt - started,
              outputTokens, tokensPerSec: undefined,
            },
          };
        } else yield event;
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      yield {
        type: GenerateEventType.Done, aborted: true, warnings: [], messages: [],
        metrics: { totalMs: Date.now() - started, ttftMs: firstVisibleAt === undefined ? null : firstVisibleAt - started },
      };
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }

  private async *answerRequest(
    intent: RequestIntent,
    settings: GenerateSettings,
    options: AgentRunOptions & { account: string; contextTokens: number }
  ): AsyncGenerator<GenerateEvent> {
    if (intent.kind === 'unsupported') {
      yield { type: GenerateEventType.Text, delta: 'I can help with wallet explanations, wallet lookups, and unsigned transfers or approvals.' };
      yield {
        type: GenerateEventType.Done, aborted: false, finishReason: 'stop', warnings: [], messages: [],
        metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 },
      };
      return;
    }
    if (intent.kind === 'explanation' || intent.kind === 'clarification') {
      yield* guardAnswer(this.llm.generate({
        ...settings, tools: undefined, outputSchema: undefined,
        system: [
          settings.system ?? buildWalletPrompt({ contacts: [], approvals: this.wallet?.getAllowances !== undefined }),
          intent.kind === 'explanation'
            ? 'This turn asks for an explanation, not current wallet data. Answer directly without tools.'
            : 'This turn is missing transaction details. Ask a concise clarification question; do not prepare a transaction.',
        ].join('\n\n'),
      }, options), () => true, intent);
      return;
    }
    if (intent.kind === 'lookup' && intent.target !== 'other') {
      yield* guardAnswer(this.lookupBalances(intent, options), () => true, intent);
      return;
    }

    const wallet = this.wallet;
    const onTransaction = this.onTransaction;
    if (!wallet || !onTransaction) throw new Error('Wallet execution is unavailable.');
    const contacts = (await wallet.getContacts?.()) ?? [];
    const all = createWalletTools({ sdk: wallet, account: options.account, contacts, onTransaction });
    if (intent.kind === 'prepare' && !Object.hasOwn(all, intent.action)) {
      yield { type: GenerateEventType.Text, delta: `The wallet does not support the requested ${intent.action} operation. No transaction was prepared.` };
      yield {
        type: GenerateEventType.Done, aborted: false, finishReason: 'stop', warnings: [], messages: [],
        metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 },
      };
      return;
    }
    const walletTools = Object.fromEntries(Object.entries(all).filter(([name, tool]) =>
      tool.effect === 'read' || (intent.kind === 'prepare' && name === intent.action)));
    const { loop, isRead } = await this.startLoop({
      ...options, walletTools, intent, maxOutputTokens: settings.maxOutputTokens ?? 512,
    });
    try {
      yield* guardAnswer(this.llm.generate({
        ...settings, tools: undefined, outputSchema: undefined,
        system: [
          settings.system ?? buildWalletPrompt({ contacts, approvals: wallet.getAllowances !== undefined }),
          intent.kind === 'prepare'
            ? `This turn requests ${intent.action}. Prepare it with the ${intent.action} tool; reads alone do not complete the request. Do not substitute another action.`
            : 'This turn requires a fresh wallet lookup. Use the read-only tools; a remembered answer is not current data.',
        ].join('\n\n'),
      }, { ...options, loop }), isRead, intent);
    } finally {
      loop.close();
    }
  }

  private async *lookupBalances(
    intent: Extract<RequestIntent, { kind: 'lookup' }>,
    { account, signal, contextTokens }: AgentRunOptions & { account: string; contextTokens: number }
  ): AsyncGenerator<GenerateEvent> {
    const names = intent.target === 'portfolio' ? ['get_native_balance', 'get_token_balances']
      : [intent.target === 'native_balance' ? 'get_native_balance' : 'get_token_balances'];
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `lookup-${++this.runs}`, scope: 'read-only', purpose: 'mainnet-read', signal,
      budget: { maxToolCalls: names.length, maxTokens: 2 * contextTokens, timeoutMs: RUN_TIMEOUT_MS },
    });
    try {
      for (const name of names) {
        if (run.signal.aborted) break;
        const id = `${run.operationId}:${name}`;
        yield { type: GenerateEventType.ToolCall, id, name, input: {}, invalid: false };
        const output = await run.dispatch({ name, input: {} });
        yield { type: GenerateEventType.ToolResult, id, name, output };
      }
      yield {
        type: GenerateEventType.Done, aborted: run.signal.aborted, finishReason: 'stop', warnings: [], messages: [],
        metrics: { totalMs: 0, ttftMs: null, outputTokens: 0 },
      };
    } finally {
      run.close();
    }
  }

  private async startLoop({ account, walletTools, intent, maxOutputTokens, signal, contextTokens, onContextCompacted }: {
    account: string;
    walletTools: Readonly<Record<string, WalletTool>>;
    intent: WalletIntent;
    maxOutputTokens: number;
    signal?: AbortSignal;
    contextTokens: number;
    onContextCompacted?: (droppedTurns: number) => void;
  }): Promise<{ loop: ToolLoop; isRead(toolName: string): boolean }> {
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `agent-${++this.runs}`,
      scope: intent.kind === 'prepare' ? 'prepare-wallet' : 'read-only', purpose: 'mainnet-read', walletTools, signal,
      budget: { maxSteps: MAX_STEPS, maxToolCalls: MAX_STEPS - 1, maxTokens: 2 * contextTokens, timeoutMs: RUN_TIMEOUT_MS },
    });
    if (!run.tools.some(tool => !Object.hasOwn(walletTools, tool.name))) {
      run.close();
      throw new Error('No read tools are available. Check the account, the chain and the harness tool sources.');
    }
    const options = createAiSdkRun({
      run, maxOutputTokens: Math.min(maxOutputTokens, 512), budget: { kind: 'local' },
      contextWindow: contextTokens, onContextCompacted,
      estimateInputTokens: ({ instructions, messages, tools }) => estimateContextInput([instructions, messages, tools]),
      projectResult: compactHoldings, onInterrupt: () => run.close(),
    });
    return {
      loop: { options, close: run.close },
      isRead: (name) => !Object.hasOwn(walletTools, name) || walletTools[name].effect === 'read',
    };
  }
}
