import React, { createContext, useMemo } from 'react';
import axios from 'axios';
import { AdenaStorage } from '@common/storage';
import {
  WalletAccountRepository,
  WalletAddressRepository,
  WalletEstablishRepository,
  WalletRepository,
} from '@repositories/wallet';
import {
  WalletAccountService,
  WalletAddressBookService,
  WalletBalanceService,
  WalletEstablishService,
  WalletService,
} from '@services/wallet';
import { ChainService, TokenService } from '@services/resource';
import { ChainRepository } from '@repositories/common';
import { TransactionHistoryService, TransactionService } from '@services/transaction';
import { TokenRepository } from '@repositories/common/token';
import { TransactionHistoryRepository } from '@repositories/transaction';
import { FaucetService } from '@services/faucet';
import { FaucetRepository } from '@repositories/faucet/faucet';

export interface AdenaContextProps {
  walletService: WalletService;
  balanceService: WalletBalanceService;
  accountService: WalletAccountService;
  addressBookService: WalletAddressBookService;
  establishService: WalletEstablishService;
  chainService: ChainService;
  tokenService: TokenService;
  transactionService: TransactionService;
  transactionHistoryService: TransactionHistoryService;
  faucetService: FaucetService;
}

export const AdenaContext = createContext<AdenaContextProps | null>(null);

export const AdenaProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const axiosInstance = axios.create({ timeout: 5000 });

  const localStorage = AdenaStorage.local();

  const sessionStorage = AdenaStorage.session();

  const walletRepository = new WalletRepository(localStorage, sessionStorage);

  const accountRepository = new WalletAccountRepository(localStorage);

  const establishRepository = new WalletEstablishRepository(localStorage);

  const addressBookRepository = new WalletAddressRepository(localStorage);

  const chainRepository = new ChainRepository(localStorage, axiosInstance);

  const tokenRepository = new TokenRepository(localStorage, axiosInstance);

  const transactionHistoryRepository = new TransactionHistoryRepository(axiosInstance);

  const chainService = new ChainService(chainRepository);

  const tokenService = new TokenService(tokenRepository);

  const walletService = new WalletService(walletRepository);

  const balanceService = new WalletBalanceService();

  const accountService = new WalletAccountService(accountRepository);

  const addressBookService = new WalletAddressBookService(walletRepository, addressBookRepository);

  const establishService = new WalletEstablishService(establishRepository);

  const transactionService = new TransactionService(walletService);

  const transactionHistoryService = new TransactionHistoryService(transactionHistoryRepository);

  const faucetRepository = useMemo(() => new FaucetRepository(axios), [axiosInstance]);

  const faucetService = useMemo(() => new FaucetService(faucetRepository), [faucetRepository]);

  return (
    <AdenaContext.Provider
      value={{
        walletService,
        balanceService,
        accountService,
        addressBookService,
        establishService,
        chainService,
        tokenService,
        transactionService,
        transactionHistoryService,
        faucetService,
      }}
    >
      {children}
    </AdenaContext.Provider>
  );
};
