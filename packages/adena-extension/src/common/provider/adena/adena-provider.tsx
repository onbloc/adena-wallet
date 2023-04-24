import React, { createContext } from "react";
import axios from "axios";
import { AdenaStorage } from "@common/storage";
import { WalletAccountRepository, WalletAddressRepository, WalletEstablishRepository, WalletRepository } from "@repositories/wallet";
import { WalletAccountService, WalletAddressBookService, WalletBalanceService, WalletEstablishService, WalletService } from "@services/wallet";
import { ChainService, TokenService } from "@services/resource";
import { ChainRepository } from "@repositories/common";
import { TransactionService } from "@services/transaction";
import { TokenRepository } from "@repositories/common/token";

interface AdenaContextProps {
  walletService: WalletService;
  balanceService: WalletBalanceService;
  accountService: WalletAccountService;
  addressBookService: WalletAddressBookService;
  establishService: WalletEstablishService;
  chainService: ChainService;
  tokenService: TokenService;
  transactionService: TransactionService;
}

export const AdenaContext = createContext<AdenaContextProps | null>(null);

export const AdenaProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {

  const axiosInstance = axios.create();

  const localStorage = AdenaStorage.local();

  const sessionStorage = AdenaStorage.session();

  const walletRepository = new WalletRepository(localStorage, sessionStorage);

  const accountRepository = new WalletAccountRepository(localStorage);

  const establishRepository = new WalletEstablishRepository(localStorage);

  const addressBookRepository = new WalletAddressRepository(localStorage);

  const chainRepository = new ChainRepository(localStorage, axiosInstance);

  const tokenRepository = new TokenRepository(localStorage, axiosInstance);

  const chainService = new ChainService(chainRepository);

  const tokenService = new TokenService(tokenRepository);

  const walletService = new WalletService(walletRepository);

  const balanceService = new WalletBalanceService();

  const accountService = new WalletAccountService(accountRepository);

  const addressBookService = new WalletAddressBookService(addressBookRepository);

  const establishService = new WalletEstablishService(establishRepository);

  const transactionService = new TransactionService(walletService, accountService);

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
        transactionService
      }}>
      {children}
    </AdenaContext.Provider>
  )
};
