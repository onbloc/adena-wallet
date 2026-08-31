import { useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'adena-module';
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';

import {
  makeWalletExistsQueryKey,
  makeWalletLockedQueryKey,
} from '@common/constants/query-key.constant';
import { toGnoNetworkProfile } from '@common/mapper/network-profile-mapper';
import {
  normalizeStoredId,
  pickDefaultByMode,
  resolveNetworkMode,
} from '@common/utils/network-default';
import {
  atomoneNetworkToProfile,
  atomoneNetworkToTokenProfiles,
} from '@hooks/helpers/atomone-to-profile';
import { useAdenaContext } from '@hooks/use-context';
import { AtomoneNetworkMetainfoMapper } from '@repositories/common/mapper/atomone-network-metainfo-mapper';
import { NetworkState, TokenState, WalletState } from '@states';
import { AtomoneNetworkMetainfo, NetworkMetainfo, StateType, TokenModel } from '@types';
import { GnoProvider } from '../gno/gno-provider';

type NetworkMode = NetworkState.NetworkMode;

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
  const {
    walletService,
    accountService,
    chainService,
    chainRegistry,
    tokenRegistry,
  } = useAdenaContext();

  const queryClient = useQueryClient();

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
  }, []);

  // Pull every persisted AtomOne network (defaults + user-added customs) into
  // the recoil atom plus chainRegistry/tokenRegistry. Returns the hydrated
  // list so the caller can pick the active one once the mode is resolved.
  async function loadAtomoneNetworks(): Promise<AtomoneNetworkMetainfo[]> {
    let networks: AtomoneNetworkMetainfo[];
    try {
      networks = await chainService.getAtomoneNetworks();
    } catch (e) {
      console.error(e);
      networks = AtomoneNetworkMetainfoMapper.fromResource();
    }

    setAtomoneNetworkMetainfos(networks);
    for (const network of networks) {
      if (network.deleted) continue;
      chainRegistry.register(atomoneNetworkToProfile(network));
      for (const token of atomoneNetworkToTokenProfiles(network)) {
        tokenRegistry.register(token);
      }
    }
    return networks;
  }

  async function initCurrentAtomoneNetwork(
    networks: AtomoneNetworkMetainfo[],
    mode: NetworkMode,
  ): Promise<void> {
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
      selected = candidates.find((network) => network.isMainnet === wantsMainnet) ?? selected;
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

  // `useWallet` serves `existWallet` / `lockedWallet` from react-query, which
  // caches with the app-wide 10s staleTime and never refetches on window focus.
  // `initWallet` runs on every lock and unlock and has just read the
  // authoritative values from storage, so write them straight into the cache.
  //
  // Without this, unlocking after an auto-lock leaves `lockedWallet` stuck at
  // `true`: the auto-lock broadcast invalidated it to `true` and the unlock
  // path never re-reads it. Everything gated on `!lockedWallet` — the balance
  // pollers in use-token-balance / use-account-native-balance-map, and the
  // auto-lock activity ping in use-app — then stays disabled, so the main
  // screen keeps rendering balance skeletons forever.
  const syncWalletLockQueries = useCallback(
    (existWallet: boolean, isLocked: boolean): void => {
      queryClient.setQueryData(makeWalletExistsQueryKey(walletService.id), existWallet);
      queryClient.setQueryData(makeWalletLockedQueryKey(walletService.id), isLocked);
    },
    [queryClient, walletService],
  );

  async function initWallet(): Promise<boolean> {
    const existWallet = await walletService.existsWallet();
    if (!existWallet) {
      syncWalletLockQueries(false, true);
      setWallet(null);
      setWalletStatus('CREATE');
      return true;
    }

    const isLocked = await walletService.isLocked();
    syncWalletLockQueries(true, isLocked);
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

  // Drops the popup's references to the deserialized wallet and the selected
  // account. The previous implementation passed *functions* to `Promise.all`
  // instead of promises, so neither setter ever ran and a locked wallet kept
  // both in memory.
  async function clearWallet(): Promise<void> {
    setWallet(null);
    setCurrentAccount(null);
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

  // Orchestrates the full network bootstrap. Loads gno + AtomOne networks,
  // resolves the active mode using storage precedence (see resolveNetworkMode),
  // then picks the matching current network on each chain group. The order
  // matters: mode must be known before the current-network fallback can pick
  // a sensible default for fresh installs.
  async function initNetworkMetainfos(): Promise<boolean> {
    const networkMetainfos = await chainService.getNetworks();
    if (networkMetainfos.length === 0) {
      return false;
    }

    setNetworkMetainfos(networkMetainfos);
    chainService.updateNetworks(networkMetainfos);

    // Mirror every persisted gno network (defaults + user-added customs) into chainRegistry.
    for (const network of networkMetainfos) {
      if (network.deleted) continue;
      chainRegistry.register(toGnoNetworkProfile(network));
    }

    const atomoneNetworks = await loadAtomoneNetworks();

    const storedMode = await chainService.getNetworkMode().catch(() => null);
    const storedCurrentId = normalizeStoredId(
      await chainService.getCurrentNetworkId().catch(() => ''),
    );
    const mode = resolveNetworkMode(storedMode, storedCurrentId, networkMetainfos);
    setNetworkMode(mode);

    await initCurrentNetworkMetainfos(networkMetainfos, storedCurrentId, mode);
    await initCurrentAtomoneNetwork(atomoneNetworks, mode);

    return true;
  }

  async function initCurrentNetworkMetainfos(
    networkMetainfos: NetworkMetainfo[],
    storedCurrentId: string | null,
    mode: NetworkMode,
  ): Promise<boolean> {
    const storedNetwork = storedCurrentId
      ? networkMetainfos.find((network) => network.id === storedCurrentId)
      : undefined;
    const currentNetwork =
      storedNetwork ?? pickDefaultByMode(networkMetainfos, mode) ?? networkMetainfos[0];

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
