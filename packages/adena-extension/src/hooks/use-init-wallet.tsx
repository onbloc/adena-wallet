import { useEffect } from 'react';

import { RoutePath } from '@types';
import useAppNavigate from './use-app-navigate';
import { useLoadAccounts } from './use-load-accounts';
import { useMatch } from 'react-router-dom';
import { useAddressBook } from './use-address-book';

export const useInitWallet = (): void => {
  const { navigate } = useAppNavigate();
  const isApproveLoginPage = useMatch('/approve/*');

  const { state } = useLoadAccounts();
  const { initAddressBook } = useAddressBook();

  useEffect(() => {
    switch (state) {
      case 'NONE':
      case 'LOADING':
      case 'CREATE':
      case 'FAIL':
        break;
      case 'LOGIN':
        if (!isApproveLoginPage) {
          navigate(RoutePath.Login);
        }
        break;
      default:
        initAddressBook();
        if (!isApproveLoginPage) {
          navigate(RoutePath.Wallet);
        }
        break;
    }
  }, [state]);
};
