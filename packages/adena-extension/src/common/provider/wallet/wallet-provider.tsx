import React, { createContext, useEffect, useState } from 'react';
import { ExploreState, NetworkState, TokenState, WalletState } from '@states/index';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { Wallet } from 'adena-module';
import { NetworkMetainfo } from '@states/network';
import { useAdenaContext } from '@hooks/use-context';
import { TokenModel } from '@models/token-model';
import { GnoProvider } from '../gno/gno-provider';

interface WalletContextProps {
  wallet: Wallet | null;
  gnoProvider: GnoProvider | undefined;
  walletStatus: 'CREATE' | 'LOGIN' | 'LOADING' | 'FINISH' | 'FAIL' | 'NONE';
  tokenMetainfos: TokenModel[];
  networkMetainfos: NetworkMetainfo[];
  updateWallet: (wallet: Wallet) => Promise<boolean>;
  initWallet: () => Promise<boolean>;
  initNetworkMetainfos: () => Promise<boolean>;
  changeNetwork: (network: NetworkMetainfo) => Promise<NetworkMetainfo>;
}

export const WalletContext = createContext<WalletContextProps | null>(null);

export const WalletProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const { walletService, transactionService, balanceService, accountService, chainService, tokenService } =
    useAdenaContext();

  const [gnoProvider, setGnoProvider] = useState<GnoProvider>();

  const [wallet, setWallet] = useRecoilState(WalletState.wallet);

  const [walletStatus, setWalletStatus] = useRecoilState(WalletState.state);

  const [tokenMetainfos, setTokenMetainfos] = useRecoilState(TokenState.tokenMetainfos);

  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);

  const setCurrentNetwrok = useSetRecoilState(NetworkState.currentNetwork);

  const setCurrentAccount = useSetRecoilState(WalletState.currentAccount);

  useEffect(() => {
    initWallet();
    initNetworkMetainfos();
  }, []);

  useEffect(() => {
    if (wallet && networkMetainfos && tokenMetainfos) {
      setWalletStatus('FINISH');
    }
  }, [wallet, networkMetainfos, tokenMetainfos]);

  async function initWallet() {
    const existWallet = await walletService.existsWallet();
    if (!existWallet) {
      setWallet(null);
      setWalletStatus('CREATE');
      return true;
    }

    const isLocked = await walletService.isLocked();
    if (isLocked) {
      setWallet(null);
      setWalletStatus('LOGIN');
      return true;
    }

    setWalletStatus('LOADING');
    try {
      const wallet = await walletService.loadWallet();
      setWallet(wallet);
      await initCurrentAccount(wallet);
    } catch (e) {
      console.error(e);
      setWallet(null);
      setWalletStatus('FAIL');
      return false;
    }
    return true;
  }

  async function updateWallet(wallet: Wallet) {
    setWallet(wallet);
    const password = await walletService.loadWalletPassword();
    await walletService.saveWallet(wallet, password);
    return true;
  }

  async function initCurrentAccount(wallet: Wallet) {
    const currentAccountId = await accountService.getCurrentAccountId();
    const currentAccount =
      wallet.accounts.find((account) => account.id === currentAccountId) ?? wallet.accounts[0];
    if (currentAccount) {
      setCurrentAccount(currentAccount);
      await accountService.changeCurrentAccount(currentAccount);
      initTokenMetainfos(currentAccount.id);
    }
    return true;
  }

  async function initNetworkMetainfos() {
    const networkMetainfos = await chainService.getNetworks();
    if (networkMetainfos.length === 0) {
      return false;
    }
    setNetworkMetainfos(networkMetainfos);
    chainService.updateNetworks(networkMetainfos);

    await initCurrentNetworkMetainfos(networkMetainfos);
    return true;
  }

  async function initCurrentNetworkMetainfos(networkMetainfos: NetworkMetainfo[]) {
    const currentNetworkId = await chainService.getCurrentNetworkId();
    const currentNetwork =
      networkMetainfos.find((networkMetainfo) => networkMetainfo.id === currentNetworkId) ??
      networkMetainfos[0];
    await chainService.updateCurrentNetworkId(currentNetwork.id);
    await changeNetwork(currentNetwork);
    return true;
  }

  async function initTokenMetainfos(accountId: string) {
    await tokenService.initAccountTokenMetainfos(accountId);
    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(accountId);
    setTokenMetainfos(tokenMetainfos);
    balanceService.setTokenMetainfos(tokenMetainfos);
  }

  async function changeNetwork(networkMetainfo: NetworkMetainfo) {
    const rpcUrl = networkMetainfo.rpcUrl;
    const gnoProvider = new GnoProvider(rpcUrl, networkMetainfo.networkId);
    const currentNetwork = await gnoProvider.getStatus().then(status => ({
      ...networkMetainfo,
      networkId: status.node_info.network
    })).catch(() => networkMetainfo);
    setCurrentNetwrok(currentNetwork);
    setGnoProvider(gnoProvider);

    accountService.setGnoProvider(gnoProvider);
    balanceService.setGnoProvider(gnoProvider);
    transactionService.setGnoProvider(gnoProvider);
    return currentNetwork;
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletStatus,
        tokenMetainfos,
        networkMetainfos,
        gnoProvider,
        initWallet,
        updateWallet,
        initNetworkMetainfos,
        changeNetwork
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
