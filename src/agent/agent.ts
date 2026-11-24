import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { buildWalletPrompt } from './prompts';
import { formatOnblocBalance, requestedBalanceSymbol } from './onblocBalances';
import type { TransactionHandler, WalletSdk } from './wallet/port';
import { createWalletTools } from './wallet/tools';
import type { Harness, WalletTool } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import { estimateContextInput, type GenerateEvent, type GenerateSettings, type LLM, type ToolLoop } from '../llm/core';
import { AgentConversation, type ConversationOptions } from './conversation';

function compactHoldings(name: string, output: unknown): unknown {
  if (name !== 'get_token_balances' || !output || typeof output !== 'object' ||
    !('value' in output) || !output.value || typeof output.value !== 'object' ||
    !('untrustedData' in output.value)) return output;
  const data = output.value.untrustedData;
  if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) return output;
  // Keep exact amounts and token identity. The full validated response stays in the tool log.
  const items = data.items.map(item => item && typeof item === 'object'
    ? { tokenId: item.tokenId, symbol: item.symbol, amount: item.amount, decimals: item.decimals } : item);
  return { ...output, value: { ...output.value, untrustedData: { ...data, items } } };
}

// An on-device model is slow: the whole run, tool calls included, is bounded by this.
const RUN_TIMEOUT_MS = 5 * 60_000;
// Max model calls per run with wallet tools (e.g. a balance read -> transfer -> answer).
const MAX_STEPS = 5;
  

export type AIAgentOptions = {
  llm: LLM;
  /** Bounds each run and brings the read tools (its tool sources, e.g. an MCP server). */
  harness: Harness;
  /** The chain of the accounts. Defaults to Gno mainnet. */
  chainId?: string;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | {
      /** Builds the transactions the agent prepares. Without one the agent is the LLM alone. */
      wallet: WalletSdk;
      /** Gets each transaction the agent prepares. The agent signs and sends nothing: the app does. */
      onTransaction: TransactionHandler;
    }
);

export type AgentRunOptions = {
  account?: string;
  signal?: AbortSignal;
  contextTokens?: number;
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
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, chainId = GNO_MAINNET_CHAIN }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.chainId = chainId;
  }

  /** Starts an independent account-bound conversation with bounded text history. */
  createConversation(options: ConversationOptions = {}): AgentConversation {
    return new AgentConversation(this, options);
  }

  /**
   * Answers one prompt or conversation. Same events as `llm.generate`; with a wallet the text is
   * held back until the answer is vetted (see `guardAnswer`). `settings.tools` are ignored: the
   * tools are the wallet's and the harness's. Use this, not `agent.llm.generate`, to stay bounded.
   *
   * With a wallet, `account` is required: the address the run acts for. The app picks it for each
   * run (a wallet holds many accounts and the user switches between them). It is whose holdings
   * the tools read and the `from` of every transaction; the model never chooses it. A run keeps
   * the account it started with.
   */
  async *run(
    settings: GenerateSettings,
    { account, signal, contextTokens = this.llm.contextTokens, onContextCompacted }: AgentRunOptions = {}
  ): AsyncGenerator<GenerateEvent> {
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0 || contextTokens > this.llm.contextTokens) {
      throw new RangeError('contextTokens must be a positive integer within the model context.');
    }
    const { wallet, onTransaction } = this;
    if (!wallet || !onTransaction) {
      yield* this.llm.generate(settings, { signal, contextTokens, onContextCompacted });
      return;
    }
    if (!account) throw new TypeError('An agent with a wallet needs the account to act for: run(settings, { account })');
    const last = settings.messages?.at(-1);
    const question = settings.prompt ?? (last?.role === 'user' && typeof last.content === 'string' ? last.content : '');
    const symbol = requestedBalanceSymbol(question);
    const portfolio = /^(?:(?:show(?: me)?|list) (?:all )?my (?:assets|holdings|balances)|(?:내\s*)?(?:모든|전체)\s*(?:자산|잔액)(?:을)?\s*(?:보여\s*줘|알려\s*줘)?)[.!?]?$/i.test(question.trim());
    if (symbol || portfolio) {
      const started = Date.now();
      const run = await this.harness.startRun({ account, chainId: this.chainId, operationId: `balance-${++this.runs}`,
        scope: 'read-only', purpose: 'mainnet-read', signal, budget: { maxToolCalls: portfolio ? 2 : 1, timeoutMs: RUN_TIMEOUT_MS } });
      try {
        const names = portfolio ? ['get_native_balance', 'get_token_balances']
          : [symbol?.toUpperCase() === 'GNOT' ? 'get_native_balance' : 'get_token_balances'];
        const sections: string[] = [];
        let complete = true;
        for (const name of names) {
          if (run.signal.aborted) break;
          const id = `${run.operationId}:${name}`;
          yield { type: 'tool-call', id, name, input: {}, invalid: false };
          const output = await run.dispatch({ name, input: {} });
          yield { type: 'tool-result', id, name, output };
          const answer = formatOnblocBalance(name, output, symbol);
          if (answer === undefined) complete = false;
          sections.push(answer ?? `Could not verify ${symbol ?? (name === 'get_native_balance' ? 'GNOT' : 'GRC20')} balances.`);
        }
        if (!run.signal.aborted) yield { type: 'text', delta: sections.join('\n\n') };
        yield { type: 'done', aborted: run.signal.aborted, verifiedAnswer: complete && !run.signal.aborted ? true : undefined,
          warnings: [], messages: [], metrics: { totalMs: Date.now() - started, ttftMs: null } };
      } finally {
        run.close();
      }
      return;
    }
    const contacts = (await wallet.getContacts?.()) ?? [];
    const walletTools = createWalletTools({ sdk: wallet, account, contacts, onTransaction });
    const { loop, isRead } = await this.startLoop({
      account,
      walletTools,
      maxOutputTokens: settings.maxOutputTokens ?? 512,
      signal,
      contextTokens,
      onContextCompacted,
    });
    try {
      const system = settings.system ?? buildWalletPrompt({ contacts, approvals: wallet.getAllowances !== undefined });
      yield* guardAnswer(
        this.llm.generate({ ...settings, system, tools: undefined }, { signal, loop }),
        isRead
      );
    } finally {
      loop.close();
    }
  }

  /**
   * Starts one harness run for both read tools and unsigned wallet preparation.
   */
  private async startLoop({ account, walletTools, maxOutputTokens, signal, contextTokens, onContextCompacted }: {
    account: string;
    walletTools: Readonly<Record<string, WalletTool>>;
    maxOutputTokens: number;
    signal?: AbortSignal;
    contextTokens: number;
    onContextCompacted?: (droppedTurns: number) => void;
  }): Promise<{ loop: ToolLoop; isRead(toolName: string): boolean }> {
    const totalTokens = 2 * contextTokens;
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `agent-${++this.runs}`,
      scope: 'prepare-wallet', purpose: 'mainnet-read', walletTools, signal,
      budget: { maxSteps: MAX_STEPS, maxToolCalls: MAX_STEPS - 1, maxTokens: totalTokens, timeoutMs: RUN_TIMEOUT_MS },
    });
    if (!run.tools.some(tool => !Object.hasOwn(walletTools, tool.name))) {
      run.close();
      throw new Error('No read tools are available. Check the account, the chain and the harness tool sources.');
    }
    const options = createAiSdkRun({
      run, maxOutputTokens: Math.min(maxOutputTokens, 512), budget: { kind: 'local' },
      contextWindow: contextTokens,
      onContextCompacted,
      estimateInputTokens: ({ instructions, messages, tools }) => estimateContextInput([instructions, messages, tools]),
      projectResult: compactHoldings,
      onInterrupt: () => run.close(),
    });
    return {
      loop: { options, close: run.close },
      isRead: (toolName) => !Object.hasOwn(walletTools, toolName) || walletTools[toolName].effect === 'read',
    };
  }
}
