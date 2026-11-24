// Real model and transaction builder over fixed Onbloc reads. Each sequence owns one conversation.
import { decodeTransactionMessage } from '@adena-wallet/sdk';

import { AdenaWalletSdk, createOnblocTokenResolver, type AdenaTransaction } from '../../adena';
import { AIAgent, type AgentConversation, type PreparedTransaction, type WalletSdk } from '../../agent';
import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { GenerateEventType, LLMFromModel } from '../../llm/core';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';

export const ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
export const RECIPIENT = 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6';
export const CAROL = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
export const GNS_PATH = 'gno.land/r/gnoswap/gns';

// The account holds 10 GNOT and 250 GNS, both with six decimals.
const GNOT_UNITS = '10000000';
const GNS = { address: ACCOUNT, tokenId: GNS_PATH, packagePath: GNS_PATH, symbol: 'GNS', amount: '250000000', decimals: 6 };

export type ScenarioRun = {
  prepared: PreparedTransaction[];
  calls: { name: string; input: unknown; invalid: boolean }[];
  results: { name: string; output: unknown }[];
  text: string;
};

export type ScenarioRunner = {
  ask(prompt: string): Promise<ScenarioRun>;
  chat(prompts: readonly string[]): Promise<ScenarioRun[]>;
};

/** The wallet here is AdenaWalletSdk, which builds every `tx`. */
export const adenaTransaction = ({ tx }: PreparedTransaction) => tx as AdenaTransaction;

export const firstMessage = (prepared: PreparedTransaction) =>
  decodeTransactionMessage(adenaTransaction(prepared).messages[0]);

export const serverUrl = () => process.env.SCENARIO_URL ?? DEFAULT_SERVER_URL;

async function collectTurn(conversation: AgentConversation, transactions: PreparedTransaction[], prompt: string) {
  const start = transactions.length;
  const run: ScenarioRun = { prepared: [], calls: [], results: [], text: '' };
  for await (const event of conversation.run({ prompt, temperature: 0 })) {
    if (event.type === GenerateEventType.ToolCall) {
      run.calls.push({ name: event.name, input: event.input, invalid: Boolean(event.invalid) });
    } else if (event.type === GenerateEventType.ToolResult) {
      run.results.push({ name: event.name, output: event.output });
    } else if (event.type === GenerateEventType.Text) {
      run.text += event.delta;
    }
  }
  run.prepared = transactions.slice(start);
  return run;
}

/** `ask` starts fresh; `chat` retains a single session for every prompt in its sequence. */
export async function createScenarioRunner(url = serverUrl()): Promise<ScenarioRunner> {
  const llm = new LLMFromModel(await connectModel(url, DEFAULT_MODEL_NAME), { contextTokens: SERVER_CONTEXT_TOKENS });

  function startConversation() {
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: GNOT_UNITS } },
      { name: 'get_token_balances', output: { address: ACCOUNT, items: [GNS] } },
    ]);
    const onbloc = { endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher };
    const adena = new AdenaWalletSdk({ tokens: createOnblocTokenResolver(onbloc) });
    const wallet: WalletSdk = {
      getContacts: async () => [{ alias: 'carol', address: CAROL }],
      transfer: (params) => adena.transfer(params),
      approve: (params) => adena.approve(params),
    };
    const prepared: PreparedTransaction[] = [];
    const agent = new AIAgent({
      llm,
      harness: new Harness({ toolSources: [createOnblocToolSource(onbloc)] }),
      wallet,
      onTransaction: (transaction) => { prepared.push(transaction); },
    });
    return { conversation: agent.createConversation({ account: ACCOUNT }), prepared };
  }

  return {
    async ask(prompt) {
      const { conversation, prepared } = startConversation();
      return collectTurn(conversation, prepared, prompt);
    },
    async chat(prompts) {
      const { conversation, prepared } = startConversation();
      const turns: ScenarioRun[] = [];
      for (const prompt of prompts) turns.push(await collectTurn(conversation, prepared, prompt));
      return turns;
    },
  };
}
