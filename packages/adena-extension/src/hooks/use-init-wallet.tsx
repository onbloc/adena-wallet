import { useEffect } from 'react';

import { RoutePath } from '@types';
import useAppNavigate from './use-app-navigate';
import { useLoadAccounts } from './use-load-accounts';
import { useMatch } from 'react-router-dom';
import { useAddressBook } from './use-address-book';
import { useWallet } from './use-wallet';

export const useInitWallet = (): void => {
  const { navigate } = useAppNavigate();
  const isApproveLoginPage = useMatch('/approve/*');

  const { state } = useLoadAccounts();
  const { initAddressBook } = useAddressBook();
  const { lockedWallet } = useWallet();

  useEffect(() => {
    switch (state) {
      case 'NONE':
      case 'LOADING':
      case 'CREATE':
      case 'FAIL':
      case 'LOGIN':
        break;
      default:
        initAddressBook();
        break;
    }
  }, [state]);

  useEffect(() => {
    if (!isApproveLoginPage && lockedWallet === true) {
      navigate(RoutePath.Login);
    }
  }, [lockedWallet]);
};
