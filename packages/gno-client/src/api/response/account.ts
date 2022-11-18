export interface Account {
  status: 'ACTIVE' | 'IN_ACTIVE' | 'NONE';
  address: string;
  coins: string;
  publicKey: string | null;
  accountNumber: string;
  sequence: string;
}

const defaultValue: Account = {
  status: 'NONE',
  address: '',
  coins: '',
  publicKey: null,
  accountNumber: '',
  sequence: '',
};

export const AccountNone: Account = {
  ...defaultValue,
  status: 'NONE',
};

export const AccountInActive: Account = {
  ...defaultValue,
  status: 'IN_ACTIVE',
};
