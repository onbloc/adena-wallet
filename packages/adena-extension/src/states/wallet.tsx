import { atom } from 'recoil';
import { Account, Wallet } from 'adena-module';

import { HistoryItem } from '@repositories/transaction/response/transaction-history-response';
import { StateType } from '@types';
import { AddressBookItem } from '@repositories/wallet';

interface TransactionHistoryState {
  address: string | null;
  currentPage: number;
  init: boolean;
  isFinish: boolean;
  items: Array<HistoryItem>;
}

export const wallet = atom<Wallet | null>({
  key: 'wallet/wallet',
  default: null,
});

export const state = atom<StateType>({
  key: 'wallet/state',
  default: 'NONE',
});

export const currentAccount = atom<Account | null>({
  key: 'wallet/currentAccount',
  default: null,
});

export const accountNames = atom<{ [key in string]: string }>({
  key: 'wallet/accountNames',
  default: {},
});

export const transactionHistory = atom<TransactionHistoryState>({
  key: 'wallet/transactionHistory',
  default: {
    init: false,
    address: null,
    currentPage: -1,
    isFinish: false,
    items: [],
  },
});

export const addressBook = atom<{
  init: boolean;
  loading: boolean;
  items: AddressBookItem[];
}>({
  key: 'wallet/addressBook',
  default: {
    init: false,
    loading: false,
    items: [],
  },
});
