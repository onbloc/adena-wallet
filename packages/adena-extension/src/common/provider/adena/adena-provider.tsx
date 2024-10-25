import { AdenaStorage } from '@common/storage';
import { useWindowSize } from '@hooks/use-window-size';
import { ChainRepository } from '@repositories/common';
import { TokenRepository } from '@repositories/common/token';
import { FaucetRepository } from '@repositories/faucet/faucet';
import { TransactionHistoryRepository } from '@repositories/transaction';
import {
  WalletAccountRepository,
  WalletAddressRepository,
  WalletEstablishRepository,
  WalletRepository,
} from '@repositories/wallet';
import { FaucetService } from '@services/faucet';
import { ChainService, TokenService } from '@services/resource';
import { TransactionHistoryService, TransactionService } from '@services/transaction';
import {
  WalletAccountService,
  WalletAddressBookService,
  WalletBalanceService,
  WalletEstablishService,
  WalletService,
} from '@services/wallet';
import { NetworkState } from '@states';
import axios from 'axios';
import React, { createContext, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { GnoProvider } from '../gno/gno-provider';

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
  const currentNetwork = useRecoilValue(NetworkState.currentNetwork);

  const gnoProvider: GnoProvider | null = useMemo(() => {
    if (!currentNetwork) {
      return null;
    }
    return new GnoProvider(currentNetwork.rpcUrl, currentNetwork.chainId);
  }, [currentNetwork]);

  const axiosInstance = axios.create({ timeout: 20_000 });

  const localStorage = AdenaStorage.local();

  const sessionStorage = AdenaStorage.session();

  const walletRepository = useMemo(
    () => new WalletRepository(localStorage, sessionStorage),
    [localStorage, sessionStorage],
  );

  const accountRepository = useMemo(
    () => new WalletAccountRepository(localStorage),
    [localStorage],
  );

  const establishRepository = useMemo(
    () => new WalletEstablishRepository(localStorage),
    [localStorage],
  );

  const addressBookRepository = useMemo(
    () => new WalletAddressRepository(localStorage),
    [localStorage],
  );

  const chainRepository = useMemo(
    () => new ChainRepository(localStorage, axiosInstance),
    [localStorage, axiosInstance],
  );

  const tokenRepository = useMemo(
    () => new TokenRepository(localStorage, axiosInstance, currentNetwork, gnoProvider),
    [localStorage, axiosInstance, currentNetwork],
  );

  const transactionHistoryRepository = useMemo(() => {
    return new TransactionHistoryRepository(axiosInstance, currentNetwork);
  }, [axiosInstance, currentNetwork]);

  const chainService = useMemo(() => new ChainService(chainRepository), [chainRepository]);

  const tokenService = useMemo(() => new TokenService(tokenRepository), [tokenRepository]);

  const walletService = useMemo(() => new WalletService(walletRepository), [walletRepository]);

  const balanceService: WalletBalanceService = useMemo(() => {
    return new WalletBalanceService(gnoProvider);
  }, [gnoProvider]);

  const accountService = useMemo(
    () => new WalletAccountService(accountRepository, gnoProvider),
    [accountRepository, gnoProvider],
  );

  const addressBookService = useMemo(
    () => new WalletAddressBookService(walletRepository, addressBookRepository),
    [walletRepository, addressBookRepository],
  );

  const establishService = useMemo(
    () => new WalletEstablishService(establishRepository),
    [establishRepository],
  );

  const transactionService = useMemo(() => {
    const transactionService = new TransactionService(walletService, gnoProvider);
    return transactionService;
  }, [walletService, gnoProvider]);

  const transactionHistoryService = useMemo(
    () => new TransactionHistoryService(gnoProvider, transactionHistoryRepository),
    [gnoProvider, transactionHistoryRepository],
  );

  const faucetRepository = useMemo(() => new FaucetRepository(axios), [axiosInstance]);

  const faucetService = useMemo(() => new FaucetService(faucetRepository), [faucetRepository]);

  useWindowSize(true);

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
