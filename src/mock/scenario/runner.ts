// Runs requests through a stateful agent over fixed Onbloc reads. The caller supplies the model
// and wallet, so jest and the native benchmark share the same runner.
import { AIAgent, type PreparedTransaction, type WalletSdk } from '../../agent';
import { DEFAULT_BUDGET, Harness } from '../../harness/core';
import { createOnblocToolSource, type OnblocMcpConfig } from '../../harness/mcp';
import { GenerateEventType, type LLM } from '../../llm/core';
import { ACCOUNT, FAKE_ENDPOINT, TOKEN_SYMBOLS, fakeReads } from './fixture';
import { TimingLLM, type Stage } from './timing';

export type ScenarioRun = {
  prepared: PreparedTransaction[];
  calls: { name: string; input: unknown; invalid: boolean }[];
  results: { name: string; output: unknown }[];
  text: string;
  /** The model calls of this turn, in order, with their times. */
  stages: Stage[];
};

/** How one request runs. */
export type ScenarioOptions = {
  signal?: AbortSignal;
  /** False: no wallet is linked, so the agent has no account. Defaults to true. */
  account?: boolean;
};

export type ScenarioRunner = {
  /** One request in a fresh conversation. */
  ask(prompt: string, options?: ScenarioOptions): Promise<ScenarioRun>;
  /** A sequence that keeps one conversation. */
  chat(prompts: readonly string[], options?: ScenarioOptions): Promise<ScenarioRun[]>;
};

/** Generation settings of every turn. */
export type ScenarioSettings = { temperature?: number; maxOutputTokens?: number; reasoning?: 'none' | 'provider-default' };

/** Builds the wallet that prepares transactions; `onbloc` is the fake Onbloc it may read balances from. */
export type ScenarioWalletFactory = (onbloc: OnblocMcpConfig) => WalletSdk;

async function collectTurn(
  agent: AIAgent,
  transactions: PreparedTransaction[],
  timing: TimingLLM,
  prompt: string,
  settings: ScenarioSettings,
  allowTransactionPreparation: boolean,
  { signal, account = true }: ScenarioOptions
) {
  const start = transactions.length;
  const run: ScenarioRun = { prepared: [], calls: [], results: [], text: '', stages: [] };
  timing.take();
  const runOptions = { account: account ? ACCOUNT : undefined, allowTransactionPreparation, signal };
  for await (const event of agent.run({ prompt, ...settings }, runOptions)) {
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

  /** A fresh agent, so a request starts a conversation of its own. */
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
      tokenSymbols: TOKEN_SYMBOLS,
    });
    return { agent, prepared };
  }

  return {
    async ask(prompt, options = {}) {
      const { agent, prepared } = startConversation();
      return collectTurn(agent, prepared, timing, prompt, settings, allowTransactionPreparation, options);
    },
    async chat(prompts, options = {}) {
      const { agent, prepared } = startConversation();
      const turns: ScenarioRun[] = [];
      for (const prompt of prompts) turns.push(await collectTurn(agent, prepared, timing, prompt, settings, allowTransactionPreparation, options));
      return turns;
    },
  };
}
