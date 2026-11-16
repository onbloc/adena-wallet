import { Account, Wallet } from 'adena-module';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';

import { TransactionHistoryItem } from '@repositories/transaction/response/transaction-history-response';
import { AddressBookItem } from '@repositories/wallet';
import { StateType } from '@types';

interface TransactionHistoryState {
  address: string | null;
  currentPage: number;
  init: boolean;
  isFinish: boolean;
  items: Array<TransactionHistoryItem>;
}

export const wallet = atom<Wallet | null>(null);

export const state = atom<StateType>('NONE');

export const currentAccount = atomWithReset<Account | null>(null);

export const accountNames = atom<{ [key in string]: string }>({});

export const transactionHistory = atomWithReset<TransactionHistoryState>({
  init: false,
  address: null,
  currentPage: -1,
  isFinish: false,
  items: [],
});

export const addressBook = atomWithReset<{
  init: boolean;
  loading: boolean;
  items: AddressBookItem[];
}>({
  init: false,
  loading: false,
  items: [],
});
