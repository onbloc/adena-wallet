import { useEffect } from 'react';

import { RoutePath } from '@types';
import useAppNavigate from './use-app-navigate';
import useLink from './use-link';
import { useLoadAccounts } from './use-load-accounts';

export const useInitWallet = (): void => {
  const { navigate } = useAppNavigate();
  const { openRegister } = useLink();

  const { state } = useLoadAccounts();

  useEffect(() => {
    switch (state) {
      case 'NONE':
      case 'LOADING':
        break;
      case 'CREATE':
      case 'FAIL':
        openRegister();
        break;
      case 'LOGIN':
        navigate(RoutePath.Login);
        break;
      default:
        navigate(RoutePath.Wallet);
        break;
    }
  }, [state]);
}