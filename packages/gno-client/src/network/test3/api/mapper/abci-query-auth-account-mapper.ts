import { GnoClientResnpose } from '@/api';
import { AbciQueryAuthAccount } from '../response';

export class AbciQueryAuthAccountMapper {
  public static toAccount = (
    abciQueryAuthAccount: AbciQueryAuthAccount | null,
  ): GnoClientResnpose.Account => {
    if (abciQueryAuthAccount === null) {
      return GnoClientResnpose.AccountInActive;
    }

    return {
      status: 'ACTIVE',
      address: abciQueryAuthAccount.BaseAccount.address,
      coins: abciQueryAuthAccount.BaseAccount.coins,
      publicKey: abciQueryAuthAccount.BaseAccount.public_key,
      accountNumber: abciQueryAuthAccount.BaseAccount.account_number,
      sequence: abciQueryAuthAccount.BaseAccount.sequence,
    };
  };
}
