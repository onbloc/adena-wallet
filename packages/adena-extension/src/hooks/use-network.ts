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
  const { chainService } = useAdenaContext();
  const [currentNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAtomoneNetwork, setCurrentAtomoneNetwork] = useRecoilState(
    NetworkState.currentAtomoneNetwork,
  );
  const [mode, setNetworkMode] = useRecoilState(NetworkState.networkMode);
  const [selectedProfileByChainGroup, setSelectedProfileByChainGroup] = useRecoilState(
    NetworkState.selectedProfileByChainGroup,
  );
  const [modified, setModified] = useRecoilState(NetworkState.modified);

  const { data: failedNetwork = null, refetch: refetchNetworkState } = useQuery<boolean | null>(
    ['network/failedNetwork', currentNetwork],
    () => {
      if (!currentNetwork) {
        return null;
      }
      return fetchHealth(currentNetwork.rpcUrl).then(({ healthy }) => !healthy);
    },
    { keepPreviousData: true },
  );

  const scannerParameters: { [key in string]: string } | null = useMemo(() => {
    if (!currentNetwork) {
      return null;
    }
    const officialNetworkIds = CHAIN_DATA.filter((network) => !!network.apiUrl).map(
      (network) => network.networkId,
    );
    const isOfficialNetwork = officialNetworkIds.includes(currentNetwork.networkId);
    const networkParameters: { [key in string]: string } = isOfficialNetwork
      ? {
          chainId: currentNetwork.networkId,
        }
      : {
          type: 'custom',
          rpcUrl: currentNetwork.rpcUrl || '',
          indexerUrl: currentNetwork.indexerUrl || '',
        };
    return networkParameters;
  }, [currentNetwork]);

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

  const changeNetwork = useCallback(
    async (id: string) => {
      const atomoneTarget = atomoneNetworks.find((network) => network.id === id);
      if (atomoneTarget) {
        setCurrentAtomoneNetwork(atomoneTarget);
        setSelectedProfileByChainGroup((prev) => ({ ...prev, atomone: atomoneTarget.id }));
        await chainService.updateCurrentAtomoneNetworkId(atomoneTarget.id).catch(() => null);
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
      return true;
    },
    [networkMetainfos, atomoneNetworks, changeNetworkOfProvider],
  );

  const changeNetworkMode = useCallback(
    async (nextMode: NetworkMode): Promise<void> => {
      setNetworkMode(nextMode);
      await chainService.updateNetworkMode(nextMode).catch(() => null);
      const wantsMainnet = nextMode === 'mainnet';

      const gnoTarget = networkMetainfos.find(
        (network) => !network.deleted && (network.main === true) === wantsMainnet,
      );
      if (gnoTarget && gnoTarget.id !== currentNetwork?.id) {
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
      currentNetwork,
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

      if (network.id === currentNetwork?.id) {
        changeNetworkOfProvider(network);
      }
      return true;
    },
    [
      currentNetwork,
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

      if (networkId === currentNetwork?.id) {
        changeNetworkOfProvider(DEFAULT_NETWORK);
      }
      return true;
    },
    [currentNetwork, currentAtomoneNetwork, networkMetainfos, atomoneNetworks, chainService],
  );

  const dispatchChangedEvent = useCallback(
    (network: NetworkMetainfo) => {
      const message = EventMessage.event('changedNetwork', network.networkId);
      dispatchEvent(message);
    },
    [currentNetwork],
  );

  return {
    currentNetwork: currentNetwork || DEFAULT_NETWORK,
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
