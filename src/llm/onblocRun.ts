import { createAiSdkRun } from '../harness/ai-sdk';
import { createHarness } from '../harness/dispatch';
import { GNO_MAINNET_CHAIN } from '../harness/gno';
import type { OnblocMcpConfig } from '../harness/onbloc-mcp';
import { DEFAULT_CONTEXT_PARAMS, MAX_STEPS } from './config';

export type OnblocRun = OnblocMcpConfig & Readonly<{ account: string }>;

const contextTokens = DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048;
const totalTokens = 2 * contextTokens;
let runSequence = 0;

export async function startOnblocRun({ account, ...onblocMcp }: OnblocRun, maxOutputTokens: number, signal?: AbortSignal) {
  const run = await createHarness({
    wallet: {}, onblocMcp,
    budget: { maxSteps: MAX_STEPS, maxToolCalls: MAX_STEPS - 1, maxTokens: totalTokens, timeoutMs: 55_000 },
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
      const bytes = new TextEncoder().encode(JSON.stringify([instructions, messages, tools])).byteLength;
      const estimate = bytes + 512;
      return estimate + Math.min(maxOutputTokens, 512) > contextTokens ? totalTokens : estimate;
    },
    onInterrupt: () => run.close(),
  });
  return { close: run.close, options };
}