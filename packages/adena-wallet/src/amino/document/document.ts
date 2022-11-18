import { WalletAccount } from '@/wallet';
import { StdSignDoc } from '../signdoc';

export class Document {
  public static createDocument(
    account: WalletAccount,
    msg: any,
    gas: number,
    gasFee?: number,
  ): StdSignDoc {
    const gasFeeAmount = `${gasFee ?? 1}`;
    return {
      msgs: [msg],
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
      memo: '',
      account_number: account.getAccountNumber() || '',
      sequence: account.getSequence() || '',
    };
  }
}
