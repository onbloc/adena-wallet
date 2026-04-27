import { AminoMsg, StdFee, StdSignDoc } from '@cosmjs/amino';

/**
 * Minimum shape needed for Cosmos AMINO signing. Distinct from Gno `Document`.
 * When `accountNumber` / `sequence` are omitted, the signer fetches them via
 * `CosmosLcdProvider.getAccount()`.
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

/** Result of `signCosmosAmino` — ready to pass to `broadcastTx`. */
export interface SignedCosmosTx {
  txBytes: Uint8Array;
  txHashHex: string;
  signDoc: StdSignDoc;
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
