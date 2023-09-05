import { useEffect } from "react";

export const usePreventHistoryBack = () => {
  useEffect(() => {
    const preventGoBack = () => {
      history.pushState(null, '', location.href);
    };
    preventGoBack();
    window.addEventListener('popstate', preventGoBack);
    return () => window.removeEventListener('popstate', preventGoBack);
  }, []);
};