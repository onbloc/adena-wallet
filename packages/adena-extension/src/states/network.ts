import { NetworkMetainfo } from '@types';
import { atom } from 'recoil';

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
