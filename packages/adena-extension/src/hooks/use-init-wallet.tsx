import { useEffect } from 'react';

import { RoutePath } from '@types';
import useAppNavigate from './use-app-navigate';
import useLink from './use-link';
import { useLoadAccounts } from './use-load-accounts';
import { useMatch } from 'react-router-dom';

export const useInitWallet = (): void => {
  const { navigate } = useAppNavigate();
  const { openRegister } = useLink();
  const isApproveLoginPage = useMatch('/approve/*');

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
        if (!isApproveLoginPage) {
          navigate(RoutePath.Login);
        }
        break;
      default:
        if (!isApproveLoginPage) {
          navigate(RoutePath.Wallet);
        }
        break;
    }
  }, [state]);
};
