import { AminoMsg, makeSignDoc, StdFee, StdSignDoc } from '@cosmjs/amino';

export interface MakeStdSignDocParams {
  chainId: string;
  accountNumber: string;
  sequence: string;
  msgs: AminoMsg[];
  fee: StdFee;
  memo?: string;
}

/**
 * Thin wrapper over @cosmjs/amino's `makeSignDoc` — normalizes defaults
 * (empty memo) and keeps the shape of optional callers consistent.
 *
 * @cosmjs/amino reference: node_modules/@cosmjs/amino/build/signdoc.js:30-39
 */
export function makeStdSignDoc(params: MakeStdSignDocParams): StdSignDoc {
  return makeSignDoc(
    params.msgs,
    params.fee,
    params.chainId,
    params.memo ?? '',
    params.accountNumber,
    params.sequence,
  );
}
