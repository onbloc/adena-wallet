import { atom } from 'recoil';
import { Wallet, WalletAccount } from 'adena-wallet';

/**
 * CREATE: When there is no stored serialized wallet value
 * LOGIN: When there is no encrypted password value
 * LOADING: During deserialization
 * FINISH: When deserialization is complete
 * FAIL: When deserialization has failed
 */
type StateType = 'CREATE' | 'LOGIN' | 'LOADING' | 'FINISH' | 'FAIL' | 'NONE';

export const state = atom<StateType>({
  key: `wallet/state`,
  default: 'NONE',
});

export const wallet = atom<InstanceType<typeof Wallet> | null>({
  key: `wallet/wallet`,
  default: null,
});

export const accounts = atom<Array<InstanceType<typeof WalletAccount>> | null>({
  key: `wallet/accounts`,
  default: [],
});

export const currentAccount = atom<InstanceType<typeof WalletAccount> | null>({
  key: `wallet/currentAccount`,
  default: null,
});


interface TokenInfo {
  denom?: string;
  img?: string;
  name?: string;
  type?: string;
  unit?: number;
  amount?: number;
}
export const tokenInfos = atom<Array<TokenInfo>>({
  key: `wallet/tokenInfos`,
  default: [],
});

interface Balance {
  denom?: string;
  img?: string;
  name?: string;
  type?: string;
  unit?: number;
}
export const balances = atom<Array<Balance>>({
  key: `wallet/balances`,
  default: [],
});
