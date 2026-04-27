import { atom } from 'recoil';

import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';

export type NetworkMode = 'mainnet' | 'testnet';

const ATOMONE_DEFAULT_NETWORKS: AtomoneNetworkMetainfo[] = (
  ATOMONE_CHAIN_DATA as unknown as AtomoneNetworkMetainfo[]
).map((network) => ({ ...network, deleted: false }));

const DEFAULT_ATOMONE_MAINNET: AtomoneNetworkMetainfo | null =
  ATOMONE_DEFAULT_NETWORKS.find((network) => network.default && network.isMainnet) ?? null;

export const networkMetainfos = atom<NetworkMetainfo[]>({
  key: 'network/networkMetainfos',
  default: [],
});

export const currentNetwork = atom<NetworkMetainfo | null>({
  key: 'network/current-network',
  default: null,
});

export const modified = atom<boolean>({
  key: 'network/modified',
  default: false,
});

export const atomoneNetworkMetainfos = atom<AtomoneNetworkMetainfo[]>({
  key: 'network/atomoneNetworkMetainfos',
  default: ATOMONE_DEFAULT_NETWORKS,
});

export const currentAtomoneNetwork = atom<AtomoneNetworkMetainfo | null>({
  key: 'network/current-atomone-network',
  default: DEFAULT_ATOMONE_MAINNET,
});

export const networkMode = atom<NetworkMode>({
  key: 'network/network-mode',
  default: 'mainnet',
});

/**
 * Stores the selected NetworkProfile id per chainGroup.
 * Supports simultaneous multi-chain activation (one active network per chain).
 * Example: { gno: 'gnoland1', atomone: 'atomone-1' }
 */
export const selectedProfileByChainGroup = atom<Record<string, string>>({
  key: 'network/selectedProfileByChainGroup',
  default: { gno: 'gnoland1', atomone: 'atomone-1' },
});
