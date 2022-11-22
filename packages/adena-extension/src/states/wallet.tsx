import { atom } from 'recoil';
import { Wallet, WalletAccount } from 'adena-wallet';
import { HistoryItem } from 'gno-client/src/api/response';

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

export interface TransactionHistoryState {
  address: string | null;
  currentPage: number;
  init: boolean;
  isFinish: boolean;
  items: Array<HistoryItem>;
}

export const transactionHistory = atom<TransactionHistoryState>({
  key: `wallet/transactionHistory`,
  default: {
    init: false,
    address: null,
    currentPage: -1,
    isFinish: false,
    items: []
  },
});

export interface TokenConfig {
  type: string;
  name: string;
  denom: string;
  unit: number;
  minimalDenom: string;
  minimalUnit: number;
  image: string;
  imageData?: string;
}

export const tokenConfig = atom<Array<TokenConfig>>({
  key: `wallet/tokenConfig`,
  default: [],
});

export interface Balance extends TokenConfig {
  amount: number;
  amountDenom: string;
}
export const balances = atom<Array<Balance>>({
  key: `wallet/balances`,
  default: [],
});
