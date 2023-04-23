import { atom } from 'recoil';
import { GnoClient } from 'gno-client';

export const networks = atom<Array<GnoClient>>({
  key: `gno-client/networks`,
  default: [],
});

export const current = atom<GnoClient | null>({
  key: `gno-client/cuurent`,
  default: null,
});
