import { asSchema, type ToolSet } from 'ai';
import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { buildWalletPrompt } from './prompts';
import type { Contact, TransactionHandler, WalletSdk } from './wallet/port';
import { createWalletTools } from './wallet/tools';
import type { Budget, Harness, HarnessRun } from '../harness/core';
import { GNO_MAINNET_CHAIN } from '../harness/mcp';
import type { GenerateEvent, GenerateSettings, LLM, ToolLoop } from '../llm/core';

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

// Qwen3.5 tokenizer, measured: 4.1 bytes/token on prompt and tool schemas, 3.5 on Korean text,
// 2.45 on a get_token_balances result. 2 keeps ~20% margin below the densest of those; counting
// every byte as a token overshoots 2-4x and ran out of budget after one tool call.
const BYTES_PER_TOKEN = 2;
// An on-device model is slow: the whole run, tool calls included, is bounded by this.
const RUN_TIMEOUT_MS = 5 * 60_000;
// Max model calls per run with wallet tools (e.g. a balance read -> transfer -> answer).
const MAX_STEPS = 5;

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
  /** Bounds each run and brings the read tools (its tool sources, e.g. an MCP server). */
  harness: Harness;
  /** The chain of the accounts. Defaults to Gno mainnet. */
  chainId?: string;
  /**
   * Limits wallet-backed runs. Defaults: 5 model steps, 4 harness read calls, twice the model
   * context in total tokens, and 300000 ms. Wallet actions do not consume maxToolCalls.
   */
  budget?: Partial<Budget>;
} & (
  | { wallet?: undefined; onTransaction?: undefined }
  | {
      /** Builds the transactions the agent prepares. Without one the agent is the LLM alone. */
      wallet: WalletSdk;
      /** Gets each transaction the agent prepares. The agent signs and sends nothing: the app does. */
      onTransaction: TransactionHandler;
    }
);

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
  private readonly budget: Partial<Budget>;
  private runs = 0;

  constructor({ llm, harness, wallet, onTransaction, chainId = GNO_MAINNET_CHAIN, budget = {} }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.onTransaction = onTransaction;
    this.chainId = chainId;
    this.budget = { ...budget };
  }

  /**
   * Answers one prompt or conversation. Same events as `llm.generate`; with a wallet the text is
   * held back until the answer is vetted (see `guardAnswer`). `settings.tools` are ignored: the
   * tools are the wallet's and the harness's. `budget.maxSteps`, not `settings.maxSteps`, bounds
   * wallet-backed model calls. Use this, not `agent.llm.generate`, to stay bounded.
   *
   * With a wallet, `account` is required: the address the run acts for. The app picks it for each
   * run (a wallet holds many accounts and the user switches between them). It is whose holdings
   * the tools read and the `from` of every transaction; the model never chooses it. A run keeps
   * the account it started with.
   */
  async *run(
    settings: GenerateSettings,
    { account, signal }: { account?: string; signal?: AbortSignal } = {}
  ): AsyncGenerator<GenerateEvent> {
    const { wallet, onTransaction } = this;
    if (!wallet || !onTransaction) {
      yield* this.llm.generate(settings, { signal });
      return;
    }
    if (!account) throw new TypeError('An agent with a wallet needs the account to act for: run(settings, { account })');
    const contextTokens = this.llm.contextTokens;
    if (!Number.isSafeInteger(contextTokens) || contextTokens <= 0) throw new RangeError('Invalid model context token limit');
    if (this.budget.maxTokens === undefined && contextTokens > Math.floor(Number.MAX_SAFE_INTEGER / 2)) {
      throw new RangeError('Default token budget exceeds safe integer range');
    }
    const maxOutputTokens = settings.maxOutputTokens ?? 512;
    if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens <= 0) throw new RangeError('Invalid output token limit');
    if (maxOutputTokens > contextTokens) throw new RangeError('Output token limit exceeds model context');
    signal?.throwIfAborted();
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `agent-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', signal,
      budget: {
        maxSteps: this.budget.maxSteps ?? MAX_STEPS,
        maxToolCalls: this.budget.maxToolCalls ?? MAX_STEPS - 1,
        maxTokens: this.budget.maxTokens ?? contextTokens * 2,
        timeoutMs: this.budget.timeoutMs ?? RUN_TIMEOUT_MS,
      },
    });
    try {
      const contacts = await loadContacts(wallet, run.signal);
      const walletTools = createWalletTools({ sdk: wallet, account, contacts, signal: run.signal, onTransaction });
      const { loop, isRead } = await this.startLoop({ run, walletTools, maxOutputTokens, contextTokens });
      run.signal.throwIfAborted();
      const system = settings.system ?? buildWalletPrompt({ contacts, approvals: wallet.getAllowances !== undefined });
      yield* guardAnswer(
        this.llm.generate({ ...settings, maxOutputTokens, system, tools: undefined }, { signal: run.signal, loop }),
        isRead
      );
    } finally {
      run.close();
    }
  }

  /**
   * Adds the wallet tools to a harness run and includes their schemas in the input estimate.
   */
  private async startLoop({ run, walletTools, maxOutputTokens, contextTokens }: {
    run: HarnessRun;
    walletTools: ToolSet;
    maxOutputTokens: number;
    contextTokens: number;
  }): Promise<{ loop: ToolLoop; isRead(toolName: string): boolean }> {
    const walletDefinitions = await Promise.all(Object.entries(walletTools).map(async ([name, { description, inputSchema }]) => (
      { name, description, inputSchema: await asSchema(inputSchema).jsonSchema }
    )));
    if (run.tools.length === 0) {
      throw new Error('No read tools are available. Check the account, the chain and the harness tool sources.');
    }
    const options = createAiSdkRun({
      run, maxOutputTokens, budget: { kind: 'local' },
      estimateInputTokens: ({ instructions, messages, tools }) => {
        // Conservative local estimate. Reserve enough room for the output in the device context.
        const bytes = new TextEncoder().encode(JSON.stringify([instructions, messages, tools, walletDefinitions])).byteLength;
        const estimate = Math.ceil(bytes / BYTES_PER_TOKEN) + 512;
        if (estimate > contextTokens - maxOutputTokens) {
          throw new RangeError('Input estimate and output reserve exceed model context');
        }
        return estimate;
      },
      projectResult: compactHoldings,
      onInterrupt: () => run.close(),
    });
    const harnessTools = options.tools;
    return {
      // Harness tools win a name clash: a wallet tool must not replace a read.
      loop: { options: { ...options, tools: { ...walletTools, ...harnessTools } }, close: run.close },
      /** True for the harness's read tools, false for the wallet action tools. */
      isRead: (toolName) => Object.hasOwn(harnessTools, toolName),
    };
  }
}
