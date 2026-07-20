import { Account, isSessionAccount } from 'adena-module';
import { useCallback, useMemo } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

import { getDappVisibleAddress } from '@common/utils/account-address';
import { fetchHealth } from '@common/utils/fetch-utils';
import {
  pickDefaultByMode,
  PRIMARY_MAINNET_ID,
  PRIMARY_TESTNET_ID,
} from '@common/utils/network-default';
import { createRegisterUrl } from '@common/utils/register-url';
import { EventMessage } from '@inject/message';
import { NetworkState, WalletState } from '@states';
import { useChain } from './use-chain';
import { useAdenaContext, useWalletContext } from './use-context';
import { useEvent } from './use-event';

import { toGnoNetworkProfile } from '@common/mapper/network-profile-mapper';
import { makeScannerParameters, toScannerNetworkInfo } from '@common/utils/scanner-utils';
import CHAIN_DATA from '@resources/chains/chains.json';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AtomoneNetworkMetainfo, NetworkMetainfo, RoutePath } from '@types';
import {
  atomoneNetworkToProfile,
  atomoneNetworkToTokenProfiles,
} from './helpers/atomone-to-profile';

export type ChainGroup = 'gno' | 'atomone';
export type NetworkMode = NetworkState.NetworkMode;

interface AddNetworkExtra {
  indexerUrl?: string;
  restUrl?: string;
}

export interface UnresponsiveNetworkInfo {
  id: string;
  name: string;
}

interface NetworkResponse {
  networks: NetworkMetainfo[];
  atomoneNetworks: AtomoneNetworkMetainfo[];
  currentNetwork: NetworkMetainfo;
  currentAtomoneNetwork: AtomoneNetworkMetainfo | null;
  networkMode: NetworkMode;
  selectedProfileByChainGroup: Record<string, string>;
  modified: boolean;
  failedNetwork: boolean | null;
  unresponsiveNetworks: UnresponsiveNetworkInfo[];
  scannerParameters: { [key in string]: string } | null;
  getDefaultNetworkInfo: (networkId: string) => NetworkMetainfo | null;
  checkNetworkState: () => Promise<void>;
  addNetwork: (
    chainGroup: ChainGroup,
    name: string,
    rpcUrl: string,
    chainId: string,
    extra: AddNetworkExtra,
  ) => Promise<void>;
  changeNetwork: (networkId: string) => Promise<boolean>;
  changeNetworkMode: (mode: NetworkMode) => Promise<void>;
  updateNetwork: (network: NetworkMetainfo | AtomoneNetworkMetainfo) => Promise<boolean>;
  resetNetworkToDefault: (chainGroup: ChainGroup, networkId: string) => Promise<boolean>;
  deleteNetwork: (chainGroup: ChainGroup, networkId: string) => Promise<boolean>;
  setModified: (modified: boolean) => void;
}

const DEFAULT_TESTNET_NETWORK: NetworkMetainfo =
  CHAIN_DATA.find((network) => network.id === PRIMARY_TESTNET_ID) ?? CHAIN_DATA[0];
const DEFAULT_MAINNET_NETWORK: NetworkMetainfo =
  CHAIN_DATA.find((network) => network.id === PRIMARY_MAINNET_ID) ?? CHAIN_DATA[0];

function isAtomoneNetwork(
  network: NetworkMetainfo | AtomoneNetworkMetainfo,
): network is AtomoneNetworkMetainfo {
  return (network as AtomoneNetworkMetainfo).chainGroup === 'atomone';
}

export const useNetwork = (): NetworkResponse => {
  const { dispatchEvent } = useEvent();
  const chain = useChain();
  const { changeNetwork: changeNetworkProvider, wallet } = useWalletContext();
  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);
  const [atomoneNetworks, setAtomoneNetworkMetainfos] = useRecoilState(
    NetworkState.atomoneNetworkMetainfos,
  );
  const {
    accountService,
    chainService,
    chainRegistry,
    tokenRegistry,
    sessionRepository,
  } = useAdenaContext();
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const [currentGnoNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAtomoneNetwork, setCurrentAtomoneNetwork] = useRecoilState(
    NetworkState.currentAtomoneNetwork,
  );
  const [mode, setNetworkMode] = useRecoilState(NetworkState.networkMode);
  const [selectedProfileByChainGroup, setSelectedProfileByChainGroup] = useRecoilState(
    NetworkState.selectedProfileByChainGroup,
  );
  const [modified, setModified] = useRecoilState(NetworkState.modified);

  const queryClient = useQueryClient();

  const { data: failedNetwork = null, refetch: refetchNetworkState } = useQuery<boolean | null>(
    ['network/failedNetwork', currentGnoNetwork],
    () => {
      if (!currentGnoNetwork) {
        return null;
      }
      return fetchHealth(currentGnoNetwork.rpcUrl).then(({ healthy }) => !healthy);
    },
    { keepPreviousData: true },
  );

  const cosmosUnresponsiveIds = useRecoilValue(NetworkState.cosmosUnresponsiveNetworkIds);

  const unresponsiveNetworks = useMemo<UnresponsiveNetworkInfo[]>(() => {
    const result: UnresponsiveNetworkInfo[] = [];
    if (failedNetwork === true && currentGnoNetwork) {
      result.push({
        id: currentGnoNetwork.id,
        name: currentGnoNetwork.chainName ?? currentGnoNetwork.networkName,
      });
    }
    for (const id of cosmosUnresponsiveIds) {
      const net = atomoneNetworks.find((current) => current.id === id);
      if (net) {
        result.push({ id, name: net.chainName ?? net.networkName });
      }
    }
    return result;
  }, [failedNetwork, currentGnoNetwork, cosmosUnresponsiveIds, atomoneNetworks]);

  const scannerParameters: { [key in string]: string } | null = useMemo(() => {
    if (!currentGnoNetwork) {
      return null;
    }
    return makeScannerParameters(toScannerNetworkInfo(currentGnoNetwork));
  }, [currentGnoNetwork]);

  const getDefaultNetworkInfo = useCallback((networkId: string) => {
    const network = CHAIN_DATA.find(
      (current) => current.default && current.networkId === networkId,
    );
    if (!network) {
      return null;
    }
    return network;
  }, []);

  const checkNetworkState = async (): Promise<void> => {
    await refetchNetworkState();
  };

  const addNetwork = useCallback(
    async (
      chainGroup: ChainGroup,
      name: string,
      rpcUrl: string,
      chainId: string,
      extra: AddNetworkExtra,
    ) => {
      setModified(true);
      const changedRpcUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
      const parsedName = name.trim();

      if (chainGroup === 'atomone') {
        const rawRestUrl = extra.restUrl ?? '';
        const changedRestUrl = rawRestUrl.endsWith('/')
          ? rawRestUrl.substring(0, rawRestUrl.length - 1)
          : rawRestUrl;
        await chainService.addAtomoneNetwork(parsedName, changedRpcUrl, changedRestUrl, chainId);
        const updatedAtomoneNetworks = await chainService.getAtomoneNetworks();
        setAtomoneNetworkMetainfos(updatedAtomoneNetworks);
        // Mirror the new networks into chainRegistry + tokenRegistry so
        // fetchCosmosTokenBalances picks them up and useTokenMetainfo can
        // seed cosmos rows. Without both registrations, custom networks live
        // only in the atom and balance/health checks skip them.
        for (const network of updatedAtomoneNetworks) {
          if (network.deleted) continue;
          chainRegistry.register(atomoneNetworkToProfile(network));
          for (const token of atomoneNetworkToTokenProfiles(network)) {
            tokenRegistry.register(token);
          }
        }
        return;
      }

      await chainService.addGnoNetwork(parsedName, changedRpcUrl, chainId, extra.indexerUrl ?? '');
      const updatedNetworks = await chainService.getNetworks();
      setNetworkMetainfos(updatedNetworks);
    },
    [networkMetainfos, atomoneNetworks, chainService],
  );

  const changeNetworkOfProvider = useCallback(
    async (network: NetworkMetainfo) => {
      const changedNetwork = await changeNetworkProvider(network);
      dispatchChangedEvent(changedNetwork);
    },
    [changeNetworkProvider],
  );

  // If the user picks a network whose mainnet/testnet stance differs from the
  // current networkMode, flip the mode and drag the *other* chain group onto
  // the matching pair. Skip the chain group the user just switched: it's
  // already correct. Keeps `changeNetwork` symmetric with `changeNetworkMode`.
  const syncModeFromTarget = useCallback(
    async (isMainnetTarget: boolean, justSwitched: ChainGroup): Promise<void> => {
      const nextMode: NetworkMode = isMainnetTarget ? 'mainnet' : 'testnet';
      if (nextMode === mode) {
        return;
      }
      setNetworkMode(nextMode);
      await chainService.updateNetworkMode(nextMode).catch(() => null);

      if (justSwitched !== 'gno') {
        const gnoPair = networkMetainfos.find(
          (network) => !network.deleted && (network.main === true) === isMainnetTarget,
        );
        if (gnoPair && gnoPair.id !== currentGnoNetwork?.id) {
          await chainService.updateCurrentNetworkId(gnoPair.id);
          await changeNetworkOfProvider(gnoPair);
          setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: gnoPair.id }));
        }
      }

      if (justSwitched !== 'atomone') {
        const atomonePair = atomoneNetworks.find(
          (network) => !network.deleted && network.isMainnet === isMainnetTarget,
        );
        if (atomonePair && atomonePair.id !== currentAtomoneNetwork?.id) {
          setCurrentAtomoneNetwork(atomonePair);
          setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: atomonePair.id }));
          await chainService.updateCurrentAtomoneNetworkId(atomonePair.id).catch(() => null);
        }
      }
    },
    [
      mode,
      networkMetainfos,
      atomoneNetworks,
      currentGnoNetwork,
      currentAtomoneNetwork,
      changeNetworkOfProvider,
    ],
  );

  const findSessionMasterAccount = useCallback(async (): Promise<Account | null> => {
    if (!wallet || !currentAccount || !isSessionAccount(currentAccount)) {
      return null;
    }

    const masterAddress = currentAccount.getMasterAddress();
    for (const account of wallet.accounts) {
      if (isSessionAccount(account)) {
        continue;
      }
      const accountAddress = await account.getAddress(chain.bech32Prefix).catch(() => null);
      if (accountAddress === masterAddress) {
        return account;
      }
    }

    return wallet.accounts.find((account) => !isSessionAccount(account)) ?? null;
  }, [wallet, currentAccount, chain.bech32Prefix]);

  const fallbackToMasterAccount = useCallback(async (): Promise<boolean> => {
    const nextAccount = await findSessionMasterAccount();
    if (!nextAccount) {
      window.open(createRegisterUrl(RoutePath.WebAccountAdd), '_blank');
      window.close();
      return false;
    }

    const prevAccount = currentAccount;
    await accountService.changeCurrentAccount(nextAccount);
    setCurrentAccount(nextAccount);

    const nextAddress = await getDappVisibleAddress(nextAccount, chain.bech32Prefix);
    const prevAddress = prevAccount
      ? await getDappVisibleAddress(prevAccount, chain.bech32Prefix)
      : null;
    if (prevAddress !== nextAddress) {
      dispatchEvent(EventMessage.event('changedAccount', nextAddress));
    }
    return true;
  }, [
    accountService,
    chain.bech32Prefix,
    currentAccount,
    dispatchEvent,
    findSessionMasterAccount,
    setCurrentAccount,
    wallet,
  ]);

  const ensureSessionCanSwitchNetwork = useCallback(
    async (targetChainId: string): Promise<boolean> => {
      if (!currentAccount || !isSessionAccount(currentAccount)) {
        return true;
      }
      const sessionAddr = await currentAccount.getAddress('g').catch(() => null);
      if (!sessionAddr) {
        return true;
      }
      const metadata = await sessionRepository.get(sessionAddr);
      if (!metadata || metadata.chainId === targetChainId) {
        return true;
      }
      return fallbackToMasterAccount();
    },
    [currentAccount, fallbackToMasterAccount, sessionRepository],
  );

  const changeNetwork = useCallback(
    async (id: string) => {
      const atomoneTarget = atomoneNetworks.find((network) => network.id === id);
      if (atomoneTarget) {
        if (!(await ensureSessionCanSwitchNetwork(atomoneTarget.chainId))) {
          return false;
        }
        setCurrentAtomoneNetwork(atomoneTarget);
        setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: atomoneTarget.id }));
        await chainService.updateCurrentAtomoneNetworkId(atomoneTarget.id).catch(() => null);
        await syncModeFromTarget(atomoneTarget.isMainnet, 'atomone');
        return true;
      }

      if (networkMetainfos.length === 0) {
        setCurrentNetwork(null);
        return false;
      }
      const network = networkMetainfos.find((network) => network.id === id) ?? networkMetainfos[0];
      if (!(await ensureSessionCanSwitchNetwork(network.chainId))) {
        return false;
      }
      await chainService.updateCurrentNetworkId(network.id);
      await changeNetworkOfProvider(network);
      setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: network.id }));
      await syncModeFromTarget(network.main === true, 'gno');
      return true;
    },
    [
      networkMetainfos,
      atomoneNetworks,
      changeNetworkOfProvider,
      syncModeFromTarget,
      ensureSessionCanSwitchNetwork,
    ],
  );

  const changeNetworkMode = useCallback(
    async (nextMode: NetworkMode): Promise<void> => {
      const wantsMainnet = nextMode === 'mainnet';
      const gnoTarget = pickDefaultByMode(networkMetainfos, nextMode);
      const atomoneTarget = atomoneNetworks.find(
        (network) => !network.deleted && network.isMainnet === wantsMainnet,
      );
      const targetChainId =
        gnoTarget && gnoTarget.id !== currentGnoNetwork?.id
          ? gnoTarget.chainId
          : atomoneTarget && atomoneTarget.id !== currentAtomoneNetwork?.id
          ? atomoneTarget.chainId
          : null;

      if (targetChainId && !(await ensureSessionCanSwitchNetwork(targetChainId))) {
        return;
      }

      setNetworkMode(nextMode);
      await chainService.updateNetworkMode(nextMode).catch(() => null);

      if (gnoTarget && gnoTarget.id !== currentGnoNetwork?.id) {
        await chainService.updateCurrentNetworkId(gnoTarget.id);
        await changeNetworkOfProvider(gnoTarget);
        setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: gnoTarget.id }));
      }

      if (atomoneTarget && atomoneTarget.id !== currentAtomoneNetwork?.id) {
        setCurrentAtomoneNetwork(atomoneTarget);
        setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: atomoneTarget.id }));
        await chainService.updateCurrentAtomoneNetworkId(atomoneTarget.id).catch(() => null);
      }
    },
    [
      networkMetainfos,
      atomoneNetworks,
      currentGnoNetwork,
      currentAtomoneNetwork,
      changeNetworkOfProvider,
      ensureSessionCanSwitchNetwork,
    ],
  );

  const updateNetwork = useCallback(
    async (network: NetworkMetainfo | AtomoneNetworkMetainfo) => {
      setModified(true);

      if (isAtomoneNetwork(network)) {
        const changedNetworks = atomoneNetworks.map((current) =>
          network.id === current.id ? network : current,
        );
        await chainService.updateAtomoneNetworks(changedNetworks);
        setAtomoneNetworkMetainfos(changedNetworks);
        // Re-register so changed name/RPC/REST land in chainRegistry +
        // tokenRegistry; register overwrites by id.
        if (!network.deleted) {
          chainRegistry.register(atomoneNetworkToProfile(network));
          for (const token of atomoneNetworkToTokenProfiles(network)) {
            tokenRegistry.register(token);
          }
        }
        if (network.id === currentAtomoneNetwork?.id) {
          setCurrentAtomoneNetwork(network);
          // Drop the stale cosmos balance cache so the new rpcUrl/restUrl is
          // hit immediately instead of waiting for the next refetch interval.
          queryClient.invalidateQueries({ queryKey: ['balances', 'cosmos'] });
        }
        return true;
      }

      const changedNetworks = networkMetainfos.map((current) =>
        network.id === current.id ? network : current,
      );
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);

      if (!network.deleted) {
        chainRegistry.register(toGnoNetworkProfile(network));
      }

      if (network.id === currentGnoNetwork?.id) {
        await changeNetworkOfProvider(network);
        // Drop the stale gno balance cache so the new rpcUrl/chainId is hit
        // immediately instead of waiting for the next refetch interval.
        queryClient.invalidateQueries({ queryKey: ['balances', 'gno'] });
      }
      return true;
    },
    [
      currentGnoNetwork,
      currentAtomoneNetwork,
      networkMetainfos,
      atomoneNetworks,
      chainService,
      chainRegistry,
      queryClient,
      changeNetworkOfProvider,
    ],
  );

  const resetNetworkToDefault = useCallback(
    async (chainGroup: ChainGroup, networkId: string): Promise<boolean> => {
      if (chainGroup === 'atomone') {
        const fetched = await chainService.fetchDefaultAtomoneNetworks().catch(() => []);
        const factory = fetched.find((network) => network.id === networkId);
        if (!factory) {
          console.warn('resetNetworkToDefault: no factory entry for atomone id', networkId);
          return false;
        }
        return updateNetwork(factory);
      }
      const fetched = await chainService.fetchDefaultNetworks().catch(() => []);
      const factory = fetched.find((network) => network.id === networkId);
      if (!factory) {
        console.warn('resetNetworkToDefault: no factory entry for gno id', networkId);
        return false;
      }
      return updateNetwork(factory);
    },
    [chainService, updateNetwork],
  );

  const deleteNetwork = useCallback(
    async (chainGroup: ChainGroup, networkId: string) => {
      if (chainGroup === 'atomone') {
        const network = atomoneNetworks.find((current) => current.id === networkId);
        if (!network) {
          return false;
        }
        setModified(true);
        const changedNetworks = network.default
          ? atomoneNetworks.map((current) =>
              current.id === network.id ? { ...current, deleted: true } : current,
            )
          : atomoneNetworks.filter((current) => current.id !== networkId);
        await chainService.updateAtomoneNetworks(changedNetworks);
        setAtomoneNetworkMetainfos(changedNetworks);

        if (networkId === currentAtomoneNetwork?.id) {
          const isMainnet = mode === 'mainnet';
          const fallback =
            changedNetworks.find(
              (current) => !current.deleted && current.isMainnet === isMainnet,
            ) ??
            changedNetworks.find((current) => !current.deleted) ??
            null;
          setCurrentAtomoneNetwork(fallback);
          if (fallback) {
            setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: fallback.id }));
            await chainService.updateCurrentAtomoneNetworkId(fallback.id).catch(() => null);
          }
        }
        return true;
      }

      const network = networkMetainfos.find((current) => current.id === networkId);
      if (!network) {
        return false;
      }
      setModified(true);
      const changedNetworks =
        network.default || network.id === 'teritori'
          ? networkMetainfos.map((current) =>
              current.id === network.id ? { ...current, deleted: true } : current,
            )
          : networkMetainfos.filter((current) => current.id !== networkId);
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);

      if (networkId === currentGnoNetwork?.id) {
        const isMainnet = mode === 'mainnet';
        const fallback =
          changedNetworks.find(
            (current) => !current.deleted && (current.main === true) === isMainnet,
          ) ??
          changedNetworks.find((current) => !current.deleted) ??
          null;
        if (fallback) {
          await chainService.updateCurrentNetworkId(fallback.id);
          await changeNetworkOfProvider(fallback);
          setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: fallback.id }));
        } else {
          setCurrentNetwork(null);
        }
      }
      return true;
    },
    [
      currentGnoNetwork,
      currentAtomoneNetwork,
      networkMetainfos,
      atomoneNetworks,
      chainService,
      mode,
      changeNetworkOfProvider,
      setCurrentNetwork,
      setCurrentAtomoneNetwork,
      setSelectedProfileByChainGroup,
    ],
  );

  const dispatchChangedEvent = useCallback(
    (network: NetworkMetainfo) => {
      const message = EventMessage.event('changedNetwork', network.networkId);
      dispatchEvent(message);
    },
    [currentGnoNetwork],
  );

  const fallbackNetwork: NetworkMetainfo =
    mode === 'testnet' ? DEFAULT_TESTNET_NETWORK : DEFAULT_MAINNET_NETWORK;

  return {
    currentNetwork: currentGnoNetwork || fallbackNetwork,
    currentAtomoneNetwork,
    networks: networkMetainfos,
    atomoneNetworks,
    networkMode: mode,
    selectedProfileByChainGroup,
    modified,
    failedNetwork,
    unresponsiveNetworks,
    scannerParameters,
    getDefaultNetworkInfo,
    checkNetworkState,
    changeNetwork,
    changeNetworkMode,
    updateNetwork,
    resetNetworkToDefault,
    addNetwork,
    deleteNetwork,
    setModified,
  };
};
