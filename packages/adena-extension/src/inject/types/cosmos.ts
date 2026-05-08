import type { AminoSignResponse, StdSignDoc, StdSignature } from '@cosmjs/amino';

import { AdenaResponse } from './common';

// TODO: replace with `WalletResponseExecuteType` import from
// `@adena-wallet/sdk` once the SDK is updated to ship Cosmos enum entries.
// This local constant is a temporary stand-in until then.
export const CosmosResponseExecuteType = {
  ENABLE_COSMOS: 'ENABLE_COSMOS',
  GET_COSMOS_KEY: 'GET_COSMOS_KEY',
  SIGN_COSMOS_AMINO: 'SIGN_COSMOS_AMINO',
  SIGN_COSMOS_DIRECT: 'SIGN_COSMOS_DIRECT',
  SEND_COSMOS_TX: 'SEND_COSMOS_TX',
} as const;
export type CosmosResponseExecuteType =
  (typeof CosmosResponseExecuteType)[keyof typeof CosmosResponseExecuteType];

// Keplr-compatible string union — accepted by `sendTx`.
export type BroadcastMode = 'sync' | 'async' | 'block';

// JSON-safe counterpart of `cosmjs-types` SignDoc. `bigint` → decimal string,
// `Uint8Array` → base64. Used whenever a SignDoc crosses a JSON boundary
// (content script ↔ background), since `chrome.runtime.sendMessage` applies
// JSON serialization and drops bigint / Uint8Array fidelity.
export interface SerializedSignDoc {
  bodyBytes: string;
  authInfoBytes: string;
  chainId: string;
  accountNumber: string;
}

export interface SerializedDirectSignResponse {
  signed: SerializedSignDoc;
  signature: StdSignature;
}

// Keplr-style account descriptor surfaced to dApps. Binary fields are
// Uint8Array at the `window.adena.cosmos` surface; the inject.ts wrapper
// reconstitutes them from the `SerializedCosmosKey` wire payload.
export interface CosmosKey {
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  bech32Address: string;
  isNanoLedger: boolean;
}

// Wire-level counterpart of `CosmosKey`. Binary fields are base64 strings
// because `chrome.runtime.sendMessage` applies JSON encoding between the
// background handler and the content script, dropping Uint8Array fidelity.
export interface SerializedCosmosKey {
  algo: string;
  pubKey: string;
  address: string;
  bech32Address: string;
  isNanoLedger: boolean;
}

export interface EnableCosmosParams {
  chainIds: string | string[];
}

export interface GetCosmosKeyParams {
  chainId: string;
}

export interface SignCosmosAminoParams {
  chainId: string;
  signer: string;
  signDoc: StdSignDoc;
}

export interface SignCosmosDirectParams {
  chainId: string;
  signer: string;
  signDoc: SerializedSignDoc;
}

export interface SendCosmosTxParams {
  chainId: string;
  tx: string;
  mode: BroadcastMode;
}

export type EnableCosmosResponse = AdenaResponse<void>;
export type GetCosmosKeyResponse = AdenaResponse<SerializedCosmosKey>;
export type SignCosmosAminoResponse = AdenaResponse<AminoSignResponse>;
export type SignCosmosDirectResponse = AdenaResponse<SerializedDirectSignResponse>;
export type SendCosmosTxResponse = AdenaResponse<string>;
