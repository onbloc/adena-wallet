import { GnoClientResnpose } from '../../../../api';

export class AbciQueryBankBalancesMapper {
  public static toBalances = (balances: string): GnoClientResnpose.Balances => {
    const balancesValue = balances
      .trim()
      .replace('"', '')
      .match(/[a-zA-Z]+|[0-9]+(?:\.[0-9]+|)/g);
    const amount = balancesValue && balancesValue?.length > 0 ? balancesValue[0] : '0.000000';
    const unit = balancesValue && balancesValue?.length > 1 ? balancesValue[1] : 'gnot';
    return {
      balances: [
        {
          amount,
          unit,
        },
      ],
    };
  };
}
