import { atom } from 'recoil';

interface HistoryPosition {
  position: number;
}

export const historyPosition = atom<HistoryPosition>({
  key: `common/history-position`,
  default: {
    position: 0
  },
});

export const failedNetwork = atom<boolean | undefined>({
  key: `common/failed-network`,
  default: false
});

export const failedNetworkChainId = atom<string>({
  key: `common/failed-network-chainId`,
  default: ""
});
