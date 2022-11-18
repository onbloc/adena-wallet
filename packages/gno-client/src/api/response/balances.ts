export interface Balances {
  balances: Array<{
    amount: string;
    unit: string;
  }>;
}

const defaultValue = {
  balances: [
    {
      amount: '0.0',
      unit: 'ugnot',
    },
  ],
};

export const BalancesDefault = {
  ...defaultValue,
};
