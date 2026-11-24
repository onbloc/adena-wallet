// Runs plain-language requests through the real agent over fixed Onbloc reads. Each request gets a
// fresh conversation. Portable: the model and the wallet come from the caller, so the same runner
// serves jest (llama-server, the Adena wallet) and the app (the on-device model, a mock wallet).
import { AIAgent, type AgentConversation, type PreparedTransaction, type WalletSdk } from '../../agent';
import { DEFAULT_BUDGET, Harness } from '../../harness/core';
import { createOnblocToolSource, type OnblocMcpConfig } from '../../harness/mcp';
import { GenerateEventType, type LLM } from '../../llm/core';
import { ACCOUNT, FAKE_ENDPOINT, fakeReads } from './fixture';
import { TimingLLM, type Stage } from './timing';

export type ScenarioRun = {
  prepared: PreparedTransaction[];
  calls: { name: string; input: unknown; invalid: boolean }[];
  results: { name: string; output: unknown }[];
  text: string;
  /** The model calls of this turn, in order, with their times. */
  stages: Stage[];
};

export type ScenarioRunner = {
  /** One request in a fresh conversation. */
  ask(prompt: string, signal?: AbortSignal): Promise<ScenarioRun>;
  /** A sequence that keeps one conversation. */
  chat(prompts: readonly string[], signal?: AbortSignal): Promise<ScenarioRun[]>;
};

/** Generation settings of every turn. */
export type ScenarioSettings = { temperature?: number; maxOutputTokens?: number; reasoning?: 'none' | 'provider-default' };

/** Builds the wallet that prepares transactions; `onbloc` is the fake Onbloc it may read balances from. */
export type ScenarioWalletFactory = (onbloc: OnblocMcpConfig) => WalletSdk;

async function collectTurn(
  conversation: AgentConversation,
  transactions: PreparedTransaction[],
  timing: TimingLLM,
  prompt: string,
  settings: ScenarioSettings,
  signal?: AbortSignal
) {
  const start = transactions.length;
  const run: ScenarioRun = { prepared: [], calls: [], results: [], text: '', stages: [] };
  timing.take();
  for await (const event of conversation.run({ prompt, ...settings }, { signal })) {
    if (event.type === GenerateEventType.ToolCall) {
      run.calls.push({ name: event.name, input: event.input, invalid: Boolean(event.invalid) });
    } else if (event.type === GenerateEventType.ToolResult) {
      run.results.push({ name: event.name, output: event.output });
    } else if (event.type === GenerateEventType.Text) {
      run.text += event.delta;
    }
  }
  run.prepared = transactions.slice(start);
  run.stages = timing.take();
  return run;
}

export function createScenarioRunner({
  llm,
  createWallet,
  allowTransactionPreparation = true,
  settings = { temperature: 0 },
}: {
  llm: LLM;
  createWallet: ScenarioWalletFactory;
  allowTransactionPreparation?: boolean;
  settings?: ScenarioSettings;
}): ScenarioRunner {
  const timing = new TimingLLM(llm);

  function startConversation() {
    const mcp = fakeReads();
    const onbloc = { endpoint: FAKE_ENDPOINT, fetcher: mcp.fetcher };
    const prepared: PreparedTransaction[] = [];
    const agent = new AIAgent({
      llm: timing,
      harness: new Harness({
        toolSources: [createOnblocToolSource(onbloc)],
        budget: { ...DEFAULT_BUDGET, timeoutMs: 5 * 60_000 },
      }),
      wallet: createWallet(onbloc),
      onTransaction: (transaction) => { prepared.push(transaction); },
    });
    return { conversation: agent.createConversation({ account: ACCOUNT, allowTransactionPreparation }), prepared };
  }

  return {
    async ask(prompt, signal) {
      const { conversation, prepared } = startConversation();
      return collectTurn(conversation, prepared, timing, prompt, settings, signal);
    },
    async chat(prompts, signal) {
      const { conversation, prepared } = startConversation();
      const turns: ScenarioRun[] = [];
      for (const prompt of prompts) turns.push(await collectTurn(conversation, prepared, timing, prompt, settings, signal));
      return turns;
    },
  };
}
