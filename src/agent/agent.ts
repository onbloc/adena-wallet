import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { buildWalletPrompt } from './prompts';
import { balanceRequestSchema, balanceToolDefinition, getBalance as readBalance } from './balanceOperation';
import type { BalanceAdapter, BalanceRequest, BalanceResult } from './balanceOperation';
import type { TransactionHandler, WalletSdk } from './wallet/port';
import { createWalletTools } from './wallet/tools';
import type { Harness, WalletTool } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import { onblocBalanceAdapter } from '../harness/mcp/balanceAdapter';
import { estimateContextInput, type GenerateEvent, type GenerateSettings, type LLM, type ToolLoop } from '../llm/core';
import { AgentConversation, type ConversationOptions } from './conversation';

export type AIAgentOptions = {
  llm: LLM;
  /** Bounds each run and brings the read tools (its tool sources, e.g. an MCP server). */
  harness: Harness;
  /** The chain of the accounts. Defaults to Gno mainnet. */
  chainId?: string;
  /** Balance backend; defaults to the Onbloc adapter when its provider tools are present. */
  balanceAdapter?: BalanceAdapter;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | {
      /** Builds unsigned transactions when preparation is enabled for a run. */
      wallet: WalletSdk;
      /** Gets each transaction the agent prepares. The agent signs and sends nothing: the app does. */
      onTransaction: TransactionHandler;
    }
);

export type AgentRunOptions = {
  account?: string;
  signal?: AbortSignal;
  contextTokens?: number;
  /** Permit unsigned transaction preparation for this run; defaults to false. */
  allowTransactionPreparation?: boolean;
  onContextCompacted?: (droppedTurns: number) => void;
};

/**
 * A wallet assistant: an LLM that reads through the harness's tool sources and prepares
 * transactions through a wallet, within the harness's budget, with its answer checked against
 * what the tools returned.
 */
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

  /** Starts an independent account-bound conversation with bounded text history. */
  createConversation(options: ConversationOptions = {}): AgentConversation {
    return new AgentConversation(this, options);
  }

  /**
   * Runs one structured balance query without using a language model. All provider calls share
   * one harness run and its budget, and the result retains partial or ambiguous status.
   */
  async getBalance(
    request: BalanceRequest,
    { account, signal }: { account: string; signal?: AbortSignal }
  ): Promise<BalanceResult> {
    const parsed = balanceRequestSchema.parse(request);
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `balance-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', signal,
    });
    try {
      return await readBalance(run, parsed, { account, chainId: this.chainId, adapter: this.balanceAdapter });
    } finally {
      run.close();
    }
  }

  /**
   * Answers one prompt using a bounded harness run when an account is supplied. Transaction
   * preparation is disabled unless the application explicitly enables it for this run.
   * `settings.tools` are ignored; tools come from the harness and configured wallet.
   */
  async *run(
    settings: GenerateSettings,
    { account, signal, contextTokens = this.llm.contextTokens, onContextCompacted, allowTransactionPreparation = false }: AgentRunOptions = {}
  ): AsyncGenerator<GenerateEvent> {
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) {
      throw new RangeError('contextTokens must be a positive integer within the model context.');
    }
    const { wallet, onTransaction } = this;
    if (!account) {
      if (wallet) throw new TypeError('An agent with a wallet needs the account to act for: run(settings, { account })');
      yield* this.llm.generate({ ...settings, tools: undefined }, { signal, contextTokens, onContextCompacted });
      return;
    }
    const canPrepare = allowTransactionPreparation === true && wallet !== undefined && onTransaction !== undefined;
    const lastMessage = settings.messages?.at(-1);
    const userText = settings.prompt ?? (lastMessage?.role === 'user'
      ? typeof lastMessage.content === 'string' ? lastMessage.content
        : lastMessage.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n')
      : '');
    const contacts = (await wallet?.getContacts?.()) ?? [];
    const walletTools = wallet && onTransaction
      ? createWalletTools({ sdk: wallet, account, contacts, onTransaction })
      : {};
    const { loop, isRead, balanceToolName } = await this.startLoop({
      account,
      walletTools,
      allowTransactionPreparation: canPrepare,
      maxOutputTokens: settings.maxOutputTokens ?? 512,
      signal,
      contextTokens,
      onContextCompacted,
    });
    try {
      const system = settings.system ?? buildWalletPrompt({
        contacts, approvals: wallet?.getAllowances !== undefined, allowTransactionPreparation: canPrepare,
      });
      yield* guardAnswer(
        this.llm.generate({ ...settings, system, tools: undefined }, { signal, loop }),
        isRead,
        balanceToolName,
        userText
      );
    } finally {
      loop.close();
    }
  }

  /**
   * Starts one harness run for both read tools and unsigned wallet preparation.
   */
  private async startLoop({ account, walletTools, maxOutputTokens, signal, contextTokens, onContextCompacted, allowTransactionPreparation }: {
    account: string;
    walletTools: Readonly<Record<string, WalletTool>>;
    maxOutputTokens: number;
    signal?: AbortSignal;
    contextTokens: number;
    onContextCompacted?: (droppedTurns: number) => void;
    allowTransactionPreparation: boolean;
  }): Promise<{ loop: ToolLoop; isRead(toolName: string): boolean; balanceToolName?: string }> {
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `agent-${++this.runs}`,
      scope: allowTransactionPreparation ? 'prepare-wallet' : 'read-only', purpose: 'mainnet-read', walletTools, signal,
    });
    try {
      const adapter = this.balanceAdapter;
      const available = adapter.isAvailable(run.tools);
      const hideTools = new Set([...onblocBalanceAdapter.toolNames, ...adapter.toolNames]);
      if (!available && !run.tools.some(tool => !hideTools.has(tool.name))) {
        throw new Error('No tools are available. Check the account, the chain and the harness tool sources.');
      }
      const operations = available ? [{
        definition: balanceToolDefinition,
        execute: async (input: unknown) => {
          const parsed = balanceRequestSchema.safeParse(input);
          if (!parsed.success) return { kind: 'denied', code: 'INVALID_INPUT' } as const;
          const value = await readBalance(run, parsed.data, { account, chainId: this.chainId, adapter });
          return run.signal.aborted ? { kind: 'denied', code: 'CANCELLED' } as const : { kind: 'result', value } as const;
        },
      }] : [];
      const options = createAiSdkRun({
        run, maxOutputTokens: Math.min(maxOutputTokens, 512), budget: { kind: 'local' },
        contextWindow: contextTokens,
        onContextCompacted,
        estimateInputTokens: ({ instructions, messages, tools }) => estimateContextInput([instructions, messages, tools]),
        hideTools,
        operations,
        onInterrupt: () => run.close(),
      });
      return {
        loop: { options, close: run.close },
        isRead: (toolName) => !Object.hasOwn(walletTools, toolName) || walletTools[toolName].effect === 'read',
        balanceToolName: available ? balanceToolDefinition.name : undefined,
      };
    } catch (error) {
      run.close();
      throw error;
    }
  }
}
