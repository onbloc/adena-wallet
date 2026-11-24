// jest scenarios: a real model over HTTP and the real Adena transaction builder. Node only: the Adena
// SDK is not bundled into the app (see README), so the app builds its own runner (see benchmark).
import { decodeTransactionMessage } from '@adena-wallet/sdk';

import { AdenaWalletSdk, createOnblocTokenResolver, type AdenaTransaction } from '../../adena';
import type { PreparedTransaction, WalletSdk } from '../../agent';
import { LLMFromModel } from '../../llm/core';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from '../cli/lib/server';
import { CAROL } from './fixture';
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

export async function createServerScenarioRunner(url = serverUrl(), allowTransactionPreparation = true) {
  const llm = new LLMFromModel(await connectModel(url, DEFAULT_MODEL_NAME), { contextTokens: SERVER_CONTEXT_TOKENS });
  return createScenarioRunner({ llm, createWallet: adenaWallet, allowTransactionPreparation });
}
