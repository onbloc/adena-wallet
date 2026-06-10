import { Tx, TxSignature } from '@gnolang/tm2-js-client';
import { LocalTxSignature } from './local-tx-signature';

// Union type aliases used when a function can return either a plain or a
// session-aware signature / transaction. Callers that do not need to
// distinguish the two can keep using TxSignature / Tx.
export type GnoTxSignature = TxSignature | LocalTxSignature;
export type SignedGnoTx = Tx;

export interface SignGnoResult {
  signed: SignedGnoTx;
  signature: GnoTxSignature[];
}
