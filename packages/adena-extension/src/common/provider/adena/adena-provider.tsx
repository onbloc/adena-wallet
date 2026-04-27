import { AdenaStorage } from '@common/storage';
import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { toCosmosNetworkProfile } from '@common/mapper/network-profile-mapper';
import { useWindowSize } from '@hooks/use-window-size';
import { ChainRepository } from '@repositories/common';
import { TokenRepository } from '@repositories/common/token';
import { FaucetRepository } from '@repositories/faucet/faucet';
import {
  TransactionHistoryApiRepository,
  TransactionHistoryIndexerRepository,
} from '@repositories/transaction';
import { TransactionGasRepository } from '@repositories/transaction/transaction-gas';
import {
  WalletAccountRepository,
  WalletAddressRepository,
  WalletEstablishRepository,
  WalletRepository,
} from '@repositories/wallet';
import { FaucetService } from '@services/faucet';
import { ChainService, TokenService } from '@services/resource';
import {
  TransactionGasService,
  TransactionHistoryService,
  TransactionService,
} from '@services/transaction';
import { MultisigService } from '@services/multisig';
import {
  CosmosBalanceService,
  WalletAccountService,
  WalletAddressBookService,
  WalletBalanceService,
  WalletEstablishService,
  WalletService,
} from '@services/wallet';
import { NetworkState } from '@states';
import {
  ALL_TOKENS,
  ChainRegistry,
  createChainRegistry,
  TokenRegistry,
  TokenRegistryImpl,
} from 'adena-module';
import axios from 'axios';
import React, { createContext, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { GnoProvider } from '../gno/gno-provider';

export interface AdenaContextProps {
  walletService: WalletService;
  balanceService: WalletBalanceService;
  cosmosBalanceService: CosmosBalanceService;
  cosmosProvider: CosmosLcdProvider | null;
  chainRegistry: ChainRegistry;
  tokenRegistry: TokenRegistry;
  accountService: WalletAccountService;
  addressBookService: WalletAddressBookService;
  establishService: WalletEstablishService;
  chainService: ChainService;
  tokenService: TokenService;
  transactionService: TransactionService;
  transactionHistoryService: TransactionHistoryService;
  faucetService: FaucetService;
  transactionGasService: TransactionGasService | null;
  multisigService: MultisigService;
}

export const AdenaContext = createContext<AdenaContextProps | null>(null);

export const AdenaProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const currentGnoNetwork = useRecoilValue(NetworkState.currentNetwork);

  const gnoProvider: GnoProvider | null = useMemo(() => {
    if (!currentGnoNetwork) {
      return null;
    }
    return new GnoProvider(currentGnoNetwork.rpcUrl, currentGnoNetwork.chainId);
  }, [currentGnoNetwork]);

  const chainRegistry = useMemo(() => createChainRegistry(), []);

  const tokenRegistry = useMemo(() => {
    const registry = new TokenRegistryImpl();
    ALL_TOKENS.forEach((t) => registry.register(t));
    return registry;
  }, []);

  const currentAtomoneNetwork = useRecoilValue(NetworkState.currentAtomoneNetwork);
  const cosmosProvider = useMemo<CosmosLcdProvider | null>(() => {
    if (!currentAtomoneNetwork) {
      return null;
    }
    return new CosmosLcdProvider(toCosmosNetworkProfile(currentAtomoneNetwork));
  }, [currentAtomoneNetwork]);

  const cosmosBalanceService = useMemo(
    () => new CosmosBalanceService(cosmosProvider),
    [cosmosProvider],
  );

  const axiosInstance = useMemo(() => axios.create({ timeout: 20_000 }), []);

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
    () => new TokenRepository(localStorage, axiosInstance, currentGnoNetwork, gnoProvider),
    [localStorage, axiosInstance, currentGnoNetwork, gnoProvider],
  );

  const transactionHistoryRepository = useMemo(() => {
    if (currentGnoNetwork?.apiUrl) {
      return new TransactionHistoryApiRepository(axiosInstance, currentGnoNetwork);
    }

    return new TransactionHistoryIndexerRepository(axiosInstance, currentGnoNetwork);
  }, [axiosInstance, currentGnoNetwork]);

  const transactionGasRepository = useMemo(() => {
    if (!currentGnoNetwork) {
      return null;
    }

    return new TransactionGasRepository(gnoProvider, axiosInstance, currentGnoNetwork);
  }, [gnoProvider, transactionHistoryRepository, currentGnoNetwork]);

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
    const transactionService = new TransactionService(
      walletService,
      gnoProvider,
      chainRegistry,
      cosmosProvider,
    );
    return transactionService;
  }, [walletService, gnoProvider, chainRegistry, cosmosProvider]);

  const transactionHistoryService = useMemo(
    () => new TransactionHistoryService(gnoProvider, transactionHistoryRepository),
    [gnoProvider, transactionHistoryRepository],
  );

  const transactionGasService = useMemo(() => {
    if (!transactionGasRepository) {
      return null;
    }

    return new TransactionGasService(transactionGasRepository);
  }, [transactionGasRepository]);

  const multisigService = useMemo(() => {
    return new MultisigService(walletService, gnoProvider);
  }, [walletService, gnoProvider]);

  const faucetRepository = useMemo(() => new FaucetRepository(axios), [axiosInstance]);

  const faucetService = useMemo(() => new FaucetService(faucetRepository), [faucetRepository]);

  useWindowSize(true);

  return (
    <AdenaContext.Provider
      value={{
        walletService,
        balanceService,
        cosmosBalanceService,
        cosmosProvider,
        chainRegistry,
        tokenRegistry,
        accountService,
        addressBookService,
        establishService,
        chainService,
        tokenService,
        transactionService,
        transactionHistoryService,
        faucetService,
        transactionGasService,
        multisigService,
      }}
    >
      {children}
    </AdenaContext.Provider>
  );
};
