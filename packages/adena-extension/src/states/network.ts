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
