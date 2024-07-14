import { CommonState } from '@states';
import { RefObject, useCallback, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export type UseScrollHistoryReturn = {
  scrollMove: () => void;
  saveScrollPosition: (scrollY?: number) => void;
};

const useScrollHistory = (ref?: RefObject<HTMLDivElement>): UseScrollHistoryReturn => {
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
        ref?.current
          ? ref.current.scrollTo(0, scrollPositions[location.key])
          : bodyElement?.scrollTo(0, scrollPositions[location.key]);
      }
    };
    restoreScrollPosition();
  }, [location, bodyElement, ref?.current]);

  const scrollMove = useCallback(() => {
    if (scrollPositions[location.key] !== undefined && scrollPositions[location.key] > 0) {
      ref?.current
        ? ref.current.scrollTo(0, scrollPositions[location.key])
        : bodyElement?.scrollTo(0, scrollPositions[location.key]);
    } else {
      ref?.current ? ref.current.scrollTo(0, 0) : bodyElement?.scrollTo(0, 0);
    }
  }, [location, bodyElement, ref?.current]);

  const saveScrollPosition = useCallback(
    (scrollY?: number) => {
      const scrollTop = scrollY ?? ref?.current?.scrollTop ?? bodyElement?.scrollTop ?? 0;
      setScrollPositions({
        ...scrollPositions,
        [location.key]: scrollTop,
      });
    },
    [location, bodyElement, ref?.current],
  );

  return { scrollMove, saveScrollPosition };
};

export default useScrollHistory;
