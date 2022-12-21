import { WalletAccount } from '@/wallet';
import { StdSignDoc } from '../signdoc';

export class Document {
  public static createDocument(
    account: WalletAccount,
    msgs: Array<any>,
    gas: number,
    gasFee?: number,
    memo?: string
  ): StdSignDoc {
    const gasFeeAmount = `${gasFee ?? 1}`;
    return {
      msgs: [...msgs],
      fee: {
        amount: [
          {
            amount: gasFeeAmount,
            denom: account.getConfig().getCoinMinimalDenom(),
          },
        ],
        gas: gas.toString(),
      },
      chain_id: account.getConfig().getChainId(),
      memo: memo ?? '',
      account_number: account.getAccountNumber() || '',
      sequence: account.getSequence() || '',
    };
  }
}
