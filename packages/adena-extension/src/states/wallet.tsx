import { atom } from 'recoil';
import { Account, Wallet } from 'adena-module';
import { HistoryItem } from 'gno-client/src/api/response';

export interface TransactionHistoryState {
  address: string | null;
  currentPage: number;
  init: boolean;
  isFinish: boolean;
  items: Array<HistoryItem>;
};


/**
 * CREATE: When there is no stored serialized wallet value
 * LOGIN: When there is no encrypted password value
 * LOADING: During deserialization
 * FINISH: When deserialization is complete
 * FAIL: When deserialization has failed
 */
type StateType = 'CREATE' | 'LOGIN' | 'LOADING' | 'FINISH' | 'FAIL' | 'NONE';

export const wallet = atom<Wallet | null>({
  key: `wallet/wallet`,
  default: null,
});

export const state = atom<StateType>({
  key: `wallet/state`,
  default: 'NONE',
});

export const currentAccount = atom<Account | null>({
  key: `wallet/currentAccount`,
  default: null,
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