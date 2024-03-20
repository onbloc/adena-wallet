import { WINDOW_EXPAND_SIZE } from '@common/constants/ui.constant';
import { CommonState } from '@states';
import { WindowSizeType } from '@types';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

export type UseWindowSizeReturn = {
  windowSizeType: WindowSizeType;
};

export const useWindowSize = (init = false): UseWindowSizeReturn => {
  const [windowSizeType, setWindowSizeType] = useRecoilState(CommonState.windowSizeType);

  useEffect(() => {
    if (!init) {
      return;
    }
    if (typeof window !== 'undefined') {
      const handleResize = (): void => {
        const windowSizeType = window.innerWidth > WINDOW_EXPAND_SIZE ? 'EXPAND' : 'DEFAULT';
        setWindowSizeType(windowSizeType);
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    } else {
      return () =>
        window.removeEventListener('resize', () => {
          return null;
        });
    }
  }, []);

  return { windowSizeType };
};
