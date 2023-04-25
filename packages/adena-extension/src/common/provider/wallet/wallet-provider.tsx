import React, { createContext, useEffect } from "react";
import { ExploreState, GnoClientState, NetworkState, TokenState, WalletState } from "@states/index";
import { useRecoilState, useSetRecoilState } from "recoil";
import { Wallet } from "adena-module";
import { NetworkMetainfo } from "@states/network";
import { TokenMetainfo } from "@states/token";
import { useAdenaContext } from "@hooks/use-context";
import { GnoClient } from "gno-client";

interface WalletContextProps {
  wallet: Wallet | null;
  walletStatus: 'CREATE' | 'LOGIN' | 'LOADING' | 'FINISH' | 'FAIL' | 'NONE';
  tokenMetainfos: TokenMetainfo[];
  networkMetainfos: NetworkMetainfo[];
  initWallet: () => Promise<boolean>;
}

export const WalletContext = createContext<WalletContextProps | null>(null);


export const WalletProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {

  const { walletService, balanceService, accountService, chainService, tokenService } = useAdenaContext();

  const [wallet, setWallet] = useRecoilState(WalletState.wallet);

  const [walletStatus, setWalletStatus] = useRecoilState(WalletState.state);

  const [tokenMetainfos, setTokenMetainfos] = useRecoilState(TokenState.tokenMetainfos);

  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);

  const setCurrentNetwrok = useSetRecoilState(NetworkState.currentNetwork);

  const setGnoClient = useSetRecoilState(GnoClientState.current);

  const setCurrentAccount = useSetRecoilState(WalletState.currentAccount)

  const setExploreSites = useSetRecoilState(ExploreState.sites);

  useEffect(() => {
    initWallet();
    initNetworkMetainfos();
    initAppInfos();
  }, []);

  useEffect(() => {
    if (wallet && networkMetainfos && tokenMetainfos) {
      setWalletStatus('FINISH');
    }
  }, [wallet, networkMetainfos, tokenMetainfos])

  async function initWallet() {
    const existWallet = await walletService.existsWallet();
    if (!existWallet) {
      setWallet(null);
      setWalletStatus('CREATE');
      return true;
    }

    const isLocked = await walletService.isLocked()
    if (isLocked) {
      setWallet(null);
      setWalletStatus('LOGIN');
      return true;
    }

    setWalletStatus('LOADING');
    try {
      const wallet = await walletService.loadWallet();
      setWallet(wallet)
      await initCurrentAccount(wallet);
    } catch (e) {
      console.error(e);
      setWallet(null)
      setWalletStatus('FAIL');
      return false;
    }
    return true;
  }

  async function initCurrentAccount(wallet: Wallet) {
    const currentAccountId = await accountService.getCurrentAccountId()
    const currentAccount =
      wallet.accounts.find(account => account.id === currentAccountId) ??
      wallet.accounts[0];
    if (currentAccount) {
      setCurrentAccount(currentAccount);
      await accountService.changeCurrentAccount(currentAccount);
      initTokenMetainfos(currentAccount.id);
    }
    return true;
  }

  async function initNetworkMetainfos() {
    const networkMetainfos = await chainService.fetchNetworkMetainfos();
    if (networkMetainfos.length === 0) {
      return false;
    }
    setNetworkMetainfos(networkMetainfos);
    chainService.updateNetworks(networkMetainfos);

    await initCurrentNetworkMetainfos(networkMetainfos);
    return true;
  }

  async function initCurrentNetworkMetainfos(networkMetainfos: NetworkMetainfo[]) {
    const currentNetworkId = await chainService.getCurrentNetworkId()
    const currentNetwork =
      networkMetainfos.find(info => info.networkId === currentNetworkId) ??
      networkMetainfos[0];
    chainService.updateCurrentNetworkId(currentNetwork.networkId);
    setCurrentNetwrok(currentNetwork);

    const gnoClient = GnoClient.createNetwork(currentNetwork);
    setGnoClient(gnoClient);
    return true;
  }

  async function initTokenMetainfos(accountId: string) {
    await tokenService.initAccountTokenMetainfos(accountId);
    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(accountId);
    setTokenMetainfos(tokenMetainfos);
    balanceService.setTokenMetainfos(tokenMetainfos);
  }


  async function initAppInfos() {
    try {
      const response = await tokenService.getAppInfos();
      const exploreSites = response
        .filter(site => site.display)
        .sort(site => site.order);
      setExploreSites([...exploreSites]);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletStatus,
        tokenMetainfos,
        networkMetainfos,
        initWallet
      }}>
      {children}
    </WalletContext.Provider>
  )
};
