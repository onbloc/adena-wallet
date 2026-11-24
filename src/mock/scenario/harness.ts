// Runs the real model through the real agent for one human-language request, with a fixed
// Onbloc (fake MCP) and the real Adena transaction builder, and collects what it prepared.
import { decodeTransactionMessage } from '@adena-wallet/sdk';

import { AdenaWalletSdk, pickToken, type AdenaTransaction } from '../../adena';
import { AIAgent, type PreparedTransaction, type WalletSdk } from '../../agent';
import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { GenerateEventType, LLMFromModel } from '../../llm/core';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';

export const ACCOUNT = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
export const RECIPIENT = 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6';
export const CAROL = 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s';
export const GNS_PATH = 'gno.land/r/gnoswap/gns';

/** What the account holds: 10 GNOT and 250 GNS (6 decimals each). */
const GNOT_UNITS = '10000000';
const GNS = { address: ACCOUNT, tokenId: GNS_PATH, packagePath: GNS_PATH, symbol: 'GNS', amount: '250000000', decimals: 6 };

export type ScenarioRun = {
  prepared: PreparedTransaction[];
  /** Tool calls in order, as the model made them. */
  calls: { name: string; input: unknown; invalid: boolean }[];
  /** The answer the user would read. */
  text: string;
};

export type ScenarioRunner = { ask(prompt: string): Promise<ScenarioRun> };

/** The unsigned transaction of a prepared one. The wallet here is AdenaWalletSdk, which builds every `tx`. */
export const adenaTransaction = ({ tx }: PreparedTransaction) => tx as AdenaTransaction;

/** The first message of a prepared transaction, decoded from its protobuf form. */
export const firstMessage = (prepared: PreparedTransaction) =>
  decodeTransactionMessage(adenaTransaction(prepared).messages[0]);

export const serverUrl = () => process.env.SCENARIO_URL ?? DEFAULT_SERVER_URL;

/** One agent over the model server; each `ask` is an independent single-turn conversation. */
export async function createScenarioRunner(url = serverUrl()): Promise<ScenarioRunner> {
  const llm = new LLMFromModel(await connectModel(url, DEFAULT_MODEL_NAME), { contextTokens: SERVER_CONTEXT_TOKENS });
  const adena = new AdenaWalletSdk({ tokens: async (query) => pickToken(query, [GNS]) });
  // Adena has no address book; the scenarios give the model one contact to name.
  const wallet: WalletSdk = {
    getContacts: async () => [{ alias: 'carol', address: CAROL }],
    transfer: (params) => adena.transfer(params),
    approve: (params) => adena.approve(params),
  };

  return {
    async ask(prompt) {
      const mcp = fakeOnblocMcp([
        { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: GNOT_UNITS } },
        { name: 'get_token_balances', output: { address: ACCOUNT, items: [GNS] } },
      ]);
      const prepared: PreparedTransaction[] = [];
      const agent = new AIAgent({
        llm,
        harness: new Harness({
          toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
        }),
        wallet,
        onTransaction: (transaction) => {
          prepared.push(transaction);
        },
      });

      const run: ScenarioRun = { prepared, calls: [], text: '' };
      for await (const event of agent.run({ prompt, temperature: 0 }, { account: ACCOUNT })) {
        if (event.type === GenerateEventType.ToolCall) {
          run.calls.push({ name: event.name, input: event.input, invalid: Boolean(event.invalid) });
        } else if (event.type === GenerateEventType.Text) {
          run.text += event.delta;
        }
      }
      return run;
    },
  };
}
