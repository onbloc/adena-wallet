import { AdenaStorage } from "@common/storage";
import { WalletAccountRepository, WalletAddressRepository, WalletEstablishRepository, WalletRepository } from "@repositories/wallet";
import { WalletAccountService, WalletAddressBookService, WalletBalanceService, WalletEstablishService, WalletService } from "@services/wallet";
import { ResourceService } from "@services/resource";
import { GnoClientState, WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import { GnoClient } from "gno-client";
import React, { createContext, useEffect } from "react";
import { useRecoilState } from "recoil";
import { ChainRepository } from "@repositories/common";
import { TransactionService } from "@services/transaction";

interface AdenaContextProps {
  gnoClient: InstanceType<typeof GnoClient> | null;
  tokenConfigs: Array<TokenConfig>;
  walletService: WalletService;
  balanceService: WalletBalanceService;
  accountService: WalletAccountService;
  addressBookService: WalletAddressBookService;
  establishService: WalletEstablishService;
  resourceService: ResourceService;
  transactionService: TransactionService;
}

export const AdenaContext = createContext<AdenaContextProps | null>(null);

export const AdenaProvider = ({ children }: { children: React.ReactNode }) => {

  const [tokenConfigs, setTokenConfigs] = useRecoilState(WalletState.tokenConfig);

  const [gnoClient] = useRecoilState(GnoClientState.current);

  const localStorage = AdenaStorage.local();

  const sessionStorage = AdenaStorage.local();

  const walletRepository = new WalletRepository(localStorage, sessionStorage);

  const accountRepository = new WalletAccountRepository(localStorage);

  const establishRepository = new WalletEstablishRepository(localStorage);

  const addressBookRepository = new WalletAddressRepository(localStorage);

  const chainRepository = new ChainRepository(localStorage);

  const walletService = new WalletService(walletRepository, accountRepository);

  const balanceService = new WalletBalanceService(gnoClient, tokenConfigs);

  const accountService = new WalletAccountService(gnoClient, accountRepository);

  const addressBookService = new WalletAddressBookService(accountRepository, addressBookRepository);

  const resourceService = new ResourceService(chainRepository);

  const establishService = new WalletEstablishService(establishRepository, chainRepository);

  const transactionService = new TransactionService(gnoClient, chainRepository, walletService, accountService);

  useEffect(() => {
    initTokenConfig();
  }, []);

  const initTokenConfig = async () => {
    return resourceService.fetchTokenConfigs()
      .then(setTokenConfigs);
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
        resourceService,
        transactionService
      }}>
      {children}
    </AdenaContext.Provider>
  )
};
