import { atom } from 'recoil';

import { NetworkMetainfo } from '@types';

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

/**
 * Stores the selected NetworkProfile id per chainGroup.
 * Supports simultaneous multi-chain activation (one active network per chain).
 * Example: { gno: 'gnoland1', atomone: 'atomone-1' }
 */
export const selectedProfileByChainGroup = atom<Record<string, string>>({
  key: 'network/selectedProfileByChainGroup',
  default: { gno: 'gnoland1', atomone: 'atomone-1' },
});
