import { WalletAccount } from '@/wallet';
import { StdSignDoc } from '../signdoc';

export class Document {
  public static createDocument(
    account: WalletAccount,
    chainId: string,
    msgs: Array<any>,
    gasWanted: string,
    gasFee: {
      value: string,
      denom: string
    },
    memo: string
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
      account_number: account.getAccountNumber() || '',
      sequence: account.getSequence() || '',
    };
  }
}
