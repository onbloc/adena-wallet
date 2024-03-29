import { CommonState } from '@states';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export type UseScrollHistoryReturn = {
  scrollMove: () => void;
  saveScrollPosition: (scrollY?: number) => void;
};

const useScrollHistory = (): UseScrollHistoryReturn => {
  const location = useLocation();
  const [scrollPositions, setScrollPositions] = useRecoilState(CommonState.scrollPositions);
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();

  useLayoutEffect(() => {
    if (document.getElementsByTagName('body').length > 0) {
      setBodyElement(document.getElementsByTagName('body')[0]);
    }
  }, [document.getElementsByTagName('body')]);

  useLayoutEffect(() => {
    const restoreScrollPosition = (): void => {
      if (scrollPositions[location.key] !== undefined) {
        bodyElement?.scrollTo(0, scrollPositions[location.key] || 0);
      }
    };
    restoreScrollPosition();
  }, [location, bodyElement]);

  const scrollMove = useCallback(() => {
    if (scrollPositions[location.key] !== undefined && scrollPositions[location.key] > 0) {
      bodyElement?.scrollTo(0, scrollPositions[location.key]);
    } else {
      bodyElement?.scrollTo(0, 0);
    }
  }, [location, bodyElement]);

  const saveScrollPosition = useCallback(
    (scrollY?: number) => {
      setScrollPositions({
        ...scrollPositions,
        [location.key]: scrollY ?? bodyElement?.scrollTop ?? 0,
      });
    },
    [location, bodyElement],
  );

  return { scrollMove, saveScrollPosition };
};

export default useScrollHistory;
