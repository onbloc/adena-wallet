import { WindowSizeType } from '@types';
import { atom } from 'recoil';

interface HistoryPosition {
  position: number;
}

export const fetchedHistoryBlockHeight = atom<number | null>({
  key: 'common/fetched-history-block-height',
  default: null,
});

export const historyPosition = atom<HistoryPosition>({
  key: 'common/history-position',
  default: {
    position: 0,
  },
});

export const tokenDetailPosition = atom<HistoryPosition>({
  key: 'common/token-detail-position',
  default: {
    position: 0,
  },
});

export const scrollPositions = atom<{ [key in string]: number }>({
  key: 'common/scroll-positions',
  default: {},
});

export const historyState = atom<{ [key in string]: any }>({
  key: 'common/history-state',
  default: {},
});

export const webHeaderIndicatorLength = atom<number>({
  key: 'common/webHeaderIndicatorLength',
  default: 0,
});

export const toastMessage = atom<string | null>({
  key: 'common/toastMessage',
  default: null,
});

export const windowSizeType = atom<WindowSizeType>({
  key: 'common/windowSizeType',
  default: 'DEFAULT',
});

export const loadingImageUrls = atom<string[]>({
  key: 'common/loadingImageUrls',
  default: [],
});

export const loadedImageUrls = atom<string[]>({
  key: 'common/loadedImageUrls',
  default: [],
});
