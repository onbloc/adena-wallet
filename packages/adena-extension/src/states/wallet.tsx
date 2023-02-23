import { atom } from 'recoil';
import { WalletAccount } from 'adena-module';
import { HistoryItem } from 'gno-client/src/api/response';
import BigNumber from 'bignumber.js';

export interface TransactionHistoryState {
  address: string | null;
  currentPage: number;
  init: boolean;
  isFinish: boolean;
  items: Array<HistoryItem>;
};

export interface TokenConfig {
  main: boolean;
  type: string;
  name: string;
  denom: string;
  unit: number;
  minimalDenom: string;
  minimalUnit: number;
  image: string;
  imageData?: string;
}

export interface Balance extends TokenConfig {
  amount: BigNumber;
  amountDenom: string;
};

export interface CuurentBalance {
  amount: BigNumber;
  denom: string;
};

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

export const currentAccount = atom<InstanceType<typeof WalletAccount> | null>({
  key: `wallet/currentAccount`,
  default: null,
});

export const accounts = atom<Array<InstanceType<typeof WalletAccount>> | null>({
  key: `wallet/accounts`,
  default: [],
});

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

export const tokenConfig = atom<Array<TokenConfig>>({
  key: `wallet/tokenConfig`,
  default: [],
});

export const balances = atom<Array<Balance>>({
  key: `wallet/balances`,
  default: [],
});

export const accountBalances = atom<{ [key in string]: Array<Balance> }>({
  key: `wallet/accountBalances`,
  default: {},
});

export const currentBalance = atom<CuurentBalance>({
  key: `wallet/currentBalance`,
  default: {
    amount: BigNumber(-1),
    denom: ''
  },
});