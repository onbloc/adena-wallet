import { asSchema, simulateStreamingMiddleware, wrapLanguageModel, type LanguageModel, type ToolSet } from 'ai';
import { createAiSdkRun } from '../harness/ai-sdk';
import { createHarness } from '../harness/dispatch';
import { GNO_MAINNET_CHAIN } from '../harness/gno';
import type { OnblocMcpConfig } from '../harness/onbloc-mcp';
import { DEFAULT_CONTEXT_PARAMS, MAX_STEPS } from './config';

export type OnblocRun = OnblocMcpConfig & Readonly<{ account: string }>;

/** Native llama callbacks can publish tool IDs before their argument JSON is complete. */
export function withCompletedToolCalls(model: Exclude<LanguageModel, string>) {
  return wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() });
}

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

const contextTokens = DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048;
const totalTokens = 2 * contextTokens;
let runSequence = 0;
// Qwen3.5 tokenizer, measured: 4.1 bytes/token on prompt and tool schemas, 3.5 on Korean text,
// 2.45 on a get_token_balances result. 2 keeps ~20% margin below the densest of those; counting
// every byte as a token overshoots 2-4x and ran out of budget after one tool call.
const BYTES_PER_TOKEN = 2;
const READ_TIMEOUT_MS = 55_000;
// With wallet tools the run also waits for the user to answer signing popups.
const ACTION_TIMEOUT_MS = 5 * 60_000;

/**
 * Starts a read-only Onbloc run. `walletTools` (mock wallet actions) run next to the Onbloc
 * reads; they bypass the harness, so this adds their schemas to the input estimate and
 * leaves the run time to answer signing popups.
 */
export async function startOnblocRun(
  { account, ...onblocMcp }: OnblocRun,
  maxOutputTokens: number,
  signal?: AbortSignal,
  walletTools: ToolSet = {}
) {
  const walletDefinitions = await Promise.all(Object.entries(walletTools).map(async ([name, { description, inputSchema }]) => (
    { name, description, inputSchema: await asSchema(inputSchema).jsonSchema }
  )));
  const run = await createHarness({
    wallet: {}, onblocMcp,
    budget: { maxSteps: MAX_STEPS, maxToolCalls: MAX_STEPS - 1, maxTokens: totalTokens,
      timeoutMs: walletDefinitions.length > 0 ? ACTION_TIMEOUT_MS : READ_TIMEOUT_MS },
  }).startRun({ account, chainId: GNO_MAINNET_CHAIN, operationId: `onbloc-${++runSequence}`,
    scope: 'read-only', purpose: 'mainnet-read', signal });

  if (run.tools.length === 0) {
    run.close();
    throw new Error('No Onbloc read tools are available. Check the mainnet account and endpoint.');
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
    close: run.close,
    /** True for the harness's Onbloc reads, false for the wallet action tools. */
    isRead: (toolName: string) => Object.hasOwn(harnessTools, toolName),
    // Harness tools win a name clash: a wallet tool must not replace a read.
    options: { ...options, tools: { ...walletTools, ...harnessTools } },
  };
}