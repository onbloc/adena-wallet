import { atom } from 'recoil';
import { GnoClient } from 'gno-client';

export const networks = atom<Array<InstanceType<typeof GnoClient>>>({
  key: `gno-client/networks`,
  default: [],
});

export const current = atom<InstanceType<typeof GnoClient> | null>({
  key: `gno-client/cuurent`,
  default: null,
});
