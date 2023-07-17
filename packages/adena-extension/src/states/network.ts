import { atom } from 'recoil';

export interface NetworkMetainfo {
  id: string;
  main: boolean;
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  token: {
    denom: string;
    unit: number;
    minimalDenom: string;
    minimalUnit: number;
  };
}

export const networkMetainfos = atom<NetworkMetainfo[]>({
  key: `network/networkMetainfos`,
  default: [],
});

export const currentNetwork = atom<NetworkMetainfo | null>({
  key: `network/current-network`,
  default: null,
});
