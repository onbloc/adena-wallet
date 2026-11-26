import { WindowSizeType } from '@types';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';

interface HistoryPosition {
  position: number;
}

export const fetchedHistoryBlockHeight = atom<number | null>(null);

export const historyPosition = atomWithReset<HistoryPosition>({
  position: 0,
});

export const scrollPositions = atom<{ [key in string]: number }>({});

export const historyState = atom<{ [key in string]: any }>({});

export const webHeaderIndicatorLength = atom<number>(0);

export const toastMessage = atom<string | null>(null);

export const windowSizeType = atom<WindowSizeType>('DEFAULT');

export const loadingImageUrls = atom<string[]>([]);

export const loadedImageUrls = atom<string[]>([]);
