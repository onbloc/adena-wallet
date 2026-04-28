import { AdenaWallet, Wallet } from 'adena-module';
import React, { createContext, useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';

import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import { useAdenaContext } from '@hooks/use-context';
import {
  atomoneNetworkToProfile,
  atomoneNetworkToTokenProfiles,
} from '@hooks/helpers/atomone-to-profile';
import { NetworkState, TokenState, WalletState } from '@states';
import { AtomoneNetworkMetainfo, NetworkMetainfo, StateType, TokenModel } from '@types';
import { GnoProvider } from '../gno/gno-provider';

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
  clearWallet: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextProps | null>(null);

export const WalletProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const { walletService, accountService, chainService, chainRegistry, tokenRegistry } =
    useAdenaContext();

  const [gnoProvider, setGnoProvider] = useState<GnoProvider>();

  const [wallet, setWallet] = useRecoilState(WalletState.wallet);

  const [walletStatus, setWalletStatus] = useRecoilState(WalletState.state);

  const [tokenMetainfos] = useRecoilState(TokenState.tokenMetainfos);

  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);

  const setCurrentNetwork = useSetRecoilState(NetworkState.currentNetwork);

  const setNetworkMode = useSetRecoilState(NetworkState.networkMode);

  const setCurrentAtomoneNetwork = useSetRecoilState(NetworkState.currentAtomoneNetwork);

  const setAtomoneNetworkMetainfos = useSetRecoilState(NetworkState.atomoneNetworkMetainfos);

  const setCurrentAccount = useSetRecoilState(WalletState.currentAccount);

  useEffect(() => {
    initWallet();
    initNetworkMetainfos();
    initAtomoneNetworkChain();
  }, []);

  // Pull every persisted AtomOne network (defaults + user-added customs) into
  // the recoil atom plus chainRegistry/tokenRegistry, then restore the
  // previously selected one. Without this, the atom keeps its hardcoded
  // default and the registries never learn about custom profiles, so
  // changeNetwork(custom) silently no-ops the cosmos balance fetch and
  // useTokenMetainfo cannot seed cosmos rows. Selection lookup runs against
  // the hydrated list (defaults + customs) — falling back to the static json
  // would erase a user-selected custom on every reload.
  async function initAtomoneNetworkChain(): Promise<void> {
    let networks: AtomoneNetworkMetainfo[];
    try {
      networks = await chainService.getAtomoneNetworks();
    } catch (e) {
      console.error(e);
      networks = (ATOMONE_CHAIN_DATA as unknown as AtomoneNetworkMetainfo[]).map((network) => ({
        ...network,
        deleted: false,
      }));
    }

    setAtomoneNetworkMetainfos(networks);
    for (const network of networks) {
      if (network.deleted) continue;
      chainRegistry.register(atomoneNetworkToProfile(network));
      for (const token of atomoneNetworkToTokenProfiles(network)) {
        tokenRegistry.register(token);
      }
    }

    const storedMode = await chainService.getNetworkMode().catch(() => null);
    const mode = storedMode === 'testnet' ? 'testnet' : 'mainnet';
    setNetworkMode(mode);

    const storedId = await chainService.getCurrentAtomoneNetworkId().catch(() => null);
    const wantsMainnet = mode === 'mainnet';
    const candidates = networks.filter((network) => !network.deleted);

    let selected: AtomoneNetworkMetainfo | null = null;
    if (storedId) {
      selected = candidates.find((network) => network.id === storedId) ?? null;
    }
    // Only fall back to a default mainnet/testnet entry when the stored
    // selection is missing or stale. A user-added custom network whose mode
    // matches the active mode must be kept as-is.
    if (!selected) {
      selected = candidates.find((network) => network.isMainnet === wantsMainnet) ?? null;
    } else if (selected.isMainnet !== wantsMainnet) {
      selected =
        candidates.find((network) => network.isMainnet === wantsMainnet) ?? selected;
    }
    if (selected) {
      setCurrentAtomoneNetwork(selected);
    }
  }

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
    await walletService.updateWallet(wallet);
    return true;
  }

  async function clearWallet(): Promise<void> {
    await setWallet(new AdenaWallet());

    await Promise.all([
      async (): Promise<void> => await setWallet(null),
      async (): Promise<void> => await setCurrentAccount(null),
    ]);
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
        clearWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
