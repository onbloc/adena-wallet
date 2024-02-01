import React, { useEffect } from 'react';

import { RoutePath } from '@types';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';

export const WalletCreate = (): JSX.Element => {
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

  return <React.Fragment />
};