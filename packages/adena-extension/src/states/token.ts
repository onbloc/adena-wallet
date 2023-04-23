import { atom } from 'recoil';

export interface TokenMetainfo {
  main: boolean;
  tokenId: string;
  chainId: string;
  networkId: string;
  image?: string;
  pkgPath: string;
  symbol: string;
  type: 'NATIVE' | 'GRC20';
  name: string;
  decimals: number;
  denom: string;
  minimalDenom: string;
}

export const tokenMetainfos = atom<TokenMetainfo[]>({
  key: `token/tokenMetainfos`,
  default: [],
});
