import { useQuery } from '@tanstack/react-query';

import { ChromeSessionStorage } from '@common/storage/chrome-session-storage';
import { POPUP_SESSION_DATA_KEY } from '@common/constants/storage.constant';
import { RouteParams } from '@types';
import useAppNavigate from './use-app-navigate';

const useSessionParams = <RouteName extends keyof RouteParams>(): {
  isPopup: boolean | null;
  params: RouteParams[RouteName] | null;
  isLoading: boolean;
} => {
  const { params } = useAppNavigate<RouteName>();
  const { data: isPopup = null } = useQuery(
    ['popup/isPopup', chrome.windows],
    async () => {
      try {
        const isPopup = (await chrome.windows.getCurrent()).type === 'popup';
        return isPopup;
      } catch {
        return null;
      }
    },
    {},
  );

  const { data = null, isLoading } = useQuery(
    ['popup/popupState', params, isPopup],
    async () => {
      if (params) {
        return params;
      }
      if (!isPopup) {
        return null;
      }
      try {
        const sessionState = await new ChromeSessionStorage().get(POPUP_SESSION_DATA_KEY);
        return JSON.parse(sessionState) as RouteParams[RouteName];
      } catch {
        return null;
      }
    },
    {},
  );

  return {
    isPopup,
    params: data,
    isLoading,
  };
};

export default useSessionParams;
