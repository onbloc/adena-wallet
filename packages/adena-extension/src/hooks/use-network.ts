import { useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';

import { fetchHealth } from '@common/utils/fetch-utils';
import { EventMessage } from '@inject/message';
import { useAdenaContext, useWalletContext } from './use-context';
import { useEvent } from './use-event';

import CHAIN_DATA from '@resources/chains/chains.json';
import { NetworkState } from '@states';
import { useQuery } from '@tanstack/react-query';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';
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

interface NetworkResponse {
  networks: NetworkMetainfo[];
  atomoneNetworks: AtomoneNetworkMetainfo[];
  currentNetwork: NetworkMetainfo;
  currentAtomoneNetwork: AtomoneNetworkMetainfo | null;
  networkMode: NetworkMode;
  selectedProfileByChainGroup: Record<string, string>;
  modified: boolean;
  failedNetwork: boolean | null;
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
  deleteNetwork: (chainGroup: ChainGroup, networkId: string) => Promise<boolean>;
  setModified: (modified: boolean) => void;
}

const DEFAULT_NETWORK: NetworkMetainfo = CHAIN_DATA[0];

function isAtomoneNetwork(
  network: NetworkMetainfo | AtomoneNetworkMetainfo,
): network is AtomoneNetworkMetainfo {
  return (network as AtomoneNetworkMetainfo).chainGroup === 'atomone';
}

export const useNetwork = (): NetworkResponse => {
  const { dispatchEvent } = useEvent();
  const { changeNetwork: changeNetworkProvider } = useWalletContext();
  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);
  const [atomoneNetworks, setAtomoneNetworkMetainfos] = useRecoilState(
    NetworkState.atomoneNetworkMetainfos,
  );
  const { chainService, chainRegistry, tokenRegistry } = useAdenaContext();
  const [currentGnoNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAtomoneNetwork, setCurrentAtomoneNetwork] = useRecoilState(
    NetworkState.currentAtomoneNetwork,
  );
  const [mode, setNetworkMode] = useRecoilState(NetworkState.networkMode);
  const [selectedProfileByChainGroup, setSelectedProfileByChainGroup] = useRecoilState(
    NetworkState.selectedProfileByChainGroup,
  );
  const [modified, setModified] = useRecoilState(NetworkState.modified);

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

  const scannerParameters: { [key in string]: string } | null = useMemo(() => {
    if (!currentGnoNetwork) {
      return null;
    }
    const officialNetworkIds = CHAIN_DATA.filter((network) => !!network.apiUrl).map(
      (network) => network.networkId,
    );
    const isOfficialNetwork = officialNetworkIds.includes(currentGnoNetwork.networkId);
    const networkParameters: { [key in string]: string } = isOfficialNetwork
      ? {
          chainId: currentGnoNetwork.networkId,
        }
      : {
          type: 'custom',
          rpcUrl: currentGnoNetwork.rpcUrl || '',
          indexerUrl: currentGnoNetwork.indexerUrl || '',
        };
    return networkParameters;
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
  // the matching pair. Skip the chain group the user just switched — it's
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

  const changeNetwork = useCallback(
    async (id: string) => {
      const atomoneTarget = atomoneNetworks.find((network) => network.id === id);
      if (atomoneTarget) {
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
      await chainService.updateCurrentNetworkId(network.id);
      await changeNetworkOfProvider(network);
      setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: network.id }));
      await syncModeFromTarget(network.main === true, 'gno');
      return true;
    },
    [networkMetainfos, atomoneNetworks, changeNetworkOfProvider, syncModeFromTarget],
  );

  const changeNetworkMode = useCallback(
    async (nextMode: NetworkMode): Promise<void> => {
      setNetworkMode(nextMode);
      await chainService.updateNetworkMode(nextMode).catch(() => null);
      const wantsMainnet = nextMode === 'mainnet';

      const gnoTarget = networkMetainfos.find(
        (network) => !network.deleted && (network.main === true) === wantsMainnet,
      );
      if (gnoTarget && gnoTarget.id !== currentGnoNetwork?.id) {
        await chainService.updateCurrentNetworkId(gnoTarget.id);
        await changeNetworkOfProvider(gnoTarget);
        setSelectedProfileByChainGroup((prev) => ({ ...prev, gno: gnoTarget.id }));
      }

      const atomoneTarget = atomoneNetworks.find(
        (network) => !network.deleted && network.isMainnet === wantsMainnet,
      );
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
        }
        return true;
      }

      const changedNetworks = networkMetainfos.map((current) =>
        network.id === current.id ? network : current,
      );
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);

      if (network.id === currentGnoNetwork?.id) {
        changeNetworkOfProvider(network);
      }
      return true;
    },
    [
      currentGnoNetwork,
      currentAtomoneNetwork,
      networkMetainfos,
      atomoneNetworks,
      chainService,
    ],
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
          const fallback =
            changedNetworks.find((current) => !current.deleted && current.isMainnet) ?? null;
          setCurrentAtomoneNetwork(fallback);
          if (fallback) {
            setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: fallback.id }));
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
        changeNetworkOfProvider(DEFAULT_NETWORK);
      }
      return true;
    },
    [currentGnoNetwork, currentAtomoneNetwork, networkMetainfos, atomoneNetworks, chainService],
  );

  const dispatchChangedEvent = useCallback(
    (network: NetworkMetainfo) => {
      const message = EventMessage.event('changedNetwork', network.networkId);
      dispatchEvent(message);
    },
    [currentGnoNetwork],
  );

  return {
    currentNetwork: currentGnoNetwork || DEFAULT_NETWORK,
    currentAtomoneNetwork,
    networks: networkMetainfos,
    atomoneNetworks,
    networkMode: mode,
    selectedProfileByChainGroup,
    modified,
    failedNetwork,
    scannerParameters,
    getDefaultNetworkInfo,
    checkNetworkState,
    changeNetwork,
    changeNetworkMode,
    updateNetwork,
    addNetwork,
    deleteNetwork,
    setModified,
  };
};
