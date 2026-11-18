import { AtomoneNetworkMetainfoMapper } from '@repositories/common/mapper/atomone-network-metainfo-mapper';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';

export type NetworkMode = 'mainnet' | 'testnet';

const ATOMONE_DEFAULT_NETWORKS: AtomoneNetworkMetainfo[]
  = AtomoneNetworkMetainfoMapper.fromResource();

export const networkMetainfos = atom<NetworkMetainfo[]>([]);

export const currentNetwork = atomWithReset<NetworkMetainfo | null>(null);

export const modified = atom<boolean>(false);

export const atomoneNetworkMetainfos = atom<AtomoneNetworkMetainfo[]>(ATOMONE_DEFAULT_NETWORKS);

// Stay null until WalletProvider hydrates this from storage; the provider
// resolves the mode and picks the matching AtomOne network. Defaulting to a
// mainnet entry caused a first-render flash for users who land on testnet.
export const currentAtomoneNetwork = atom<AtomoneNetworkMetainfo | null>(null);

export const networkMode = atom<NetworkMode>('mainnet');

/**
 * Stores the selected NetworkProfile id per chainGroup.
 * Supports simultaneous multi-chain activation (one active network per chain).
 * Example: { gno: 'gnoland-1', atomone: 'atomone-1' }
 */
export const selectedProfileByChainGroup = atom<Record<string, string>>({
  gno: 'gnoland-1',
  atomone: 'atomone-1',
});

/**
 * NetworkProfile ids of cosmos networks whose latest balance fetch failed.
 * Published from useTokenBalance and consumed by the header indicator so the
 * unresponsive-network popover can list every failing chain alongside the
 * gno failedNetwork signal.
 */
export const cosmosUnresponsiveNetworkIds = atom<string[]>([]);
