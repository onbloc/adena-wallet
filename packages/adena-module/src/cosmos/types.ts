import { AminoMsg, StdFee, StdSignDoc } from '@cosmjs/amino';
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

/**
 * Minimum shape needed for Cosmos signing. Distinct from Gno `Document`.
 * When `accountNumber` / `sequence` are omitted, the signer fetches them via
 * `CosmosLcdProvider.getAccount()`. Shape is shared across AMINO and DIRECT;
 * the msgs are carried in amino form and converted to proto `Any` internally
 * for the DIRECT path.
 */
export interface CosmosDocument {
  chainId: string;
  fromAddress: string;
  msgs: AminoMsg[];
  fee: StdFee;
  memo: string;
  accountNumber?: string;
  sequence?: string;
}

/**
 * Result of `signCosmosAmino` / `signCosmosDirect` — ready to pass to `broadcastTx`.
 *
 * `signDoc` carries the pre-signature document for audit. The union reflects
 * the two signing pipelines: AMINO yields `StdSignDoc` (JSON shape), DIRECT
 * yields `SignDoc` (proto shape with bigint fields).
 */
export interface SignedCosmosTx {
  txBytes: Uint8Array;
  txHashHex: string;
  signDoc: StdSignDoc | SignDoc;
}

export function isCosmosDocument(doc: unknown): doc is CosmosDocument {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'chainId' in doc &&
    'fromAddress' in doc &&
    'msgs' in doc &&
    'fee' in doc
  );
}

export function isSignedCosmosTx(tx: unknown): tx is SignedCosmosTx {
  return (
    typeof tx === 'object' &&
    tx !== null &&
    'txBytes' in tx &&
    'signDoc' in tx
  );
}

export function isAminoSignDoc(doc: StdSignDoc | SignDoc): doc is StdSignDoc {
  return 'account_number' in doc && 'msgs' in doc;
}

export function isDirectSignDoc(doc: StdSignDoc | SignDoc): doc is SignDoc {
  return 'bodyBytes' in doc && 'authInfoBytes' in doc;
}
