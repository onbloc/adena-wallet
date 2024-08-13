import React, { createContext, useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { Wallet } from 'adena-module';

import { NetworkState, TokenState, WalletState } from '@states';
import { useAdenaContext } from '@hooks/use-context';
import { GnoProvider } from '../gno/gno-provider';
import { TokenModel, NetworkMetainfo, StateType } from '@types';

export interface WalletContextProps {
  wallet: Wallet | null;
  gnoProvider: GnoProvider | undefined;
  walletStatus: StateType;
  tokenMetainfos: TokenModel[];
  networkMetainfos: NetworkMetainfo[];
  updateWallet: (wallet: Wallet) => Promise<boolean>;
  initWallet: () => Promise<boolean>;
  initNetworkMetainfos: () => Promise<boolean>;
  changeNetwork: (network: NetworkMetainfo) => Promise<NetworkMetainfo>;
}

export const WalletContext = createContext<WalletContextProps | null>(null);

export const WalletProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const { walletService, balanceService, accountService, chainService, tokenService } =
    useAdenaContext();

  const [gnoProvider, setGnoProvider] = useState<GnoProvider>();

  const [wallet, setWallet] = useRecoilState(WalletState.wallet);

  const [walletStatus, setWalletStatus] = useRecoilState(WalletState.state);

  const [tokenMetainfos] = useRecoilState(TokenState.tokenMetainfos);

  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);

  const setCurrentNetwork = useSetRecoilState(NetworkState.currentNetwork);

  const setCurrentAccount = useSetRecoilState(WalletState.currentAccount);

  useEffect(() => {
    initWallet();
    initNetworkMetainfos();
  }, []);

  useEffect(() => {
    if (wallet && networkMetainfos.length > 0 && tokenMetainfos.length > 0) {
      setWalletStatus('FINISH');
    }
  }, [wallet, networkMetainfos, tokenMetainfos]);

  async function initWallet(): Promise<boolean> {
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
      const currentAccountId = await accountService.getCurrentAccountId();
      wallet.currentAccountId = currentAccountId;
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

  async function updateWallet(wallet: Wallet): Promise<boolean> {
    setWallet(wallet);
    const password = await walletService.loadWalletPassword();
    await walletService.saveWallet(wallet, password);
    return true;
  }

  async function initCurrentAccount(wallet: Wallet): Promise<boolean> {
    const currentAccountId = await accountService.getCurrentAccountId();
    const currentAccount =
      wallet.accounts.find((account) => account.id === currentAccountId) ?? wallet.accounts[0];
    if (currentAccount) {
      setCurrentAccount(currentAccount);
      await accountService.changeCurrentAccount(currentAccount);
    }
    return true;
  }

  async function initNetworkMetainfos(): Promise<boolean> {
    const networkMetainfos = await chainService.getNetworks();
    if (networkMetainfos.length === 0) {
      return false;
    }
    setNetworkMetainfos(networkMetainfos);
    chainService.updateNetworks(networkMetainfos);

    await initCurrentNetworkMetainfos(networkMetainfos);
    return true;
  }

  async function initCurrentNetworkMetainfos(
    networkMetainfos: NetworkMetainfo[],
  ): Promise<boolean> {
    const currentNetworkId = await chainService.getCurrentNetworkId();
    const currentNetwork =
      networkMetainfos.find((networkMetainfo) => networkMetainfo.id === currentNetworkId) ??
      networkMetainfos[0];
    await chainService.updateCurrentNetworkId(currentNetwork.id);
    await changeNetwork(currentNetwork);
    return true;
  }

  async function changeNetwork(networkMetainfo: NetworkMetainfo): Promise<NetworkMetainfo> {
    const rpcUrl = networkMetainfo.rpcUrl;
    const gnoProvider = new GnoProvider(rpcUrl, networkMetainfo.networkId);
    setCurrentNetwork(networkMetainfo);
    setGnoProvider(gnoProvider);
    return networkMetainfo;
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
        changeNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
