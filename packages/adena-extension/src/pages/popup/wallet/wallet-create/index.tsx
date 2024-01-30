import React, { useEffect } from 'react';

import { RoutePath } from '@types';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';

export const WalletCreate = (): JSX.Element => {
  const { navigate } = useAppNavigate();
  const { openWebLink } = useLink();

  const { state } = useLoadAccounts();

  useEffect(() => {
    switch (state) {
      case 'NONE':
        break;
      case 'CREATE':
      case 'FAIL':
        openWebLink(RoutePath.Home);
        break;
      case 'LOADING':
        navigate(RoutePath.Wallet);
        break;
      case 'LOGIN':
        navigate(RoutePath.Login);
        break;
      default:
        break;
    }
  }, [state]);

  return <React.Fragment />
};