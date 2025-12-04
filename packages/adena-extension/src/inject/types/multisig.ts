import { AdenaResponse } from './common';

export interface CreateMultisigAccountParams {
  signers: string[];
  threshold: number;
}

export type CreateMultisigAccountResponseData = {
  multisigAddress: string;
  multisigAddressBytes: Uint8Array;
};

export type CreateMultisigAccountResponse = AdenaResponse<CreateMultisigAccountResponseData>;
