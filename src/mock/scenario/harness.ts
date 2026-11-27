// Node scenario entry point: local or hosted model, fixed reads, and a host-owned unsigned wallet.
import type { PreparedTransaction } from '../../agent';
import { LLMFromModel, type LLM } from '../../llm/core';
import { createLLMRemote, REMOTE_MODEL } from '../../llm/remote';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';
import { MockWalletSdk, type MockTransaction } from '../wallet/mockWalletSdk';
import { FIXTURE } from '../wallet/fixture';
import { ACCOUNT, CAROL } from './fixture';
import { remoteOptionsFromEnv } from './remoteEnv';
import { createScenarioRunner, type ScenarioWalletFactory } from './runner';

export { ACCOUNT, CAROL, GNS_PATH, RECIPIENT } from './fixture';
export type { ScenarioRun, ScenarioRunner } from './runner';

/** Only this fixture's host-owned payload is narrowed; the public wallet keeps `tx` opaque. */
export const mockTransaction = ({ tx }: PreparedTransaction) => tx as MockTransaction;
export const firstMessage = (prepared: PreparedTransaction) => mockTransaction(prepared).messages[0];
export const serverUrl = () => process.env.SCENARIO_URL ?? DEFAULT_SERVER_URL;

const scenarioWallet: ScenarioWalletFactory = () => new MockWalletSdk({
  accounts: [{ name: 'Scenario account', address: ACCOUNT, balances: { ...FIXTURE.accounts[0].balances } }],
  contacts: [{ alias: 'carol', address: CAROL }],
});

/** What the scenarios run on: the hosted OpenAI model (SCENARIO_REMOTE set) or the local server. */
export const scenarioTarget = (env = process.env) =>
  remoteOptionsFromEnv(env) ? `openai:${REMOTE_MODEL}` : `local:${serverUrl()}`;

async function createScenarioLLM(): Promise<LLM> {
  const remote = remoteOptionsFromEnv(process.env);
  if (remote) return createLLMRemote(remote);
  return new LLMFromModel(await connectModel(serverUrl(), DEFAULT_MODEL_NAME), { contextTokens: SERVER_CONTEXT_TOKENS });
}

export async function createEnvScenarioRunner(allowTransactionPreparation = true) {
  return createScenarioRunner({ llm: await createScenarioLLM(), createWallet: scenarioWallet, allowTransactionPreparation });
}
