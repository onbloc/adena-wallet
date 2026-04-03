import {
  RoutePath,
} from '@types';
import {
  useEffect,
} from 'react';
import {
  useMatch,
} from 'react-router';

import {
  useAddressBook,
} from './use-address-book';
import useAppNavigate from './use-app-navigate';
import {
  useLoadAccounts,
} from './use-load-accounts';
import {
  useWallet,
} from './use-wallet';

export const useInitWallet = (): void => {
  const {
    navigate,
  } = useAppNavigate();
  const isApproveLoginPage = useMatch('/approve/*');

  const {
    state,
  } = useLoadAccounts();
  const {
    initAddressBook,
  } = useAddressBook();
  const {
    lockedWallet,
  } = useWallet();

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
