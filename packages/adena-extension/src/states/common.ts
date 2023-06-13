import { atom } from 'recoil';

interface HistoryPosition {
  position: number;
}

export const historyPosition = atom<HistoryPosition>({
  key: `common/history-position`,
  default: {
    position: 0,
  },
});

export const tokenDetailPosition = atom<HistoryPosition>({
  key: `common/token-detail-position`,
  default: {
    position: 0,
  },
});

export const failedNetwork = atom<{ [key in string]: boolean }>({
  key: `common/failed-network`,
  default: {},
});

export const scrollPositions = atom<{ [key in string]: number }>({
  key: `common/scroll-positions`,
  default: {},
});

export const historyState = atom<{ [key in string]: any }>({
  key: `common/history-state`,
  default: {},
});
