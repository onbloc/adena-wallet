// jest scenarios: a model (llama-server over HTTP by default, hosted OpenAI with SCENARIO_REMOTE)
// and the real Adena transaction builder. Node only: the Adena
// SDK is not bundled into the app (see README), so the app builds its own runner (see benchmark).
import { decodeTransactionMessage } from '@adena-wallet/sdk';

import { AdenaWalletSdk, createOnblocTokenResolver, type AdenaTransaction } from '../../adena';
import type { PreparedTransaction, WalletSdk } from '../../agent';
import { LLMFromModel, type LLM } from '../../llm/core';
import { createLLMRemote, REMOTE_MODEL } from '../../llm/remote';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';
import { CAROL } from './fixture';
import { remoteOptionsFromEnv } from './remoteEnv';
import { createScenarioRunner, type ScenarioWalletFactory } from './runner';

export { ACCOUNT, CAROL, GNS_PATH, RECIPIENT } from './fixture';
export type { ScenarioRun, ScenarioRunner } from './runner';

/** The wallet here is AdenaWalletSdk, which builds every `tx`. */
export const adenaTransaction = ({ tx }: PreparedTransaction) => tx as AdenaTransaction;

export const firstMessage = (prepared: PreparedTransaction) =>
  decodeTransactionMessage(adenaTransaction(prepared).messages[0]);

export const serverUrl = () => process.env.SCENARIO_URL ?? DEFAULT_SERVER_URL;

const adenaWallet: ScenarioWalletFactory = (onbloc): WalletSdk => {
  const adena = new AdenaWalletSdk({ tokens: createOnblocTokenResolver(onbloc) });
  return {
    getContacts: async () => [{ alias: 'carol', address: CAROL }],
    transfer: (params) => adena.transfer(params),
    approve: (params) => adena.approve(params),
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

export async function createEnvScenarioRunner() {
  return createScenarioRunner({ llm: await createScenarioLLM(), createWallet: adenaWallet });
}
