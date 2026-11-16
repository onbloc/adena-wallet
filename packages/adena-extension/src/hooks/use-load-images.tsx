import { useAtom } from 'jotai';

import { CommonState } from '@states';
import { useMemo } from 'react';

export type UseLoadAccountsReturn = {
  isLoading: boolean;
  addLoadingImages: (imageUrls: string[]) => void;
  completeImageLoading: (imageUrl: string) => void;
  clear: () => void;
};

export const useLoadImages = (): UseLoadAccountsReturn => {
  const [loadingImageUrls, setLoadingImageUrls] = useAtom(CommonState.loadingImageUrls);
  const [loadedImageUrls, setLoadedImageUrls] = useAtom(CommonState.loadedImageUrls);

  const isLoading = useMemo(() => {
    if (loadingImageUrls.length === 0) {
      return false;
    }
    return loadedImageUrls.length < loadingImageUrls.length;
  }, [loadedImageUrls, loadingImageUrls]);

  const addLoadingImages = (imageUrls: string[]): void => {
    setLoadingImageUrls([...new Set(imageUrls.filter((url) => !!url))]);
  };

  const completeImageLoading = (imageUrl: string): void => {
    setLoadedImageUrls((prev) => [...new Set([...prev, imageUrl])]);
  };

  const clear = (): void => {
    setLoadingImageUrls([]);
    setLoadedImageUrls([]);
  };

  return { isLoading, addLoadingImages, completeImageLoading, clear };
};
