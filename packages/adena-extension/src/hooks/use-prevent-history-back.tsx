import { useEffect } from 'react';

export const usePreventHistoryBack = (): void => {
  useEffect(() => {
    const preventGoBack = (): void => {
      history.pushState(null, '', location.href);
    };
    preventGoBack();
    window.addEventListener('popstate', preventGoBack);
    return () => window.removeEventListener('popstate', preventGoBack);
  }, []);
};
