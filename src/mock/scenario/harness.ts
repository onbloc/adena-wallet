// Node scenario entry point: local or hosted model, fixed reads, and a host-owned unsigned wallet.
import type { PreparedTransaction } from '../../agent';
import { LLMFromModel, type LLM } from '../../llm/core';
import { createLLMRemote, REMOTE_MODEL } from '../../llm/remote';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';
import type { MockTransaction, MockWalletSdk } from '../wallet/mockWalletSdk';
import { createOnblocMockWallet } from '../wallet/onblocWallet';
import { ACCOUNT, CAROL, type ScenarioReadsFactory } from './fixture';
import { remoteOptionsFromEnv } from './remoteEnv';
import { createScenarioRunner, type ScenarioWalletFactory } from './runner';

export { ACCOUNT, CAROL, GNS_PATH, RECIPIENT, TWIN_GNS_PATH, fakeReads, twinGnsHoldings } from './fixture';
export type { ScenarioRun, ScenarioRunner } from './runner';

/** Only this fixture's host-owned payload is narrowed; the public wallet keeps `tx` opaque. */
export const mockTransaction = ({ tx }: PreparedTransaction) => tx as MockTransaction;
export const firstMessage = (prepared: PreparedTransaction) => mockTransaction(prepared).messages[0];
export const serverUrl = () => process.env.SCENARIO_URL ?? DEFAULT_SERVER_URL;

const scenarioWallet: ScenarioWalletFactory = (onbloc) => {
  let wallet: Promise<MockWalletSdk> | undefined;
  return {
    getContacts: async () => [{ alias: 'carol', address: CAROL }],
    transfer: async (params) => {
      wallet ??= createOnblocMockWallet({ onbloc: { ...onbloc, account: ACCOUNT } });
      return (await wallet).transfer(params);
    },
    approve: async (params) => {
      wallet ??= createOnblocMockWallet({ onbloc: { ...onbloc, account: ACCOUNT } });
      return (await wallet).approve(params);
    },
  };
};

/** What the scenarios run on: the hosted OpenAI model (SCENARIO_REMOTE set) or the local server. */
export const scenarioTarget = (env = process.env) =>
  remoteOptionsFromEnv(env) ? `openai:${REMOTE_MODEL}` : `local:${serverUrl()}`;

async function createScenarioLLM(): Promise<LLM> {
  const remote = remoteOptionsFromEnv(process.env);
  if (remote) return createLLMRemote(remote);
  return new LLMFromModel(await connectModel(serverUrl(), DEFAULT_MODEL_NAME), { contextTokens: SERVER_CONTEXT_TOKENS });
}

export async function createEnvScenarioRunner(allowTransactionPreparation = true, readsFactory?: ScenarioReadsFactory) {
  return createScenarioRunner({ llm: await createScenarioLLM(), createWallet: scenarioWallet, allowTransactionPreparation, readsFactory });
}
