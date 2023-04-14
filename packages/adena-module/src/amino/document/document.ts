import { StdSignDoc } from '../signdoc';

export class Document {
  public static createDocument(
    accountNumber: string,
    sequence: string,
    chainId: string,
    msgs: Array<any>,
    gasWanted: string,
    gasFee: {
      value: string;
      denom: string;
    },
    memo: string,
  ): StdSignDoc {
    return {
      msgs: [...msgs],
      fee: {
        amount: [
          {
            amount: gasFee.value,
            denom: gasFee.denom,
          },
        ],
        gas: gasWanted,
      },
      chain_id: chainId,
      memo: memo,
      account_number: accountNumber,
      sequence: sequence,
    };
  }
}
