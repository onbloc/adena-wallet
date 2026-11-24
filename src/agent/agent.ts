import { asSchema, type ToolSet } from 'ai';
import { createAiSdkRun } from './aiSdkBridge';
import { guardAnswer } from './answerGuard';
import { buildWalletPrompt } from './prompts';
import type { WalletSdk } from './wallet/port';
import { createWalletTools } from './wallet/tools';
import type { Harness } from '../harness/core';
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
// The run also waits for the user to answer signing popups.
const RUN_TIMEOUT_MS = 5 * 60_000;
// Max model calls per run with wallet tools (e.g. a balance read -> transfer -> answer).
const MAX_STEPS = 5;
  

export type AIAgentOptions = {
  llm: LLM;
  /** Bounds each run and brings the read tools (its tool sources, e.g. an MCP server). */
  harness: Harness;
  /** The wallet the agent acts through. Without one the agent is the LLM alone. */
  wallet?: WalletSdk;
  /** The chain of the wallet's account. Defaults to Gno mainnet. */
  chainId?: string;
};

/**
 * A wallet assistant: an LLM that reads through the harness's tool sources and acts through
 * a wallet, within the harness's budget, with its answer checked against what the tools returned.
 */
export class AIAgent {
  readonly llm: LLM;
  readonly harness: Harness;
  readonly wallet?: WalletSdk;
  private readonly chainId: string;
  private runs = 0;

  constructor({ llm, harness, wallet, chainId = GNO_MAINNET_CHAIN }: AIAgentOptions) {
    this.llm = llm;
    this.harness = harness;
    this.wallet = wallet;
    this.chainId = chainId;
  }

  /**
   * Answers one prompt or conversation. Same events as `llm.generate`; with a wallet the text is
   * held back until the answer is vetted (see `guardAnswer`). `settings.tools` are ignored: the
   * tools are the wallet's and the harness's. Use this, not `agent.llm.generate`, to stay bounded.
   */
  async *run(
    settings: GenerateSettings,
    { signal }: { signal?: AbortSignal } = {}
  ): AsyncGenerator<GenerateEvent> {
    const wallet = this.wallet;
    if (!wallet) {
      yield* this.llm.generate(settings, { signal });
      return;
    }
    const account = await wallet.getActiveAddress();
    const contacts = (await wallet.getContacts?.()) ?? [];
    const walletTools = createWalletTools({ sdk: wallet, activeAddress: account, contacts });
    const { loop, isRead } = await this.startLoop({
      account,
      walletTools,
      maxOutputTokens: settings.maxOutputTokens ?? 512,
      signal,
    });
    try {
      const system = settings.system ?? buildWalletPrompt({ contacts });
      yield* guardAnswer(
        this.llm.generate({ ...settings, system, tools: undefined }, { signal, loop }),
        isRead
      );
    } finally {
      loop.close();
    }
  }

  /**
   * Starts a harness run. The wallet tools bypass the harness, so their schemas are added to
   * the input estimate here.
   */
  private async startLoop({ account, walletTools, maxOutputTokens, signal }: {
    account: string;
    walletTools: ToolSet;
    maxOutputTokens: number;
    signal?: AbortSignal;
  }): Promise<{ loop: ToolLoop; isRead(toolName: string): boolean }> {
    const contextTokens = this.llm.contextTokens;
    const totalTokens = 2 * contextTokens;
    const walletDefinitions = await Promise.all(Object.entries(walletTools).map(async ([name, { description, inputSchema }]) => (
      { name, description, inputSchema: await asSchema(inputSchema).jsonSchema }
    )));
    const run = await this.harness.startRun({
      account, chainId: this.chainId, operationId: `agent-${++this.runs}`,
      scope: 'read-only', purpose: 'mainnet-read', signal,
      budget: { maxSteps: MAX_STEPS, maxToolCalls: MAX_STEPS - 1, maxTokens: totalTokens, timeoutMs: RUN_TIMEOUT_MS },
    });
    if (run.tools.length === 0) {
      run.close();
      throw new Error('No read tools are available. Check the account, the chain and the harness tool sources.');
    }
    const options = createAiSdkRun({
      run, maxOutputTokens: Math.min(maxOutputTokens, 512), budget: { kind: 'local' },
      estimateInputTokens: ({ instructions, messages, tools }) => {
        // Conservative local estimate. Reserve enough room for the output in the device context.
        const bytes = new TextEncoder().encode(JSON.stringify([instructions, messages, tools, walletDefinitions])).byteLength;
        const estimate = Math.ceil(bytes / BYTES_PER_TOKEN) + 512;
        return estimate + Math.min(maxOutputTokens, 512) > contextTokens ? totalTokens : estimate;
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
