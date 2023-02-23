import React, { createContext, useEffect } from "react";
import { AdenaStorage } from "@common/storage";
import { WalletAccountRepository, WalletAddressRepository, WalletEstablishRepository, WalletRepository } from "@repositories/wallet";
import { WalletAccountService, WalletAddressBookService, WalletBalanceService, WalletEstablishService, WalletService } from "@services/wallet";
import { ChainService, TokenService } from "@services/resource";
import { GnoClientState, WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import { GnoClient } from "gno-client";
import { useRecoilState } from "recoil";
import { ChainRepository } from "@repositories/common";
import { TransactionService } from "@services/transaction";
import axios from "axios";
import { TokenRepository } from "@repositories/common/token";

interface AdenaContextProps {
  gnoClient: InstanceType<typeof GnoClient> | null;
  tokenConfigs: Array<TokenConfig>;
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

export const AdenaProvider = ({ children }: { children: React.ReactNode }) => {

  const axiosInstance = axios.create();

  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const [tokenConfigs, setTokenConfigs] = useRecoilState(WalletState.tokenConfig);

  const [gnoClient, setGnoClient] = useRecoilState(GnoClientState.current);

  const localStorage = AdenaStorage.local();

  const sessionStorage = AdenaStorage.local();

  const walletRepository = new WalletRepository(localStorage, sessionStorage);

  const accountRepository = new WalletAccountRepository(localStorage);

  const establishRepository = new WalletEstablishRepository(localStorage);

  const addressBookRepository = new WalletAddressRepository(localStorage);

  const chainRepository = new ChainRepository(localStorage, axiosInstance);

  const tokenRepository = new TokenRepository(axiosInstance);

  const chainService = new ChainService(chainRepository);

  const tokenService = new TokenService(tokenRepository);

  const walletService = new WalletService(walletRepository, accountRepository);

  const balanceService = new WalletBalanceService(chainService, tokenConfigs);

  const accountService = new WalletAccountService(gnoClient, accountRepository);

  const addressBookService = new WalletAddressBookService(accountRepository, addressBookRepository);

  const establishService = new WalletEstablishService(establishRepository, chainService);

  const transactionService = new TransactionService(gnoClient, chainService, walletService, accountService);

  useEffect(() => {
    initTokenConfig();
    initCurrentAccount();
  }, []);

  useEffect(() => {
    if (!gnoClient) {
      initNetworks();
    }
  }, [gnoClient]);

  const initCurrentAccount = async () => {
    accountService.getCurrentAccount().then(setCurrentAccount);
  };

  const initTokenConfig = async () => {
    return tokenService.getTokenConfigs()
      .then(setTokenConfigs);
  };

  const initNetworks = async () => {
    const networks = await chainRepository.fetchNetworks();
    await chainService.updateNetworks(networks);
    const currentNetwork = await chainService.getCurrentNetwork();
    await chainService.updateCurrentNetwork(currentNetwork.chainId);

    const gnoClient = await chainService.getCurrentClient();
    setGnoClient(gnoClient);
    return true;
  };

  return (
    <AdenaContext.Provider
      value={{
        gnoClient,
        tokenConfigs,
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
